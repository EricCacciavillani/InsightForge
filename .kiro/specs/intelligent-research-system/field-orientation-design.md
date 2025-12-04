# Field Orientation Design (Phase -1)

> **NOTE**: This content should be merged into `design.md` as section "-1. FieldOrientationEngine" before "0. SmartSearchPipeline"

## Overview

Field Orientation is a pre-search learning phase that builds understanding of a research field's vocabulary, key people, and structure **before** generating search queries. This ensures queries use insider terminology rather than naive/outsider terms.

## User Choice

Users select one of three modes:

| Mode | Time | What It Does | Best For |
|------|------|--------------|----------|
| **Skip** | 0s | No orientation, naive queries | Quick exploration, familiar topics |
| **Quick Bootstrap** | ~30s | Abstracts only, basic vocabulary | Most research tasks |
| **Deep Bootstrap** | ~2-3 min | Full survey analysis, taxonomy | Thorough investigation, unfamiliar fields |

## Architecture (Mermaid Update)

Add this before "Phase 0: Smart Search Pipeline" in the main diagram:

```mermaid
subgraph "Phase -1: Field Orientation"
    TOPIC[Research Topic] --> MODE{User Selects<br/>Orientation Mode}
    MODE -->|Quick| QUICK[Quick Bootstrap<br/>~30 seconds]
    MODE -->|Deep| DEEP[Deep Bootstrap<br/>~2-3 minutes]
    MODE -->|Skip| NAIVE[Skip to Naive Queries]
    QUICK --> SURVEY[Find Surveys<br/>OpenAlex + S2]
    DEEP --> SURVEY
    SURVEY --> VOCAB[Extract Vocabulary<br/>Gemini Flash]
    VOCAB --> FIELDMAP[Field Knowledge<br/>terms, people, venues]
    DEEP --> FULLTEXT_SURVEY[Get Survey Full Text]
    FULLTEXT_SURVEY --> TAXONOMY[Build Taxonomy<br/>Gemini Pro]
    TAXONOMY --> FIELDMAP
    FIELDMAP --> INFORMED[Informed Query Gen]
    NAIVE --> QUERY
    INFORMED --> QUERY
end

style QUICK fill:#90EE90,color:#000
style DEEP fill:#4ecdc4,color:#000
style FIELDMAP fill:#FFD700,color:#000
```

## Data Structures

```python
from dataclasses import dataclass
from typing import List, Dict, Optional
from enum import Enum

class OrientationMode(Enum):
    SKIP = "skip"       # No orientation, naive queries
    QUICK = "quick"     # ~30 seconds, abstracts only
    DEEP = "deep"       # ~2-3 minutes, full survey analysis

@dataclass
class FieldKnowledge:
    """Output of field orientation - informs query generation."""
    topic: str
    mode_used: OrientationMode

    # Core vocabulary (both modes)
    insider_terms: List[Dict[str, str]]  # {"term": "SSVEP", "expansion": "...", "context": "..."}
    acronyms: Dict[str, str]             # {"BCI": "Brain-Computer Interface"}
    key_concepts: List[str]

    # Key entities (both modes)
    key_researchers: List[Dict[str, str]]  # {"name": "...", "affiliation": "...", "contribution": "..."}
    key_venues: List[Dict[str, str]]       # {"name": "...", "type": "journal|conference", "relevance": "..."}
    seminal_papers: List[Dict[str, str]]   # {"title": "...", "year": "...", "why_seminal": "..."}

    # Structure
    sub_fields: List[Dict[str, str]]       # {"name": "Motor Imagery BCI", "description": "..."}

    # Deep mode only
    taxonomy: Optional[Dict] = None                    # Hierarchical field structure
    active_debates: Optional[List[Dict[str, str]]] = None  # Current controversies
    methodology_timeline: Optional[List[Dict]] = None      # Evolution of methods

    # Metadata
    surveys_found: int = 0
    papers_analyzed: int = 0
    orientation_time_seconds: float = 0.0
    confidence: float = 0.0

@dataclass
class OrientationConfig:
    mode: OrientationMode = OrientationMode.QUICK

    # Quick mode settings
    quick_top_cited_limit: int = 20
    quick_survey_limit: int = 10
    quick_timeout_seconds: int = 60

    # Deep mode settings
    deep_survey_fulltext_limit: int = 2
    deep_timeout_seconds: int = 300

    # LLM settings
    cheap_llm: str = "gemini-1.5-flash"
    expensive_llm: str = "gemini-1.5-pro"
```

## FieldOrientationEngine

```python
class FieldOrientationEngine:
    """Pre-search learning that builds field understanding."""

    def __init__(self, config: OrientationConfig):
        self.config = config
        self._cache: Dict[str, FieldKnowledge] = {}

    def orient(self, topic: str, mode: OrientationMode = None) -> FieldKnowledge:
        """Main entry point for field orientation."""
        mode = mode or self.config.mode

        if mode == OrientationMode.SKIP:
            return self._create_empty_knowledge(topic)

        cached = self._check_cache(topic)
        if cached:
            return cached

        if mode == OrientationMode.QUICK:
            return self._quick_bootstrap(topic)
        else:
            return self._deep_bootstrap(topic)

    def _quick_bootstrap(self, topic: str) -> FieldKnowledge:
        """
        Fast orientation (~30 seconds) using abstracts only.

        Steps:
        1. Query OpenAlex for top 20 cited papers
        2. Query Semantic Scholar for 10 survey/review papers
        3. Extract vocabulary from abstracts using cheap LLM
        4. Identify key researchers, venues, seminal papers
        5. Identify sub-fields from survey abstracts
        """
        import time
        start = time.time()

        # 1. Find surveys (Semantic Scholar)
        surveys = semantic_scholar_search(
            f"{topic} survey OR review",
            limit=self.config.quick_survey_limit,
            sort="citationCount"
        )

        # 2. Find top-cited papers (OpenAlex)
        top_cited = openAlex_search(
            topic,
            sort="cited_by_count",
            limit=self.config.quick_top_cited_limit
        )

        # 3. Merge and extract vocabulary from abstracts
        all_papers = self._merge_papers(surveys, top_cited)
        abstracts = [p.abstract for p in all_papers if p.abstract]
        vocabulary = self._extract_vocabulary(abstracts, topic)

        # 4. Extract key entities
        researchers = self._extract_researchers(all_papers)
        venues = self._extract_venues(all_papers)
        seminal = self._identify_seminal_papers(all_papers)
        sub_fields = self._extract_subfields(surveys, topic)

        elapsed = time.time() - start

        knowledge = FieldKnowledge(
            topic=topic,
            mode_used=OrientationMode.QUICK,
            insider_terms=vocabulary["terms"],
            acronyms=vocabulary["acronyms"],
            key_concepts=vocabulary["concepts"],
            key_researchers=researchers,
            key_venues=venues,
            seminal_papers=seminal,
            sub_fields=sub_fields,
            surveys_found=len(surveys),
            papers_analyzed=len(all_papers),
            orientation_time_seconds=elapsed,
            confidence=self._calculate_confidence(all_papers, surveys)
        )

        self._cache[topic] = knowledge
        return knowledge

    def _deep_bootstrap(self, topic: str) -> FieldKnowledge:
        """
        Thorough orientation (~2-3 minutes) with full survey analysis.

        Additional steps beyond quick:
        1. Get full text for top 1-2 surveys
        2. Build comprehensive taxonomy from full survey
        3. Identify active debates and controversies
        4. Build methodology timeline
        5. Use S2 Recommendations for more influential papers
        """
        import time
        start = time.time()

        # 1. Run quick bootstrap first
        quick_knowledge = self._quick_bootstrap(topic)

        # 2. Get full text for top surveys
        surveys = semantic_scholar_search(
            f"{topic} survey",
            limit=self.config.deep_survey_fulltext_limit
        )
        full_texts = []
        for survey in surveys:
            text = self._get_full_text(survey)  # arXiv -> CORE -> Unpaywall
            if text:
                full_texts.append({"paper": survey, "text": text})

        # 3. Build comprehensive taxonomy from full survey
        taxonomy = None
        if full_texts:
            taxonomy = self._build_taxonomy(full_texts[0]["text"], topic)

        # 4. Identify active debates and methodology timeline
        active_debates = self._identify_debates(full_texts, topic)
        timeline = self._build_methodology_timeline(full_texts, topic)

        # 5. Use Semantic Scholar recommendations for more influential papers
        if quick_knowledge.seminal_papers:
            additional = self._get_recommendations(quick_knowledge.seminal_papers[0])
            quick_knowledge.seminal_papers.extend(additional[:3])

        elapsed = time.time() - start

        return FieldKnowledge(
            topic=topic,
            mode_used=OrientationMode.DEEP,
            insider_terms=quick_knowledge.insider_terms,
            acronyms=quick_knowledge.acronyms,
            key_concepts=quick_knowledge.key_concepts,
            key_researchers=quick_knowledge.key_researchers,
            key_venues=quick_knowledge.key_venues,
            seminal_papers=quick_knowledge.seminal_papers,
            sub_fields=quick_knowledge.sub_fields,
            taxonomy=taxonomy,
            active_debates=active_debates,
            methodology_timeline=timeline,
            surveys_found=quick_knowledge.surveys_found,
            papers_analyzed=quick_knowledge.papers_analyzed + len(full_texts),
            orientation_time_seconds=elapsed,
            confidence=min(quick_knowledge.confidence + 0.15, 1.0)
        )

    def _extract_vocabulary(self, abstracts: List[str], topic: str) -> Dict:
        """Use cheap LLM to extract insider vocabulary from abstracts."""
        combined = "\n\n---\n\n".join(abstracts[:10])

        prompt = f"""Analyze these abstracts about "{topic}" and extract:

1. INSIDER TERMS: Technical terms experts use (not obvious to outsiders)
   - Include the term, what it means, and context of use

2. ACRONYMS: Common abbreviations with expansions

3. KEY CONCEPTS: Fundamental concepts to understand this field

Abstracts:
{combined}

Return JSON:
{{
  "terms": [{{"term": "...", "expansion": "...", "context": "..."}}],
  "acronyms": {{"ABC": "Full Name"}},
  "concepts": ["concept1", "concept2"]
}}"""

        return call_llm_json(self.config.cheap_llm, VOCAB_SYSTEM, prompt)

    def _build_taxonomy(self, survey_text: str, topic: str) -> Dict:
        """Use expensive LLM to build field taxonomy from full survey."""
        prompt = f"""Analyze this survey about "{topic}" and build a hierarchical taxonomy:

{survey_text[:20000]}

Build a taxonomy showing:
1. Main branches/approaches
2. Sub-categories within each
3. Key methods/techniques
4. How branches relate

Return JSON:
{{
  "root": "{topic}",
  "branches": [
    {{
      "name": "Branch Name",
      "description": "...",
      "sub_categories": [
        {{"name": "Sub-cat", "methods": ["m1", "m2"], "key_papers": ["Author 2020"]}}
      ],
      "related_to": ["Other Branch"]
    }}
  ]
}}"""

        return call_llm_json(self.config.expensive_llm, TAXONOMY_SYSTEM, prompt)

    def _get_full_text(self, paper) -> Optional[str]:
        """Try arXiv -> CORE -> Unpaywall to get full text."""
        # 1. Try arXiv first
        if "arxiv" in getattr(paper, 'url', '').lower():
            return fetch_arxiv_text(paper.arxiv_id)

        # 2. Try Unpaywall for DOI
        if hasattr(paper, 'doi') and paper.doi:
            oa_url = unpaywall_lookup(paper.doi)
            if oa_url:
                return fetch_pdf_text(oa_url)

        # 3. Try CORE as fallback
        return core_search_fulltext(paper.title)

    def _create_empty_knowledge(self, topic: str) -> FieldKnowledge:
        """Create empty knowledge for skip mode."""
        return FieldKnowledge(
            topic=topic,
            mode_used=OrientationMode.SKIP,
            insider_terms=[],
            acronyms={},
            key_concepts=[],
            key_researchers=[],
            key_venues=[],
            seminal_papers=[],
            sub_fields=[],
            confidence=0.0
        )
```

## InformedQueryGenerator

```python
class InformedQueryGenerator:
    """Generates search queries using field knowledge."""

    def __init__(self, cheap_llm: str = "gemini-1.5-flash"):
        self.cheap_llm = cheap_llm

    def generate(self, topic: str, knowledge: FieldKnowledge, num_queries: int = 8) -> List[str]:
        """Generate informed queries using field knowledge."""

        if knowledge.mode_used == OrientationMode.SKIP:
            return self._naive_queries(topic, num_queries)

        queries = []

        # 1. Survey query with insider terms
        terms = [t["term"] for t in knowledge.insider_terms[:3]]
        if terms:
            queries.append(f"{topic} {' '.join(terms)} survey review")

        # 2. Seminal paper citation network queries
        for paper in knowledge.seminal_papers[:2]:
            queries.append(f"citing:{paper.get('title', '')} {topic}")

        # 3. Key researcher queries
        for researcher in knowledge.key_researchers[:2]:
            queries.append(f"{researcher['name']} {topic}")

        # 4. Venue-specific queries
        for venue in knowledge.key_venues[:2]:
            queries.append(f"venue:{venue['name']} {topic}")

        # 5. Sub-field specific queries
        for subfield in knowledge.sub_fields[:3]:
            queries.append(f"{subfield['name']} {topic}")

        # 6. Acronym + expansion queries (for maximum coverage)
        for acronym, expansion in list(knowledge.acronyms.items())[:2]:
            queries.append(f'"{acronym}" OR "{expansion}" {topic}')

        # 7. Fill remaining with LLM-generated queries using vocabulary
        remaining = num_queries - len(queries)
        if remaining > 0:
            additional = self._llm_queries_with_context(topic, knowledge, remaining)
            queries.extend(additional)

        return queries[:num_queries]

    def _naive_queries(self, topic: str, num_queries: int) -> List[str]:
        """Generate queries without field knowledge (fallback)."""
        prompt = f"""Generate {num_queries} diverse search queries for: {topic}

Include queries for:
- Survey/review papers
- Recent advances
- Methods/techniques
- Challenges/limitations

Return as JSON array of strings."""

        return call_llm_json(self.cheap_llm, QUERY_GEN_SYSTEM, prompt)
```

## Example: Naive vs Informed Queries

**Topic: "brain-computer interfaces for gaming"**

| Query Type | Naive (Skip Mode) | Informed (Quick/Deep Mode) |
|------------|-------------------|---------------------------|
| Survey | "brain computer interface gaming survey" | "SSVEP motor imagery BCI gaming survey review" |
| Methods | "neural signals for games" | "P300 speller real-time classification CNN" |
| Researcher | *(none - doesn't know who's important)* | "Jonathan Wolpaw BCI control" |
| Venue | *(none)* | "venue:Journal of Neural Engineering BCI gaming latency" |
| Sub-field | "brain game technology" | "passive BCI affective gaming user experience" |
| Acronym | *(doesn't know acronyms)* | '"SSVEP" OR "Steady-State Visual Evoked Potential" gaming' |

## Cost Analysis

| Mode | API Calls | LLM Calls | Estimated Cost | Time |
|------|-----------|-----------|----------------|------|
| Skip | 0 | 1 (naive query gen) | ~$0.001 | 0s |
| Quick | 2 (OpenAlex + S2) | 1 (vocab extraction) | ~$0.01 | ~30s |
| Deep | 2 + full text fetches | 3 (vocab + taxonomy + debates) | ~$0.10 | ~2-3min |

## Integration with Cost Tiers

| Research Tier | Default Orientation | Rationale |
|---------------|---------------------|-----------|
| Quick ($) | Skip or Quick | Speed over thoroughness |
| Standard ($$) | Quick | Good balance |
| Thorough ($$$) | Deep | Maximum quality |

## Caching Strategy

- Cache FieldKnowledge by topic (exact match)
- Cache expires after 30 days (field knowledge is relatively stable)
- Allow user to force refresh
- Share cache across similar topics (fuzzy match with embeddings)
