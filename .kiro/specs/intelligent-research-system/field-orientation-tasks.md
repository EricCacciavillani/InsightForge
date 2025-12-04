# Field Orientation Implementation Tasks (Phase 0)

> **NOTE**: These tasks should be added to `tasks.md` as "Phase 0" before "Phase 1: Foundation"

## Update Phase Overview Table

Add this row to the phase overview:

| Phase | Tasks | Focus | Est. Time |
|-------|-------|-------|-----------|
| **Phase 0: Orientation** | 0 | Field Orientation (Pre-Search Learning) | ~3 hours |

---

## Phase 0: Orientation (Task 0)

- [ ] 0. Implement Field Orientation Engine (~3 hours)
  - [ ] 0.1 Create data structures (~20 min)
    - Implement OrientationMode enum (SKIP, QUICK, DEEP)
    - Implement FieldKnowledge dataclass with all fields
    - Implement OrientationConfig dataclass
    - _Requirements: -1.1, -1.2, -1.3_
    - **File:** `backend/orientation.py`
    - **Done when:**
      - All dataclasses can be instantiated
      - OrientationMode has three values
    - **Verify:** `python -c "from backend.orientation import FieldKnowledge, OrientationMode; print('OK')"`

  - [ ] 0.2 Implement FieldOrientationEngine class (~30 min)
    - Create orient() entry point
    - Implement mode selection logic
    - Implement _create_empty_knowledge() for skip mode
    - Add caching mechanism
    - _Requirements: -1.1, -1.11_
    - **Done when:**
      - orient(topic, mode=SKIP) returns empty FieldKnowledge
      - orient() checks cache before processing
    - **Verify:** `pytest tests/unit/test_orientation.py::test_skip_mode -v`

  - [ ] 0.3 Implement Quick Bootstrap (~45 min)
    - Query OpenAlex for top 20 cited papers
    - Query Semantic Scholar for 10 survey papers
    - Merge and deduplicate papers
    - _Requirements: -1.1.1, -1.1.2_
    - **Done when:**
      - _quick_bootstrap() returns FieldKnowledge in under 60s
      - Returns papers from both OpenAlex and Semantic Scholar
    - **Verify:** `pytest tests/unit/test_orientation.py::test_quick_bootstrap -v`

  - [ ] 0.4 Implement vocabulary extraction (~30 min)
    - Use cheap LLM to extract insider terms from abstracts
    - Extract acronyms with expansions
    - Extract key concepts
    - _Requirements: -1.1.3, -1.1.4, -1.5_
    - **Done when:**
      - _extract_vocabulary() returns dict with terms, acronyms, concepts
      - Terms include expansion and context
    - **Verify:** `pytest tests/unit/test_orientation.py::test_vocabulary_extraction -v`

  - [ ] 0.5 Implement entity extraction (~20 min)
    - Extract key researchers with affiliations
    - Extract key venues (journals, conferences)
    - Identify seminal papers (high citations, foundational)
    - Extract sub-fields from survey abstracts
    - _Requirements: -1.6, -1.7, -1.8, -1.9_
    - **Done when:**
      - FieldKnowledge has populated key_researchers, key_venues, seminal_papers, sub_fields
    - **Verify:** `pytest tests/unit/test_orientation.py::test_entity_extraction -v`

  - [ ] 0.6 Implement Deep Bootstrap (~45 min)
    - Build on Quick Bootstrap results
    - Get full text for top 1-2 surveys (arXiv -> CORE -> Unpaywall)
    - Build taxonomy from full survey using expensive LLM
    - Identify active debates
    - Build methodology timeline
    - Use S2 Recommendations API
    - _Requirements: -1.2.1 through -1.2.8_
    - **Done when:**
      - _deep_bootstrap() returns FieldKnowledge with taxonomy, active_debates, timeline
      - Attempts full text retrieval for surveys
    - **Verify:** `pytest tests/unit/test_orientation.py::test_deep_bootstrap -v`

  - [ ] 0.7 Implement InformedQueryGenerator (~30 min)
    - Generate queries using insider terms
    - Generate citation network queries for seminal papers
    - Generate researcher-specific queries
    - Generate venue-specific queries
    - Generate sub-field queries
    - Generate acronym + expansion queries
    - _Requirements: -1.3.1 through -1.3.7_
    - **File:** `backend/orientation.py`
    - **Done when:**
      - generate() returns queries using field knowledge
      - Queries include insider terminology, not naive terms
    - **Verify:** `pytest tests/unit/test_orientation.py::test_informed_queries -v`

  - [ ] 0.8 Add user choice UI integration (~15 min)
    - Expose orientation mode selection in API
    - Support "Skip Orientation" option
    - Display Field Map preview before proceeding
    - _Requirements: -1.1, -1.11, -1.12_
    - **File:** `api/server.py` (endpoint)
    - **Verify:** `pytest tests/integration/test_orientation_api.py -v`

  - [ ] 0.9 Add orientation data reuse (~15 min)
    - Check for previous research on similar topics
    - Offer to reuse relevant orientation data
    - _Requirements: -1.13_
    - **Verify:** `pytest tests/unit/test_orientation.py::test_cache_reuse -v`

  - [ ]* 0.10-0.12 Write property tests for field orientation
    - **Property 46:** Quick Bootstrap completes under 60 seconds
    - **Property 47:** Deep Bootstrap completes under 5 minutes
    - **Property 48:** Informed queries use insider vocabulary from FieldKnowledge
    - **Property 49:** Orientation extracts at least 5 insider terms for well-known fields
    - **Verify:** `pytest tests/property/test_orientation.py -v`

- [ ] 0.13 Checkpoint - Verify Field Orientation
  - **Pre-flight:** Ensure Tasks 0.1-0.9 are complete
  - **Unit tests:** `pytest tests/unit/test_orientation.py -v`
  - **Property tests:** `pytest tests/property/test_orientation.py -v`
  - **Integration test:** Run orientation on "machine learning" topic
    - Quick mode should find surveys and extract terms like "transformer", "attention", "fine-tuning"
    - Deep mode should build taxonomy with branches like "supervised", "unsupervised", "reinforcement"
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.

---

## Update Task 1 (Smart Search Pipeline)

After Field Orientation is complete, Task 1 needs updates:

### 1.1 Modify SmartSearchPipeline to accept FieldKnowledge

Change:
```python
def search(self, topic: str, ...) -> List[ScoredPaper]:
```

To:
```python
def search(self, topic: str, field_knowledge: Optional[FieldKnowledge] = None, ...) -> List[ScoredPaper]:
```

### 1.x Add new sub-task: Integrate orientation with search

- [ ] 1.x Integrate Field Orientation with Search (~20 min)
  - Accept FieldKnowledge from orientation phase
  - Use InformedQueryGenerator when field_knowledge provided
  - Fall back to naive queries when field_knowledge is None or skip mode
  - _Requirements: -1.3.1 through -1.3.7_
  - **Verify:** `pytest tests/integration/test_orientation_search.py -v`

---

## API Endpoints to Add

```python
# api/server.py

@app.post("/orientation/start")
async def start_orientation(request: OrientationRequest):
    """
    Start field orientation for a topic.

    Request:
    {
        "topic": "brain-computer interfaces",
        "mode": "quick" | "deep" | "skip"
    }

    Response:
    {
        "field_knowledge": {...},
        "time_taken": 32.5,
        "confidence": 0.85
    }
    """
    pass

@app.get("/orientation/preview")
async def preview_field_map(topic: str):
    """
    Get a preview of what orientation would find (uses cache if available).
    """
    pass
```

---

## Test File Structure

```
tests/
├── unit/
│   └── test_orientation.py
│       ├── test_skip_mode
│       ├── test_quick_bootstrap
│       ├── test_deep_bootstrap
│       ├── test_vocabulary_extraction
│       ├── test_entity_extraction
│       ├── test_informed_queries
│       └── test_cache_reuse
├── property/
│   └── test_orientation.py
│       ├── test_quick_completes_under_60s
│       ├── test_deep_completes_under_5min
│       ├── test_informed_queries_use_vocabulary
│       └── test_extracts_insider_terms
└── integration/
    ├── test_orientation_api.py
    └── test_orientation_search.py
```
