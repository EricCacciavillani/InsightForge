"""
Neura Phase Lab – Full Multi-Agent Orchestrator (GPT-5.1 + Gemini)

Run via:
    python -m backend.orchestrator "Component 1" "Component 2" ...
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import sys

from .config import (
    COMPONENTS_ROOT, SYSTEM_ROOT, PROJECT_CONTEXT,
    DEEP_RESEARCH_ENABLED, DEEP_RESEARCH_QUERIES_PER_ROUND,
    DEEP_RESEARCH_ON_FIRST_ROUND_ONLY,
    PARALLEL_ENABLED, PARALLEL_MAX_WORKERS,
    MODEL_ROUTING, CHECKPOINT_ENABLED,
)
from .llm_clients import (
    call_llm, call_llm_json, deep_research_round,
    get_usage_stats, reset_usage_stats, run_parallel,
)
from .checkpoint import load_checkpoint, save_checkpoint, CheckpointManager
from .utils import slugify, safe_json_load, summarize_arbiter_feedback, notify_iphone


def get_backend(role: str, index: int = 0) -> str:
    value = MODEL_ROUTING.get(role, "openai")
    return value[index % len(value)] if isinstance(value, list) else value


# ---------------- PROMPTS ----------------

def decomposer_system() -> str:
    return PROJECT_CONTEXT + """

You are the COMPONENT DECOMPOSER. Break down a component into subcomponents (up to 3 levels deep).
Respond with STRICT JSON: {"root_component": "string", "nodes": [{"name": "...", "description": "...", "depth": 0, "parent_name": null, "should_run_pipeline": true}]}
"""

def research_agent_system() -> str:
    return PROJECT_CONTEXT + """

You are a deep research agent. Propose methods, self-critique, identify risks, provide math details.
Respond with STRICT JSON including: component, agent_name, round, high_level_summary, proposed_methods, self_critique, open_questions, risks_and_concerns.
"""

def debate_system() -> str:
    return PROJECT_CONTEXT + "\n\nCoordinate a technical debate between Agent A and Agent B. Output Markdown."

def reviewer_system() -> str:
    return PROJECT_CONTEXT + "\n\nYou are a reviewer. Output STRICT JSON: {reviewer_name, overall_assessment, is_method_reasonable, strengths, weaknesses_or_gaps, recommended_revisions}"

def paper_system() -> str:
    return PROJECT_CONTEXT + "\n\nWrite a mini paper v1 in Markdown with math, latency budgets, code sketches, risk register."

def paper_critic_system() -> str:
    return PROJECT_CONTEXT + "\n\nCritique the paper. Output STRICT JSON: {critic_name, overall_assessment, math_issues, suggested_edits}"

def paper_revision_system() -> str:
    return PROJECT_CONTEXT + "\n\nRevise the paper based on critic feedback. Output Markdown."

def verification_system() -> str:
    return PROJECT_CONTEXT + "\n\nVerify paper coverage. Output STRICT JSON: {agent_name, paper_coverage_ok, missing_elements}"

def meta_debate_system() -> str:
    return PROJECT_CONTEXT + "\n\nCoordinate meta-debate, rank POC candidates, choose POC Champion. Output Markdown."

def meta_reviewer_system() -> str:
    return PROJECT_CONTEXT + "\n\nMeta review. Output STRICT JSON: {reviewer_name, overall_assessment, poc_choice_reasonable}"

def meta_paper_system() -> str:
    return PROJECT_CONTEXT + "\n\nWrite mini paper v2 with POC Champion and experiment plan. Output Markdown."

def final_arbiter_system() -> str:
    return PROJECT_CONTEXT + "\n\nFinal arbiter decision. Output STRICT JSON: {final_judgement, chosen_poc_champion, reasoning_summary}"

def arch_training_system() -> str:
    return PROJECT_CONTEXT + "\n\nDesign architecture and training. Output STRICT JSON: {model_architecture, training_setup, evaluation_plan}"

def system_architect_system() -> str:
    return PROJECT_CONTEXT + "\n\nSystem architect review. Output STRICT JSON: {global_summary, glaring_problems, suggested_architecture_changes}"

def system_critic_system() -> str:
    return PROJECT_CONTEXT + "\n\nCritique system architect. Output STRICT JSON: {overall_assessment, critical_issues}"

def system_feasibility_system() -> str:
    return PROJECT_CONTEXT + "\n\nSystem feasibility. Output STRICT JSON: {global_judgement, reasoning_summary, if_feasible_poc_plan}"


# -------------- COMPONENT-LEVEL CALLERS --------------

def run_decomposer(backend: str, component: str) -> Dict[str, Any]:
    text = call_llm(backend, decomposer_system(), f'Decompose: "{component}"')
    data = safe_json_load(text)
    data.setdefault("root_component", component)
    if "nodes" not in data or not data["nodes"]:
        data["nodes"] = [{"name": component, "description": "Root component", "depth": 0, "parent_name": None, "should_run_pipeline": True}]
    return data


def run_research_round(backend: str, agent_name: str, component: str, round_num: int,
                       previous_json: Optional[Dict], arbiter_feedback: Optional[str],
                       child_context: Optional[str], search_context: Optional[str] = None) -> Dict[str, Any]:
    parts = [f'Component: "{component}"\nAgent: {agent_name}\nRound {round_num}']
    if search_context:
        parts.append(f"SOURCES:\n{search_context}")
    if arbiter_feedback:
        parts.append(f"ARBITER FEEDBACK:\n{arbiter_feedback}")
    if child_context:
        parts.append(f"CHILD CONTEXT:\n{child_context}")
    if previous_json:
        parts.append(f"Previous:\n{json.dumps(previous_json, indent=2)}")
    text = call_llm(backend, research_agent_system(), "\n\n".join(parts))
    data = safe_json_load(text)
    data.setdefault("component", component)
    data.setdefault("agent_name", agent_name)
    data.setdefault("round", round_num)
    return data


def run_debate(backend: str, component: str, agentA: Dict, agentB: Dict) -> str:
    return call_llm(backend, debate_system(), f'Component: "{component}"\n\nAgent A:\n{json.dumps(agentA, indent=2)}\n\nAgent B:\n{json.dumps(agentB, indent=2)}')


def run_reviewer(backend: str, label: str, component: str, agentA: Dict, agentB: Dict, debate: str) -> Dict[str, Any]:
    text = call_llm(backend, reviewer_system(), f'Component: "{component}"\nYou are {label}.\n\nAgent A:\n{json.dumps(agentA, indent=2)}\n\nAgent B:\n{json.dumps(agentB, indent=2)}\n\nDebate:\n{debate}')
    data = safe_json_load(text)
    data.setdefault("reviewer_name", label)
    return data


def run_paper_v1(backend: str, component: str, debate: str, agentA: Dict, agentB: Dict, reviews: List[Dict]) -> str:
    return call_llm(backend, paper_system(), f'Component: "{component}"\n\nDebate:\n{debate}\n\nAgent A:\n{json.dumps(agentA, indent=2)}\n\nAgent B:\n{json.dumps(agentB, indent=2)}\n\nReviews:\n{json.dumps(reviews, indent=2)}')


def run_paper_critic(backend: str, label: str, component: str, paper: str, agentA: Dict, agentB: Dict, reviews: List[Dict]) -> Dict[str, Any]:
    text = call_llm(backend, paper_critic_system(), f'Component: "{component}"\nYou are {label}.\n\nPaper:\n{paper}\n\nAgent A:\n{json.dumps(agentA, indent=2)}\n\nAgent B:\n{json.dumps(agentB, indent=2)}')
    data = safe_json_load(text)
    data.setdefault("critic_name", label)
    return data


def run_paper_revision(backend: str, component: str, paper_v1: str, critics: List[Dict]) -> str:
    return call_llm(backend, paper_revision_system(), f'Component: "{component}"\n\nPaper v1:\n{paper_v1}\n\nCritics:\n{json.dumps(critics, indent=2)}')


def run_verification(backend: str, agent_name: str, agent_json: Dict, paper: str) -> Dict[str, Any]:
    text = call_llm(backend, verification_system(), f'You are {agent_name}.\n\nYour JSON:\n{json.dumps(agent_json, indent=2)}\n\nPaper:\n{paper}')
    data = safe_json_load(text)
    data.setdefault("agent_name", agent_name)
    return data


def run_meta_debate(backend: str, component: str, agentA: Dict, agentB: Dict, debate: str, reviews: List[Dict], paper: str, arbiter_feedback: Optional[str]) -> str:
    extra = f"\n\nARBITER FEEDBACK:\n{arbiter_feedback}" if arbiter_feedback else ""
    return call_llm(backend, meta_debate_system(), f'Component: "{component}"\n\nAgent A:\n{json.dumps(agentA, indent=2)}\n\nAgent B:\n{json.dumps(agentB, indent=2)}\n\nDebate:\n{debate}\n\nReviews:\n{json.dumps(reviews, indent=2)}\n\nPaper v1b:\n{paper}{extra}')


def run_meta_reviewer(backend: str, label: str, component: str, agentA: Dict, agentB: Dict, debate: str, reviews: List[Dict], paper: str, meta_debate: str) -> Dict[str, Any]:
    text = call_llm(backend, meta_reviewer_system(), f'Component: "{component}"\nYou are {label}.\n\nMeta-debate:\n{meta_debate}')
    data = safe_json_load(text)
    data.setdefault("reviewer_name", label)
    return data


def run_meta_paper(backend: str, component: str, agentA: Dict, agentB: Dict, debate: str, reviews: List[Dict], paper_v1b: str, meta_debate: str, meta_reviews: List[Dict]) -> str:
    return call_llm(backend, meta_paper_system(), f'Component: "{component}"\n\nMeta-debate:\n{meta_debate}\n\nMeta reviews:\n{json.dumps(meta_reviews, indent=2)}')


def run_final_arbiter(backend: str, component: str, agentA: Dict, agentB: Dict, debate: str, reviews: List[Dict], paper_v1b: str, meta_debate: str, meta_reviews: List[Dict], paper_v2: str) -> Dict[str, Any]:
    text = call_llm(backend, final_arbiter_system(), f'Component: "{component}"\n\nPaper v2:\n{paper_v2}\n\nMeta reviews:\n{json.dumps(meta_reviews, indent=2)}')
    return safe_json_load(text)


def run_arch_and_training_spec(backend: str, component: str, poc_name: str, agentA: Dict, agentB: Dict, paper_v2: str, arbiter: Dict) -> Dict[str, Any]:
    text = call_llm(backend, arch_training_system(), f'Component: "{component}"\nPOC Champion: "{poc_name}"\n\nPaper v2:\n{paper_v2}\n\nArbiter:\n{json.dumps(arbiter, indent=2)}')
    data = safe_json_load(text)
    data.setdefault("component", component)
    data.setdefault("poc_champion_name", poc_name)
    return data


# -------------- PARALLEL HELPERS --------------

def _run_agent_rounds(backend: str, agent_name: str, node_name: str, arbiter_feedback: Optional[str], child_context: str, search_context: Optional[str]) -> List[Dict]:
    r1 = run_research_round(backend, agent_name, node_name, 1, None, arbiter_feedback, child_context, search_context)
    r2 = run_research_round(backend, agent_name, node_name, 2, r1, arbiter_feedback, child_context, None if DEEP_RESEARCH_ON_FIRST_ROUND_ONLY else search_context)
    r3 = run_research_round(backend, agent_name, node_name, 3, r2, arbiter_feedback, child_context, None if DEEP_RESEARCH_ON_FIRST_ROUND_ONLY else search_context)
    return [r1, r2, r3]


def _run_research_parallel(node_name: str, arbiter_feedback: Optional[str], child_context: str, search_context: Optional[str]) -> tuple:
    results = run_parallel([
        (lambda: _run_agent_rounds(get_backend("agent_a"), "Agent A", node_name, arbiter_feedback, child_context, search_context), "agentA"),
        (lambda: _run_agent_rounds(get_backend("agent_b"), "Agent B", node_name, arbiter_feedback, child_context, search_context), "agentB"),
    ], max_workers=2)
    return results["agentA"], results["agentB"]


def _run_reviewers_parallel(node_name: str, agentA: Dict, agentB: Dict, debate: str) -> List[Dict]:
    tasks = [(lambda b=get_backend("reviewers", i), l=f"Reviewer {i+1}": run_reviewer(b, l, node_name, agentA, agentB, debate), f"r{i}") for i in range(3)]
    results = run_parallel(tasks, max_workers=PARALLEL_MAX_WORKERS)
    return [results[f"r{i}"] for i in range(3)]


def _run_critics_parallel(node_name: str, paper: str, agentA: Dict, agentB: Dict, reviews: List[Dict]) -> List[Dict]:
    tasks = [(lambda b=get_backend("paper_critics", i), l=f"Critic {i+1}": run_paper_critic(b, l, node_name, paper, agentA, agentB, reviews), f"c{i}") for i in range(2)]
    results = run_parallel(tasks, max_workers=PARALLEL_MAX_WORKERS)
    return [results[f"c{i}"] for i in range(2)]


def _run_meta_reviewers_parallel(node_name: str, agentA: Dict, agentB: Dict, debate: str, reviews: List[Dict], paper: str, meta_debate: str) -> List[Dict]:
    tasks = [(lambda b=get_backend("meta_reviewers", i), l=f"Meta Reviewer {i+1}": run_meta_reviewer(b, l, node_name, agentA, agentB, debate, reviews, paper, meta_debate), f"m{i}") for i in range(3)]
    results = run_parallel(tasks, max_workers=PARALLEL_MAX_WORKERS)
    return [results[f"m{i}"] for i in range(3)]


def build_child_summary(node_result: Dict) -> Dict:
    cycles = node_result.get("cycles", [])
    if not cycles:
        return {"node_name": node_result.get("node_name"), "has_cycles": False}
    last = cycles[-1]
    return {
        "node_name": node_result.get("node_name"),
        "node_depth": node_result.get("node_depth"),
        "final_judgement": last.get("final_arbiter", {}).get("final_judgement"),
        "poc_champion_name": last.get("final_arbiter", {}).get("chosen_poc_champion"),
        "has_cycles": True,
    }


# -------------- MAIN PIPELINE --------------

def run_component_node_pipeline(root_component: str, node_meta: Dict, node_dir: Path, max_cycles: int, child_summaries: List[Dict]) -> Dict:
    node_name = node_meta.get("name", root_component)
    node_depth = node_meta.get("depth", 0)
    node_slug = slugify(f"d{node_depth}_{node_name}")
    
    print(f"=== Node: {node_name} (depth {node_depth}) ===")
    node_dir.mkdir(parents=True, exist_ok=True)
    
    child_context = json.dumps(child_summaries, indent=2) if child_summaries else "[]"
    checkpoint = load_checkpoint(node_dir) if CHECKPOINT_ENABLED else None
    arbiter_feedback = None
    cycles = []
    
    for cycle in range(1, max_cycles + 1):
        print(f"\n--- Cycle {cycle}/{max_cycles} ---")
        cycle_dir = node_dir / f"cycle_{cycle}"
        cycle_dir.mkdir(parents=True, exist_ok=True)
        cycle_checkpoint = load_checkpoint(cycle_dir) if CHECKPOINT_ENABLED else None
        arbiter_summary = summarize_arbiter_feedback(arbiter_feedback)
        
        # Deep research
        search_context, search_data = None, None
        if DEEP_RESEARCH_ENABLED:
            with CheckpointManager(cycle_dir, "deep_research", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
                if cm.should_skip:
                    search_data = cm.cached_data
                    search_context = search_data.get("formatted_context") if search_data else None
                else:
                    print("[Deep Research] Gathering sources...")
                    search_context, search_data = deep_research_round(get_backend("search_queries"), node_name, arbiter_summary or "", DEEP_RESEARCH_QUERIES_PER_ROUND)
                    if search_data:
                        search_data["formatted_context"] = search_context
                        cm.save(search_data)
        
        # Research rounds
        with CheckpointManager(cycle_dir, "research", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                data = cm.cached_data
                agentA_rounds, agentB_rounds = data["agentA_rounds"], data["agentB_rounds"]
            else:
                print("[Stage 1] Research rounds" + (" (parallel)" if PARALLEL_ENABLED else ""))
                if PARALLEL_ENABLED:
                    agentA_rounds, agentB_rounds = _run_research_parallel(node_name, arbiter_summary, child_context, search_context)
                else:
                    agentA_rounds = _run_agent_rounds(get_backend("agent_a"), "Agent A", node_name, arbiter_summary, child_context, search_context)
                    agentB_rounds = _run_agent_rounds(get_backend("agent_b"), "Agent B", node_name, arbiter_summary, child_context, search_context)
                cm.save({"agentA_rounds": agentA_rounds, "agentB_rounds": agentB_rounds})
        agentA_final, agentB_final = agentA_rounds[-1], agentB_rounds[-1]
        
        # Debate
        with CheckpointManager(cycle_dir, "debate", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                debate_md = cm.cached_data.get("debate", "")
            else:
                print(f"[Stage 1] Debate ({get_backend('debate')})")
                debate_md = run_debate(get_backend("debate"), node_name, agentA_final, agentB_final)
                cm.save({"debate": debate_md})
        
        # Reviewers
        with CheckpointManager(cycle_dir, "reviewers", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                reviewers = cm.cached_data.get("reviewers", [])
            else:
                print("[Stage 1] Reviewers" + (" (parallel)" if PARALLEL_ENABLED else ""))
                reviewers = _run_reviewers_parallel(node_name, agentA_final, agentB_final, debate_md) if PARALLEL_ENABLED else [run_reviewer(get_backend("reviewers", i), f"Reviewer {i+1}", node_name, agentA_final, agentB_final, debate_md) for i in range(3)]
                cm.save({"reviewers": reviewers})
        
        # Paper v1
        with CheckpointManager(cycle_dir, "paper_v1", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                paper_v1 = cm.cached_data.get("paper", "")
            else:
                print(f"[Stage 1] Paper v1 ({get_backend('paper_v1')})")
                paper_v1 = run_paper_v1(get_backend("paper_v1"), node_name, debate_md, agentA_final, agentB_final, reviewers)
                cm.save({"paper": paper_v1})
        
        # Critics
        with CheckpointManager(cycle_dir, "critics", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                critics = cm.cached_data.get("critics", [])
            else:
                print("[Stage 1] Critics" + (" (parallel)" if PARALLEL_ENABLED else ""))
                critics = _run_critics_parallel(node_name, paper_v1, agentA_final, agentB_final, reviewers) if PARALLEL_ENABLED else [run_paper_critic(get_backend("paper_critics", i), f"Critic {i+1}", node_name, paper_v1, agentA_final, agentB_final, reviewers) for i in range(2)]
                cm.save({"critics": critics})
        
        # Paper v1b
        with CheckpointManager(cycle_dir, "paper_v1b", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                paper_v1b = cm.cached_data.get("paper", "")
            else:
                print(f"[Stage 1] Paper v1b ({get_backend('paper_revision')})")
                paper_v1b = run_paper_revision(get_backend("paper_revision"), node_name, paper_v1, critics)
                cm.save({"paper": paper_v1b})
        
        # Verification
        with CheckpointManager(cycle_dir, "verification", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                verifyA, verifyB = cm.cached_data.get("verifyA", {}), cm.cached_data.get("verifyB", {})
            else:
                print("[Stage 1] Verification")
                if PARALLEL_ENABLED:
                    v = run_parallel([(lambda: run_verification(get_backend("verification_a"), "Agent A", agentA_final, paper_v1b), "A"), (lambda: run_verification(get_backend("verification_b"), "Agent B", agentB_final, paper_v1b), "B")], 2)
                    verifyA, verifyB = v["A"], v["B"]
                else:
                    verifyA = run_verification(get_backend("verification_a"), "Agent A", agentA_final, paper_v1b)
                    verifyB = run_verification(get_backend("verification_b"), "Agent B", agentB_final, paper_v1b)
                cm.save({"verifyA": verifyA, "verifyB": verifyB})
        
        # Meta-debate
        with CheckpointManager(cycle_dir, "meta_debate", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                meta_debate_md = cm.cached_data.get("meta_debate", "")
            else:
                print(f"[Stage 2] Meta-debate ({get_backend('meta_debate')})")
                meta_debate_md = run_meta_debate(get_backend("meta_debate"), node_name, agentA_final, agentB_final, debate_md, reviewers, paper_v1b, arbiter_summary)
                cm.save({"meta_debate": meta_debate_md})
        
        # Meta reviewers
        with CheckpointManager(cycle_dir, "meta_reviewers", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                meta_reviewers = cm.cached_data.get("meta_reviewers", [])
            else:
                print("[Stage 2] Meta reviewers" + (" (parallel)" if PARALLEL_ENABLED else ""))
                meta_reviewers = _run_meta_reviewers_parallel(node_name, agentA_final, agentB_final, debate_md, reviewers, paper_v1b, meta_debate_md) if PARALLEL_ENABLED else [run_meta_reviewer(get_backend("meta_reviewers", i), f"Meta Reviewer {i+1}", node_name, agentA_final, agentB_final, debate_md, reviewers, paper_v1b, meta_debate_md) for i in range(3)]
                cm.save({"meta_reviewers": meta_reviewers})
        
        # Paper v2
        with CheckpointManager(cycle_dir, "paper_v2", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                paper_v2 = cm.cached_data.get("paper", "")
            else:
                print(f"[Stage 2] Paper v2 ({get_backend('paper_v2')})")
                paper_v2 = run_meta_paper(get_backend("paper_v2"), node_name, agentA_final, agentB_final, debate_md, reviewers, paper_v1b, meta_debate_md, meta_reviewers)
                cm.save({"paper": paper_v2})
        
        # Final arbiter
        with CheckpointManager(cycle_dir, "final_arbiter", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
            if cm.should_skip:
                final_arbiter = cm.cached_data.get("arbiter", {})
            else:
                print(f"[Final] Arbiter ({get_backend('final_arbiter')})")
                final_arbiter = run_final_arbiter(get_backend("final_arbiter"), node_name, agentA_final, agentB_final, debate_md, reviewers, paper_v1b, meta_debate_md, meta_reviewers, paper_v2)
                cm.save({"arbiter": final_arbiter})
        
        judgement = final_arbiter.get("final_judgement")
        poc_name = final_arbiter.get("chosen_poc_champion") or "UNKNOWN"
        print(f"[Final] Judgement: {judgement}, POC: {poc_name}")
        
        # Arch/training spec if accepted
        arch_spec = None
        if judgement == "accept_for_implementation":
            with CheckpointManager(cycle_dir, "arch_training", cycle_checkpoint, CHECKPOINT_ENABLED) as cm:
                if cm.should_skip:
                    arch_spec = cm.cached_data.get("arch_spec")
                else:
                    print(f"[Stage 3] Architecture & training ({get_backend('arch_training')})")
                    arch_spec = run_arch_and_training_spec(get_backend("arch_training"), node_name, poc_name, agentA_final, agentB_final, paper_v2, final_arbiter)
                    cm.save({"arch_spec": arch_spec})
            print("✅ Accepted!")
        else:
            print("⚠️ Needs more research")
        
        cycle_out = {
            "cycle_index": cycle,
            "stage1": {"agentA_rounds": agentA_rounds, "agentB_rounds": agentB_rounds, "debate": debate_md, "reviewers": reviewers, "paper_v1": paper_v1, "paper_v1b": paper_v1b, "critics": critics},
            "stage2": {"meta_debate": meta_debate_md, "meta_reviewers": meta_reviewers, "paper_v2": paper_v2},
            "final_arbiter": final_arbiter,
        }
        if arch_spec:
            cycle_out["arch_training"] = arch_spec
        
        (cycle_dir / "cycle_result.json").write_text(json.dumps(cycle_out, indent=2), encoding="utf-8")
        cycles.append(cycle_out)
        
        if judgement == "accept_for_implementation":
            break
        arbiter_feedback = final_arbiter
    
    result = {"root_component": root_component, "node_name": node_name, "node_depth": node_depth, "node_slug": node_slug, "cycles": cycles}
    (node_dir / "node_result.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


# -------------- ROOT COMPONENT & SYSTEM INTEGRATION --------------

def run_root_component(root_component: str) -> List[Dict]:
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    root_slug = slugify(root_component)
    root_dir = COMPONENTS_ROOT / root_slug / ts
    root_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n{'='*50}")
    print(f"Root: {root_component}")
    print(f"Dir: {root_dir}")
    print(f"{'='*50}\n")
    
    print(f"[Stage 0] Decomposing ({get_backend('decomposer')})")
    decomposition = run_decomposer(get_backend("decomposer"), root_component)
    (root_dir / "decomposition.json").write_text(json.dumps(decomposition, indent=2), encoding="utf-8")
    
    nodes = decomposition.get("nodes", [{"name": root_component, "depth": 0, "parent_name": None, "should_run_pipeline": True}])
    nodes_to_run = sorted([n for n in nodes if n.get("should_run_pipeline")], key=lambda n: n.get("depth", 0), reverse=True)
    
    node_results = []
    node_results_by_name = {}
    
    for node in nodes_to_run:
        node_name = node.get("name", root_component)
        node_depth = node.get("depth", 0)
        node_slug = slugify(f"d{node_depth}_{node_name}")
        node_dir = root_dir / node_slug
        
        child_summaries = [build_child_summary(node_results_by_name[other.get("name")]) for other in nodes if other.get("parent_name") == node_name and other.get("name") in node_results_by_name]
        
        nr = run_component_node_pipeline(root_component, node, node_dir, max_cycles=3, child_summaries=child_summaries)
        node_results.append(nr)
        node_results_by_name[node_name] = nr
    
    return node_results


def build_system_summary(all_results: List[Dict]) -> Dict:
    comps = []
    for nr in all_results:
        cycles = nr.get("cycles", [])
        if cycles:
            last = cycles[-1]
            comps.append({
                "node_name": nr.get("node_name"),
                "final_judgement": last.get("final_arbiter", {}).get("final_judgement"),
                "poc_champion": last.get("final_arbiter", {}).get("chosen_poc_champion"),
            })
    return {"components": comps}


def system_architect_call(backend: str, summary: Dict) -> Dict:
    text = call_llm(backend, system_architect_system(), f"System summary:\n{json.dumps(summary, indent=2)}")
    return safe_json_load(text)


def system_critic_call(backend: str, summary: Dict, architect: Dict) -> Dict:
    text = call_llm(backend, system_critic_system(), f"Summary:\n{json.dumps(summary, indent=2)}\n\nArchitect:\n{json.dumps(architect, indent=2)}")
    return safe_json_load(text)


def system_feasibility_call(backend: str, summary: Dict, architect: Dict, critic: Dict) -> Dict:
    text = call_llm(backend, system_feasibility_system(), f"Summary:\n{json.dumps(summary, indent=2)}\n\nArchitect:\n{json.dumps(architect, indent=2)}\n\nCritic:\n{json.dumps(critic, indent=2)}")
    return safe_json_load(text)


def run_system_integration(all_results: List[Dict]) -> None:
    if not all_results:
        print("\n[System] No results, skipping integration.")
        return
    
    print("\n[System] Building summary")
    summary = build_system_summary(all_results)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    (SYSTEM_ROOT / f"summary_{ts}.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    
    print(f"[System] Architect ({get_backend('system_architect')})")
    architect = system_architect_call(get_backend("system_architect"), summary)
    
    print(f"[System] Critic ({get_backend('system_critic')})")
    critic = system_critic_call(get_backend("system_critic"), summary, architect)
    
    print(f"[System] Feasibility ({get_backend('system_feasibility')})")
    feasibility = system_feasibility_call(get_backend("system_feasibility"), summary, architect, critic)
    
    out = {"summary": summary, "architect": architect, "critic": critic, "feasibility": feasibility}
    (SYSTEM_ROOT / f"integration_{ts}.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    
    print(f"\n[System] Judgement: {feasibility.get('global_judgement')}")


# -------------- ENTRY POINT --------------

def main(args: List[str]) -> None:
    if len(args) < 2:
        print("Usage: python -m backend.orchestrator \"Component 1\" \"Component 2\" ...")
        sys.exit(1)
    
    components = args[1:]
    reset_usage_stats()
    all_results = []
    
    for comp in components:
        results = run_root_component(comp)
        all_results.extend(results)
    
    run_system_integration(all_results)
    
    stats = get_usage_stats()
    print(f"\n{'='*60}")
    print("RUN COMPLETE")
    print(stats.summary())
    print(f"{'='*60}\n")
    
    try:
        notify_iphone(f"Neura Lab finished: {', '.join(components)}. Cost: ${stats.estimated_cost_usd:.2f}")
    except Exception as e:
        print(f"[Notify] Error: {e}")


if __name__ == "__main__":
    main(sys.argv)
