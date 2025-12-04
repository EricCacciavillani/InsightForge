# Full-Text Retrieval Layer

## The Problem

Most academic APIs **do NOT give you the full paper content**:

| API | What It Gives | Full Text? |
|-----|---------------|------------|
| Semantic Scholar | title, abstract, citations, embeddings | ❌ No |
| OpenAlex | title, abstract (inverted index), metadata | ❌ No |
| arXiv API | title, abstract, links | ⚠️ Links only |
| arXiv Download | PDF + LaTeX source | ✅ Yes (OA) |
| Unpaywall | OA location for DOIs | ⚠️ Links only |
| CORE | metadata + full text (OA) | ✅ Yes (OA) |

**You can't distill what you can't read.**

Your distillation phase needs the actual paper body (methods, results, equations) - not just abstracts.

---

## Requirements (Add to requirements.md as 0.6)

### Requirement 0.6: Full-Text Retrieval Layer

**User Story:** As a researcher, I want the system to retrieve full paper text when available, so that distillation can extract detailed methods, results, and equations - not just abstracts.

#### Acceptance Criteria

1. WHEN a paper passes relevance filtering THEN the system SHALL attempt full-text retrieval before distillation
2. WHEN retrieving full text THEN the system SHALL try sources in priority order: arXiv → Unpaywall → CORE
3. WHEN a paper is from arXiv THEN the system SHALL fetch the PDF directly from arxiv.org/pdf/{id}
4. WHEN a paper has a DOI THEN the system SHALL query Unpaywall for open-access locations
5. WHEN Unpaywall returns an OA URL THEN the system SHALL fetch and extract text from the PDF
6. WHEN arXiv and Unpaywall fail THEN the system SHALL query CORE API by title
7. WHEN full text is retrieved THEN the system SHALL extract text using PDF parser (PyMuPDF/pdfplumber)
8. WHEN full text cannot be retrieved THEN the system SHALL mark paper as "abstract_only" and proceed with abstract
9. WHEN tracking retrieval THEN the system SHALL log success/failure per source for analytics
10. WHEN displaying results THEN the system SHALL show "Full Text" vs "Abstract Only" badge per paper

### Requirement 0.6.1: arXiv Full-Text Retrieval

**User Story:** As a researcher, I want arXiv papers to reliably get full text, since arXiv is fully open-access.

#### Acceptance Criteria

1. WHEN a paper URL contains "arxiv.org" THEN the system SHALL extract the arXiv ID
2. WHEN fetching arXiv PDF THEN the system SHALL use https://arxiv.org/pdf/{id}.pdf
3. WHEN fetching arXiv source THEN the system SHALL use https://arxiv.org/src/{id} (tar.gz)
4. WHEN rate limiting THEN the system SHALL wait at least 3 seconds between arXiv requests
5. WHEN arXiv returns 429 (rate limit) THEN the system SHALL exponential backoff and retry
6. WHEN source package is available THEN the system SHALL prefer LaTeX extraction over PDF extraction for better structure
7. WHEN LaTeX is extracted THEN the system SHALL preserve section headings, equations, and figure captions

### Requirement 0.6.2: Unpaywall Integration

**User Story:** As a researcher, I want the system to find open-access versions of paywalled papers when available.

#### Acceptance Criteria

1. WHEN a paper has a DOI THEN the system SHALL query Unpaywall API: api.unpaywall.org/v2/{doi}?email={email}
2. WHEN Unpaywall returns best_oa_location THEN the system SHALL extract url_for_pdf
3. WHEN multiple OA locations exist THEN the system SHALL prefer: publisher > repository > preprint
4. WHEN fetching the OA PDF THEN the system SHALL handle redirects and different PDF formats
5. WHEN Unpaywall has no OA version THEN the system SHALL proceed to CORE fallback
6. WHEN caching Unpaywall results THEN the system SHALL cache DOI → OA URL for 7 days

### Requirement 0.6.3: CORE API Integration

**User Story:** As a researcher, I want access to CORE's large open-access repository as a fallback.

#### Acceptance Criteria

1. WHEN arXiv and Unpaywall fail THEN the system SHALL search CORE by paper title
2. WHEN querying CORE THEN the system SHALL use CORE API v3 with API key
3. WHEN CORE returns full text THEN the system SHALL use it directly (no PDF download needed)
4. WHEN CORE returns only metadata THEN the system SHALL attempt to fetch from downloadUrl if present
5. WHEN CORE has rate limits THEN the system SHALL respect X-RateLimit headers

### Requirement 0.6.4: PDF Text Extraction

**User Story:** As a researcher, I want clean text extracted from PDFs, preserving structure where possible.

#### Acceptance Criteria

1. WHEN extracting text from PDF THEN the system SHALL use PyMuPDF (fitz) as primary extractor
2. WHEN PyMuPDF fails THEN the system SHALL fallback to pdfplumber
3. WHEN extracting THEN the system SHALL preserve paragraph breaks and section headings
4. WHEN extracting THEN the system SHALL handle multi-column layouts
5. WHEN extracting THEN the system SHALL skip headers/footers/page numbers
6. WHEN extraction quality is low (<500 chars from >5 pages) THEN the system SHALL flag for OCR fallback
7. WHEN text is extracted THEN the system SHALL clean encoding issues and normalize whitespace

### Requirement 0.6.5: Rate Limiting and Resilience

**User Story:** As a researcher, I want the system to respect API rate limits and handle failures gracefully.

#### Acceptance Criteria

1. WHEN making arXiv requests THEN the system SHALL enforce minimum 3-second delay between requests
2. WHEN making Unpaywall requests THEN the system SHALL include email parameter as required
3. WHEN making CORE requests THEN the system SHALL include API key header
4. WHEN any source returns 429 THEN the system SHALL exponential backoff (3s, 6s, 12s, max 60s)
5. WHEN any source returns 5xx THEN the system SHALL retry up to 3 times with backoff
6. WHEN all retries fail THEN the system SHALL log failure and continue with abstract
7. WHEN bulk processing papers THEN the system SHALL use async/parallel requests where rate limits allow
8. WHEN processing many papers THEN the system SHALL show progress (X/Y papers, N with full text)

---

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  FULL-TEXT RETRIEVAL LAYER                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   SCORED PAPERS (from relevance filter)                             │
│       ↓                                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ For each paper:                                             │   │
│   │                                                             │   │
│   │   1. Is it arXiv?                                           │   │
│   │      ├─ YES → Fetch arxiv.org/pdf/{id}.pdf                  │   │
│   │      │        (rate limit: 1 req / 3 sec)                   │   │
│   │      │        ↓                                             │   │
│   │      │        Extract text from PDF                         │   │
│   │      │        ↓                                             │   │
│   │      │        ✅ Mark as "full_text"                        │   │
│   │      │                                                      │   │
│   │      └─ NO → Continue to step 2                             │   │
│   │                                                             │   │
│   │   2. Has DOI?                                                │   │
│   │      ├─ YES → Query Unpaywall for OA location               │   │
│   │      │        ↓                                             │   │
│   │      │        If OA found → Fetch PDF → Extract text        │   │
│   │      │        ↓                                             │   │
│   │      │        ✅ Mark as "full_text"                        │   │
│   │      │                                                      │   │
│   │      └─ NO OA → Continue to step 3                          │   │
│   │                                                             │   │
│   │   3. Query CORE by title                                    │   │
│   │      ├─ Has fullText → ✅ Use directly                      │   │
│   │      ├─ Has downloadUrl → Fetch PDF → Extract               │   │
│   │      └─ Nothing → ⚠️ Mark as "abstract_only"                │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│       ↓                                                             │
│   PAPERS WITH CONTENT                                               │
│   [                                                                 │
│     {paper: ..., content_type: "full_text", text: "..."},           │
│     {paper: ..., content_type: "abstract_only", text: "..."}        │
│   ]                                                                 │
│       ↓                                                             │
│   → DISTILLATION (can now extract methods, results, etc.)           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Structures

```python
from dataclasses import dataclass
from typing import Optional, List
from enum import Enum
import time

class ContentType(Enum):
    FULL_TEXT = "full_text"           # Complete paper body
    ABSTRACT_ONLY = "abstract_only"   # Only abstract available
    PARTIAL = "partial"               # Some sections missing

class RetrievalSource(Enum):
    ARXIV_PDF = "arxiv_pdf"
    ARXIV_SOURCE = "arxiv_source"     # LaTeX source
    UNPAYWALL = "unpaywall"
    CORE_FULLTEXT = "core_fulltext"
    CORE_PDF = "core_pdf"
    NONE = "none"

@dataclass
class RetrievalResult:
    """Result of attempting to retrieve full text for a paper."""
    paper_id: str
    content_type: ContentType
    source: RetrievalSource
    text: str                         # Full text or abstract
    word_count: int

    # Metadata
    pdf_url: Optional[str] = None
    retrieval_time_seconds: float = 0.0
    retry_count: int = 0

    # Quality indicators
    has_sections: bool = False        # Could identify sections
    has_equations: bool = False       # Contains equations/formulas
    has_figures: bool = False         # References figures
    extraction_confidence: float = 1.0  # 0-1, lower if OCR or messy

@dataclass
class RetrievalStats:
    """Stats for a batch retrieval operation."""
    total_papers: int
    full_text_count: int
    abstract_only_count: int

    # By source
    arxiv_success: int = 0
    unpaywall_success: int = 0
    core_success: int = 0

    # Failures
    rate_limited: int = 0
    network_errors: int = 0
    extraction_failures: int = 0

    @property
    def full_text_rate(self) -> float:
        return self.full_text_count / max(self.total_papers, 1)

@dataclass
class FullTextConfig:
    """Configuration for full-text retrieval."""
    # Rate limits
    arxiv_delay_seconds: float = 3.0
    max_retries: int = 3
    retry_backoff_base: float = 3.0   # 3s, 6s, 12s

    # API credentials
    unpaywall_email: str = ""         # Required for Unpaywall
    core_api_key: str = ""            # Required for CORE

    # Behavior
    prefer_latex_source: bool = True  # Prefer arXiv source over PDF
    skip_if_cached: bool = True
    cache_ttl_days: int = 30

    # Limits
    max_pdf_size_mb: int = 50
    extraction_timeout_seconds: int = 30
```

### FullTextRetriever Class

```python
import asyncio
import aiohttp
from typing import Dict

class FullTextRetriever:
    """
    Retrieves full text for academic papers from multiple sources.

    Priority order: arXiv → Unpaywall → CORE
    """

    def __init__(self, config: FullTextConfig):
        self.config = config
        self._cache: Dict[str, RetrievalResult] = {}
        self._last_arxiv_request = 0.0
        self._pdf_extractor = PDFTextExtractor()

    async def retrieve_batch(
        self,
        papers: List[ScoredPaper],
        progress_callback: Optional[callable] = None
    ) -> tuple[List[RetrievalResult], RetrievalStats]:
        """
        Retrieve full text for a batch of papers.

        Returns results and stats about the batch operation.
        """
        results = []
        stats = RetrievalStats(total_papers=len(papers), full_text_count=0, abstract_only_count=0)

        for i, paper in enumerate(papers):
            # Check cache
            if self.config.skip_if_cached and paper.paper_id in self._cache:
                results.append(self._cache[paper.paper_id])
                continue

            # Attempt retrieval
            result = await self._retrieve_single(paper, stats)
            results.append(result)

            # Update stats
            if result.content_type == ContentType.FULL_TEXT:
                stats.full_text_count += 1
            else:
                stats.abstract_only_count += 1

            # Cache result
            self._cache[paper.paper_id] = result

            # Progress callback
            if progress_callback:
                progress_callback(i + 1, len(papers), result)

        return results, stats

    async def _retrieve_single(self, paper: ScoredPaper, stats: RetrievalStats) -> RetrievalResult:
        """Attempt to retrieve full text for a single paper."""
        start_time = time.time()

        # Strategy 1: arXiv (if applicable)
        if self._is_arxiv(paper):
            result = await self._try_arxiv(paper)
            if result and result.content_type == ContentType.FULL_TEXT:
                stats.arxiv_success += 1
                result.retrieval_time_seconds = time.time() - start_time
                return result

        # Strategy 2: Unpaywall (if DOI available)
        if paper.doi:
            result = await self._try_unpaywall(paper)
            if result and result.content_type == ContentType.FULL_TEXT:
                stats.unpaywall_success += 1
                result.retrieval_time_seconds = time.time() - start_time
                return result

        # Strategy 3: CORE (fallback)
        result = await self._try_core(paper)
        if result and result.content_type == ContentType.FULL_TEXT:
            stats.core_success += 1
            result.retrieval_time_seconds = time.time() - start_time
            return result

        # Fallback: abstract only
        return RetrievalResult(
            paper_id=paper.paper_id,
            content_type=ContentType.ABSTRACT_ONLY,
            source=RetrievalSource.NONE,
            text=paper.abstract or "",
            word_count=len((paper.abstract or "").split()),
            retrieval_time_seconds=time.time() - start_time
        )

    async def _try_arxiv(self, paper: ScoredPaper) -> Optional[RetrievalResult]:
        """Attempt to get full text from arXiv."""
        arxiv_id = self._extract_arxiv_id(paper.url)
        if not arxiv_id:
            return None

        # Enforce rate limit
        await self._arxiv_rate_limit()

        # Try PDF
        pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(pdf_url, timeout=30) as response:
                    if response.status == 200:
                        pdf_bytes = await response.read()
                        text = self._pdf_extractor.extract(pdf_bytes)

                        if text and len(text) > 500:
                            return RetrievalResult(
                                paper_id=paper.paper_id,
                                content_type=ContentType.FULL_TEXT,
                                source=RetrievalSource.ARXIV_PDF,
                                text=text,
                                word_count=len(text.split()),
                                pdf_url=pdf_url,
                                has_sections=self._has_sections(text),
                                has_equations=self._has_equations(text)
                            )
                    elif response.status == 429:
                        # Rate limited - will retry with backoff
                        await asyncio.sleep(self.config.retry_backoff_base)
                        return await self._try_arxiv(paper)  # Retry once
        except Exception as e:
            print(f"arXiv retrieval failed for {arxiv_id}: {e}")

        return None

    async def _try_unpaywall(self, paper: ScoredPaper) -> Optional[RetrievalResult]:
        """Attempt to find OA version via Unpaywall."""
        if not self.config.unpaywall_email:
            return None

        api_url = f"https://api.unpaywall.org/v2/{paper.doi}?email={self.config.unpaywall_email}"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()

                        # Find best OA location
                        best_oa = data.get("best_oa_location")
                        if best_oa and best_oa.get("url_for_pdf"):
                            pdf_url = best_oa["url_for_pdf"]

                            # Fetch the PDF
                            async with session.get(pdf_url, timeout=30) as pdf_response:
                                if pdf_response.status == 200:
                                    pdf_bytes = await pdf_response.read()
                                    text = self._pdf_extractor.extract(pdf_bytes)

                                    if text and len(text) > 500:
                                        return RetrievalResult(
                                            paper_id=paper.paper_id,
                                            content_type=ContentType.FULL_TEXT,
                                            source=RetrievalSource.UNPAYWALL,
                                            text=text,
                                            word_count=len(text.split()),
                                            pdf_url=pdf_url
                                        )
        except Exception as e:
            print(f"Unpaywall retrieval failed for {paper.doi}: {e}")

        return None

    async def _try_core(self, paper: ScoredPaper) -> Optional[RetrievalResult]:
        """Attempt to get full text from CORE."""
        if not self.config.core_api_key:
            return None

        # Search by title
        search_url = "https://api.core.ac.uk/v3/search/works"
        headers = {"Authorization": f"Bearer {self.config.core_api_key}"}
        params = {"q": f'title:"{paper.title}"', "limit": 1}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, headers=headers, params=params, timeout=15) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = data.get("results", [])

                        if results:
                            work = results[0]

                            # Check for direct full text
                            if work.get("fullText"):
                                return RetrievalResult(
                                    paper_id=paper.paper_id,
                                    content_type=ContentType.FULL_TEXT,
                                    source=RetrievalSource.CORE_FULLTEXT,
                                    text=work["fullText"],
                                    word_count=len(work["fullText"].split())
                                )

                            # Try download URL
                            if work.get("downloadUrl"):
                                pdf_url = work["downloadUrl"]
                                async with session.get(pdf_url, timeout=30) as pdf_response:
                                    if pdf_response.status == 200:
                                        pdf_bytes = await pdf_response.read()
                                        text = self._pdf_extractor.extract(pdf_bytes)

                                        if text and len(text) > 500:
                                            return RetrievalResult(
                                                paper_id=paper.paper_id,
                                                content_type=ContentType.FULL_TEXT,
                                                source=RetrievalSource.CORE_PDF,
                                                text=text,
                                                word_count=len(text.split()),
                                                pdf_url=pdf_url
                                            )
        except Exception as e:
            print(f"CORE retrieval failed for {paper.title}: {e}")

        return None

    async def _arxiv_rate_limit(self):
        """Enforce arXiv rate limit (1 request per 3 seconds)."""
        now = time.time()
        elapsed = now - self._last_arxiv_request
        if elapsed < self.config.arxiv_delay_seconds:
            await asyncio.sleep(self.config.arxiv_delay_seconds - elapsed)
        self._last_arxiv_request = time.time()

    def _is_arxiv(self, paper: ScoredPaper) -> bool:
        return "arxiv" in (paper.url or "").lower() or (paper.source == "arxiv")

    def _extract_arxiv_id(self, url: str) -> Optional[str]:
        """Extract arXiv ID from URL like https://arxiv.org/abs/2301.12345"""
        import re
        if not url:
            return None
        match = re.search(r'arxiv.org/(?:abs|pdf)/(\d+\.\d+(?:v\d+)?)', url)
        return match.group(1) if match else None

    def _has_sections(self, text: str) -> bool:
        """Check if text has identifiable sections."""
        section_keywords = ["introduction", "methods", "results", "discussion", "conclusion", "abstract"]
        text_lower = text.lower()
        return sum(1 for kw in section_keywords if kw in text_lower) >= 3

    def _has_equations(self, text: str) -> bool:
        """Check if text likely contains equations."""
        import re
        # Look for LaTeX-style equations or common math patterns
        patterns = [r'\$.*\$', r'\\begin\{equation\}', r'=\s*\d', r'\sum', r'\int']
        return any(re.search(p, text) for p in patterns)


class PDFTextExtractor:
    """Extracts text from PDF bytes."""

    def extract(self, pdf_bytes: bytes) -> Optional[str]:
        """Extract text from PDF, trying multiple methods."""
        # Try PyMuPDF first
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text_parts = []
            for page in doc:
                text_parts.append(page.get_text())
            text = "\n\n".join(text_parts)
            if len(text) > 500:
                return self._clean_text(text)
        except Exception as e:
            print(f"PyMuPDF extraction failed: {e}")

        # Fallback to pdfplumber
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                text_parts = []
                for page in pdf.pages:
                    text_parts.append(page.extract_text() or "")
                text = "\n\n".join(text_parts)
                if len(text) > 500:
                    return self._clean_text(text)
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")

        return None

    def _clean_text(self, text: str) -> str:
        """Clean extracted text."""
        import re
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove page numbers
        text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
        # Fix hyphenation at line breaks
        text = re.sub(r'-\s+', '', text)
        return text.strip()
```

---

## Integration with Distillation

The FullTextRetriever sits between relevance filtering and distillation:

```python
# In the pipeline:

# 1. Search and filter
papers = search_pipeline.search(topic)
filtered = [p for p in papers if p.relevance_score >= threshold]

# 2. NEW: Retrieve full text
retriever = FullTextRetriever(config)
results, stats = await retriever.retrieve_batch(filtered)

print(f"Retrieved {stats.full_text_count}/{stats.total_papers} full texts")
print(f"  - arXiv: {stats.arxiv_success}")
print(f"  - Unpaywall: {stats.unpaywall_success}")
print(f"  - CORE: {stats.core_success}")

# 3. Distill (now has full content where available)
distilled = []
for result in results:
    if result.content_type == ContentType.FULL_TEXT:
        # Can extract methods, results, equations
        distilled.append(distiller.distill_full(result.text, topic))
    else:
        # Limited to abstract-based extraction
        distilled.append(distiller.distill_abstract(result.text, topic))
```

---

## Expected Full-Text Rates by Field

| Field | Estimated Full-Text Rate | Why |
|-------|-------------------------|-----|
| CS/ML | ~70-80% | Most on arXiv |
| Physics | ~70-80% | arXiv dominant |
| Math | ~60-70% | arXiv + some journals |
| Biology | ~40-50% | PMC, bioRxiv, some journals |
| Medicine | ~30-40% | PMC, but many paywalled |
| Social Sciences | ~20-30% | Fewer OA options |
| Humanities | ~15-25% | Lowest OA rates |

---

## Rate Limit Summary

| Source | Rate Limit | Strategy |
|--------|-----------|----------|
| arXiv | ~1 req / 3 sec | Enforce delay, exponential backoff |
| Unpaywall | Generous (email required) | Include email, cache results |
| CORE | 10 req/sec (with key) | Respect X-RateLimit headers |

---

## Implementation Tasks

- [ ] 0.6.1 Create data structures (RetrievalResult, RetrievalStats, FullTextConfig)
- [ ] 0.6.2 Implement PDFTextExtractor with PyMuPDF + pdfplumber fallback
- [ ] 0.6.3 Implement FullTextRetriever._try_arxiv with rate limiting
- [ ] 0.6.4 Implement FullTextRetriever._try_unpaywall
- [ ] 0.6.5 Implement FullTextRetriever._try_core
- [ ] 0.6.6 Implement retrieve_batch with progress tracking
- [ ] 0.6.7 Add caching layer for retrieval results
- [ ] 0.6.8 Integrate with distillation pipeline
- [ ] 0.6.9 Add "Full Text" vs "Abstract Only" badges to UI
- [ ] 0.6.10 Write tests for each retrieval source

---

## Environment Variables Needed

```env
UNPAYWALL_EMAIL=your-email@example.com
CORE_API_KEY=your-core-api-key
```
