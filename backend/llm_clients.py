"""
LLM client helpers for OpenAI (GPT-5.1), Gemini (google-genai), and Tavily search.
Includes retry logic, cost tracking, deep research, and parallel execution.
"""

import os
import time
import random
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Tuple, TypeVar

from openai import OpenAI
from google import genai

from .config import OPENAI_MODEL, OPENAI_REASONING_EFFORT, GEMINI_MODEL

T = TypeVar("T")


@dataclass
class UsageStats:
    """Track token usage and estimated costs across all calls."""
    openai_input_tokens: int = 0
    openai_output_tokens: int = 0
    gemini_input_tokens: int = 0
    gemini_output_tokens: int = 0
    tavily_searches: int = 0
    openai_input_cost_per_1k: float = 0.01
    openai_output_cost_per_1k: float = 0.03
    gemini_input_cost_per_1k: float = 0.00025
    gemini_output_cost_per_1k: float = 0.0005
    tavily_cost_per_search: float = 0.01
    
    def add_openai(self, input_tokens: int, output_tokens: int) -> None:
        self.openai_input_tokens += input_tokens
        self.openai_output_tokens += output_tokens
    
    def add_gemini(self, input_tokens: int, output_tokens: int) -> None:
        self.gemini_input_tokens += input_tokens
        self.gemini_output_tokens += output_tokens
    
    def add_tavily_search(self) -> None:
        self.tavily_searches += 1
    
    @property
    def estimated_cost_usd(self) -> float:
        openai_cost = (
            (self.openai_input_tokens / 1000) * self.openai_input_cost_per_1k +
            (self.openai_output_tokens / 1000) * self.openai_output_cost_per_1k
        )
        gemini_cost = (
            (self.gemini_input_tokens / 1000) * self.gemini_input_cost_per_1k +
            (self.gemini_output_tokens / 1000) * self.gemini_output_cost_per_1k
        )
        tavily_cost = self.tavily_searches * self.tavily_cost_per_search
        return openai_cost + gemini_cost + tavily_cost
    
    def summary(self) -> str:
        return (
            f"OpenAI: {self.openai_input_tokens:,} in / {self.openai_output_tokens:,} out | "
            f"Gemini: {self.gemini_input_tokens:,} in / {self.gemini_output_tokens:,} out | "
            f"Tavily: {self.tavily_searches} searches | "
            f"Est. cost: ${self.estimated_cost_usd:.2f}"
        )


usage_stats = UsageStats()

def get_usage_stats() -> UsageStats:
    return usage_stats

def reset_usage_stats() -> None:
    global usage_stats
    usage_stats = UsageStats()


def run_parallel(tasks: List[Tuple[Callable[[], T], str]], max_workers: int = 4) -> Dict[str, T]:
    """Run multiple tasks in parallel using ThreadPoolExecutor."""
    results: Dict[str, T] = {}
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_label = {executor.submit(func): label for func, label in tasks}
        for future in as_completed(future_to_label):
            label = future_to_label[future]
            try:
                results[label] = future.result()
            except Exception as e:
                print(f"[Parallel] Task '{label}' failed: {e}")
                raise
    return results


def retry_with_backoff(func, max_retries: int = 5, base_delay: float = 1.0, max_delay: float = 60.0, jitter: bool = True) -> Any:
    """Retry a function with exponential backoff."""
    last_exception = None
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            last_exception = e
            error_str = str(e).lower()
            retryable = any(x in error_str for x in [
                "rate limit", "rate_limit", "429", "quota", "timeout", "timed out",
                "connection", "500", "502", "503", "504", "server error", "overloaded", "capacity"
            ])
            if not retryable or attempt == max_retries - 1:
                raise e
            delay = min(base_delay * (2 ** attempt), max_delay)
            if jitter:
                delay = delay * (0.5 + random.random())
            print(f"[Retry] Attempt {attempt + 1}/{max_retries} failed: {e}")
            print(f"[Retry] Waiting {delay:.1f}s before retry...")
            time.sleep(delay)
    raise last_exception


_openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
_gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))


def call_openai(system_prompt: str, user_prompt: str) -> str:
    def _call():
        resp = _openai_client.responses.create(
            model=OPENAI_MODEL, instructions=system_prompt, input=user_prompt,
            reasoning={"effort": OPENAI_REASONING_EFFORT}, max_output_tokens=4096,
        )
        if hasattr(resp, 'usage') and resp.usage:
            usage_stats.add_openai(resp.usage.input_tokens or 0, resp.usage.output_tokens or 0)
        return resp.output_text.strip()
    return retry_with_backoff(_call)


def call_gemini(system_prompt: str, user_prompt: str) -> str:
    def _call():
        contents = f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}\n"
        resp = _gemini_client.models.generate_content(model=GEMINI_MODEL, contents=contents)
        if hasattr(resp, 'usage_metadata') and resp.usage_metadata:
            usage_stats.add_gemini(
                resp.usage_metadata.prompt_token_count or 0,
                resp.usage_metadata.candidates_token_count or 0
            )
        return (resp.text or "").strip()
    return retry_with_backoff(_call)


def call_llm(backend: str, system_prompt: str, user_prompt: str) -> str:
    if backend == "openai":
        return call_openai(system_prompt, user_prompt)
    elif backend == "gemini":
        return call_gemini(system_prompt, user_prompt)
    else:
        raise ValueError(f"Unknown backend: {backend}")


def call_llm_json(backend: str, system_prompt: str, user_prompt: str, max_fix_attempts: int = 2) -> Dict[str, Any]:
    text = call_llm(backend, system_prompt, user_prompt)
    try:
        return _parse_json_response(text)
    except json.JSONDecodeError as e:
        pass
    for attempt in range(max_fix_attempts):
        print(f"[JSON Fix] Attempt {attempt + 1}/{max_fix_attempts}")
        fix_prompt = f"Your previous response was not valid JSON. Error: {e}. Return ONLY valid JSON."
        text = call_llm(backend, system_prompt, fix_prompt)
        try:
            return _parse_json_response(text)
        except json.JSONDecodeError:
            continue
    return {"raw_text": text, "parse_error": True}


def _parse_json_response(text: str) -> Dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    return json.loads(text)


_tavily_client = None

def _get_tavily_client():
    global _tavily_client
    if _tavily_client is None:
        try:
            from tavily import TavilyClient
            api_key = os.environ.get("TAVILY_API_KEY")
            if not api_key:
                print("[Tavily] Warning: TAVILY_API_KEY not set")
                return None
            _tavily_client = TavilyClient(api_key=api_key)
        except ImportError:
            print("[Tavily] Warning: tavily-python not installed")
            return None
    return _tavily_client


def search_web(query: str, max_results: int = 5, search_depth: str = "advanced", include_domains: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    client = _get_tavily_client()
    if client is None:
        return []
    def _search():
        kwargs = {"query": query, "max_results": max_results, "search_depth": search_depth}
        if include_domains:
            kwargs["include_domains"] = include_domains
        response = client.search(**kwargs)
        usage_stats.add_tavily_search()
        return [{"title": r.get("title", ""), "url": r.get("url", ""), "content": r.get("content", ""), "score": r.get("score", 0)} for r in response.get("results", [])]
    return retry_with_backoff(_search, max_retries=3)


def search_academic(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    return search_web(query, max_results=max_results, search_depth="advanced", include_domains=[
        "arxiv.org", "scholar.google.com", "semanticscholar.org", "pubmed.ncbi.nlm.nih.gov",
        "ieee.org", "acm.org", "nature.com", "sciencedirect.com",
    ])


def generate_search_queries(backend: str, component: str, context: str = "", num_queries: int = 5) -> List[str]:
    system_prompt = "Generate specific search queries for academic papers and implementations. Return ONLY a JSON array."
    user_prompt = f"Generate {num_queries} search queries for: {component}\n{f'Context: {context}' if context else ''}"
    text = call_llm(backend, system_prompt, user_prompt)
    try:
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        queries = json.loads(text)
        if isinstance(queries, list):
            return [str(q) for q in queries[:num_queries]]
    except:
        pass
    return [f"{component} implementation", f"{component} architecture", f"{component} recent papers 2024"][:num_queries]


def run_deep_search(component: str, queries: List[str], include_academic: bool = True) -> Dict[str, Any]:
    all_results, seen_urls = [], set()
    for query in queries:
        for r in search_web(query, max_results=3):
            if r["url"] not in seen_urls:
                seen_urls.add(r["url"])
                r["source_type"] = "web"
                all_results.append(r)
        if include_academic:
            for r in search_academic(query, max_results=2):
                if r["url"] not in seen_urls:
                    seen_urls.add(r["url"])
                    r["source_type"] = "academic"
                    all_results.append(r)
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    formatted_lines = ["=== SEARCH RESULTS ===\n"]
    for i, r in enumerate(all_results[:15], 1):
        formatted_lines.extend([f"[{i}] {r['title']}", f"    URL: {r['url']}", f"    Type: {r['source_type']}", f"    Snippet: {r['content'][:500]}...", ""])
    formatted_lines.append("=== END SEARCH RESULTS ===")
    return {"queries": queries, "results": all_results, "formatted_context": "\n".join(formatted_lines)}


def deep_research_round(backend: str, component: str, research_context: str = "", num_queries: int = 5) -> Tuple[str, Dict[str, Any]]:
    print(f"[Deep Research] Generating search queries for: {component}")
    queries = generate_search_queries(backend, component, research_context, num_queries)
    print(f"[Deep Research] Queries: {queries}")
    print(f"[Deep Research] Running searches...")
    search_data = run_deep_search(component, queries, include_academic=True)
    print(f"[Deep Research] Found {len(search_data['results'])} unique results")
    return search_data["formatted_context"], search_data
