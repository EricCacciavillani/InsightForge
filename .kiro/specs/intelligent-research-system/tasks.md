# Implementation Plan

## Phase Overview

This implementation is organized into 5 phases for better tracking:

| Phase | Tasks | Focus | Est. Time |
|-------|-------|-------|-----------|
| **Phase 1: Foundation** | 1-4 | Search, Distillation, Document Processing | ~8 hours |
| **Phase 2: Learning** | 5-9 | Foundation Learning (Survey, Deep Dive, Contradictions) | ~6 hours |
| **Phase 3: Hypothesis** | 10-15 | Synthesis, Self-Testing, Hypothesis Formation, Evidence | ~8 hours |
| **Phase 4: Collaboration** | 16-20 | Specialists, Agent Collaboration, Pipeline Integration | ~8 hours |
| **Phase 5: Output** | 21-55 | Reports, Diagrams, Citations, Research Modes, Advanced | ~20 hours |

---

## Phase 1: Foundation (Tasks 1-4)

- [ ] 1. Implement Smart Search Pipeline (~3 hours)
  - [ ] 1.1 Create SmartSearchPipeline class (~45 min)
    - Implement SearchConfig and ScoredPaper dataclasses
    - Add query generation using cheap LLM
    - Add bulk search for Semantic Scholar and arXiv
    - _Requirements: 0.1, 0.3_
    - **File:** `backend/search.py`
    - **Done when:**
      - SmartSearchPipeline.search(topic) returns list of ScoredPaper
      - Queries generated via LLM call
    - **Verify:** `python -c "from backend.search import SmartSearchPipeline; print('OK')"`
  - [ ] 1.2 Implement query diversity scoring (~20 min)
    - Assess diversity of generated queries
    - Regenerate if queries are too similar (diversity < 0.6)
    - _Requirements: 0.2_
    - **Verify:** `pytest tests/unit/test_search.py::test_query_diversity -v`
  - [ ] 1.3 Implement multi-model consensus scoring (~30 min)
    - Score with 2-3 cheap models (Gemini Flash, GPT-4o-mini, Claude Haiku)
    - Require 2/3 models to agree on relevance
    - Flag papers with no consensus for review
    - _Requirements: 0.5_
    - **Verify:** `pytest tests/unit/test_search.py::test_consensus_scoring -v`
  - [ ] 1.4 Implement semantic clustering for outlier detection (~30 min)
    - Cluster papers by embedding similarity
    - Flag clusters with low topic relevance as potential off-topic infiltration
    - Penalize papers in suspicious clusters
    - _Requirements: 0.13, 0.14_
    - **Verify:** `pytest tests/unit/test_search.py::test_outlier_detection -v`
  - [ ] 1.5 Implement source reputation weighting (~20 min)
    - Boost high-impact venues (Nature, Science, NeurIPS, etc.)
    - Boost highly-cited papers (500+ citations = +1.5, 100+ = +1.0)
    - Apply recency boost for 2023+ papers
    - _Requirements: 0.12_
    - **Verify:** `pytest tests/unit/test_search.py::test_reputation_weighting -v`
  - [ ] 1.6 Implement adaptive relevance threshold (~15 min)
    - 7+ for many results (30+)
    - 6+ for moderate results (10-30)
    - 5+ for niche topics (<10 results)
    - _Requirements: 0.6_
    - **Verify:** `pytest tests/unit/test_search.py::test_adaptive_threshold -v`
  - [ ] 1.7 Add Tavily fallback (manual trigger) (~15 min)
    - Only call when use_tavily_fallback=True
    - Display result count for UI button visibility
    - _Requirements: 0.4, 0.9_
    - **Verify:** `pytest tests/unit/test_search.py::test_tavily_fallback -v`
  - [ ] 1.8 Implement incremental query caching (~15 min)
    - Cache individual query results (not just topic-level)
    - Preserve cached results when regenerating queries
    - _Requirements: 0.10, 0.11_
    - **Verify:** `pytest tests/unit/test_search.py::test_query_caching -v`
  - [ ]* 1.9-1.14 Write property tests for search pipeline
    - **Property 15:** Free APIs searched before paid
    - **Property 38:** Generated queries are diverse
    - **Property 39:** Threshold adapts to result count
    - **Property 43:** Relevance requires multi-model consensus
    - **Property 44:** High-impact sources get reputation boost
    - **Property 45:** Off-topic clusters are flagged
    - **Verify:** `pytest tests/property/test_search.py -v`

- [ ] 2. Implement Document Distillation (~2 hours)
  - [ ] 2.1 Create DocumentDistiller class (~30 min)
    - Implement DistilledDocument and DistillationStats dataclasses
    - Add distill() method with LLM call
    - Add passthrough for short documents (<1000 tokens)
    - _Requirements: 0.5.1, 0.5.6, 0.5.7_
    - **File:** `backend/distillation.py`
    - **Done when:**
      - distill(document) returns DistilledDocument
      - Short docs pass through unchanged
    - **Verify:** `python -c "from backend.distillation import DocumentDistiller; print('OK')"`
  - [ ] 2.2 Implement structured extraction (~30 min)
    - Extract key_claims with quotes
    - Extract methods, results, limitations
    - _Requirements: 0.5.2, 0.5.3, 0.5.4, 0.5.5_
    - **Verify:** `pytest tests/unit/test_distillation.py::test_structured_extraction -v`
  - [ ] 2.3 Implement distillation quality validation (~20 min)
    - Check that key claims have non-empty supporting quotes
    - Re-distill with explicit quote instructions if validation fails
    - _Requirements: 0.5.9, 0.5.10_
    - **Verify:** `pytest tests/unit/test_distillation.py::test_quality_validation -v`
  - [ ] 2.4 Implement chunked distillation for long papers (~20 min)
    - Split papers >10k tokens into sections
    - Distill each section separately
    - Merge section summaries into unified output
    - _Requirements: 0.5.11, 0.5.12_
    - **Verify:** `pytest tests/unit/test_distillation.py::test_chunked_distillation -v`
  - [ ] 2.5 Implement information density scoring (~15 min)
    - Calculate density based on claims with quotes, quantitative results, methods
    - Score range 0.0-1.0
    - _Requirements: 0.5.13, 0.5.14_
    - **Verify:** `pytest tests/unit/test_distillation.py::test_density_scoring -v`
  - [ ] 2.6-2.8 Add caching, batch processing, stats tracking (~15 min)
    - **Verify:** `pytest tests/unit/test_distillation.py -v`
  - [ ]* 2.9-2.14 Write property tests for distillation
    - **Property 12:** Distilled documents are compressed
    - **Property 13:** Distillation preserves structure
    - **Property 14:** Short documents skip distillation
    - **Property 40-42:** Quality validation, chunking, density
    - **Verify:** `pytest tests/property/test_distillation.py -v`

- [ ] 3. Implement User Document Upload and Processing (~1.5 hours)
  - [ ] 3.1 Create UserDocumentProcessor class (~45 min)
    - Implement UserDocument, ExtractedComponents, CostEstimate dataclasses
    - Add upload_document() method with async processing
    - Support PDF, DOCX, TXT, MD file types
    - _Requirements: 13.1, 13.2_
    - **File:** `backend/document_processor.py`
    - **Verify:** `python -c "from backend.document_processor import UserDocumentProcessor; print('OK')"`
  - [ ] 3.2 Implement component extraction (~30 min)
    - Use LLM to extract primary topics, sub-components, key concepts
    - Generate research questions from user content
    - Calculate complexity score
    - _Requirements: 13.3, 13.4_
    - **Verify:** `pytest tests/unit/test_document_processor.py::test_component_extraction -v`
  - [ ] 3.3 Implement cost estimation (~15 min)
    - Calculate costs based on complexity factors
    - Support quick/standard/thorough tiers
    - Generate min/max cost ranges
    - Flag high-cost runs
    - _Requirements: 14.1, 14.2, 14.3, 14.5_
    - **Verify:** `pytest tests/unit/test_document_processor.py::test_cost_estimation -v`
  - [ ]* 3.4-3.8 Write property tests
    - **Verify:** `pytest tests/property/test_document_processor.py -v`

- [ ] 4. Checkpoint - Ensure search, distillation, and document processing tests pass
  - **Pre-flight:** Ensure Tasks 1-3 are complete
  - **Unit tests:** `pytest tests/unit/test_search.py tests/unit/test_distillation.py tests/unit/test_document_processor.py -v`
  - **Property tests:** `pytest tests/property/test_search.py tests/property/test_distillation.py -v`
  - **Import check:** `python -c "from backend.search import SmartSearchPipeline; from backend.distillation import DocumentDistiller; print('OK')"`
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.

---

## Phase 2: Learning (Tasks 5-9)

- [ ] 5. Create Foundation Learning infrastructure (~1.5 hours)
  - [ ] 5.1 Add foundation learning config to config.py (~20 min)
    - Add `FOUNDATION_LEARNING_ENABLED`, survey/deep-dive settings
    - Add model routing for `foundation_learner`, `foundation_critic`
    - Add CONFIDENCE_THRESHOLD for human review (default 0.6)
    - _Requirements: 1.1, 4.2, 4.5, 4.6_
    - **File:** `backend/config.py`
    - **Verify:** `python -c "from backend.config import FOUNDATION_LEARNING_ENABLED; print('OK')"`
  - [ ] 5.2 Create FoundationKnowledge data classes (~30 min)
    - Implement Concept, VerifiedClaim, OpenDebate, OpenQuestion dataclasses
    - Implement FoundationKnowledge container class
    - Add flagged_for_human_review and human_review_reasons fields
    - _Requirements: 1.2, 1.3, 3.4, 5.3_
    - **Verify:** `python -c "from backend.foundation import FoundationKnowledge; print('OK')"`
  - [ ] 5.3-5.5 Implement Knowledge Graph structures (~30 min)
    - Create KnowledgeNode, KnowledgeEdge, KnowledgeGraph classes
    - Implement uncertainty propagation
    - _Requirements: 4.5.1-4.5.6_
    - **Verify:** `pytest tests/unit/test_knowledge_graph.py -v`
  - [ ]* 5.6-5.7 Write property tests
    - **Verify:** `pytest tests/property/test_knowledge_graph.py -v`

- [ ] 6. Implement Round 1: Broad Survey (~1 hour)
  - [ ] 6.1 Create BroadSurveyRound class (~45 min)
    - Generate survey-focused queries (include "survey", "review", "comprehensive")
    - Search academic sources
    - Extract themes and initial concepts via LLM
    - _Requirements: 1.1, 1.2, 1.3_
    - **File:** `backend/foundation.py`
    - **Done when:**
      - BroadSurveyRound.run(topic) returns themes and concepts
      - Queries include survey-related terms
    - **Verify:** `pytest tests/unit/test_foundation.py::test_broad_survey -v`
  - [ ]* 6.2-6.3 Write property tests
    - **Property 1:** Survey queries include survey terms
    - **Property 2:** Survey output contains required structure
    - **Verify:** `pytest tests/property/test_foundation.py::test_survey* -v`

- [ ] 7. Implement Round 2: Deep Dive (~1 hour)
  - [ ] 7.1 Create DeepDiveRound class (~45 min)
    - Targeted search per theme
    - Extract mechanics, tradeoffs, math details
    - _Requirements: 2.1, 2.2_
    - **Verify:** `pytest tests/unit/test_foundation.py::test_deep_dive -v`
  - [ ] 7.2 Implement claim verification (~15 min)
    - Cross-reference claims with source text
    - Find supporting quotes
    - Mark unverified claims as uncertain
    - _Requirements: 2.3, 2.4_
    - **Verify:** `pytest tests/unit/test_foundation.py::test_claim_verification -v`
  - [ ]* 7.3-7.4 Write property tests
    - **Verify:** `pytest tests/property/test_foundation.py::test_deep_dive* -v`

- [ ] 8. Implement Round 3: Contradiction Resolution (~45 min)
  - [ ] 8.1 Create ContradictionRound class (~30 min)
    - Detect contradicting claims via LLM
    - Search for resolution papers
    - Create OpenDebate for unresolved contradictions
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
    - **Verify:** `pytest tests/unit/test_foundation.py::test_contradiction_resolution -v`
  - [ ]* 8.2 Write property test
    - **Property 5:** Contradictions are handled correctly
    - **Verify:** `pytest tests/property/test_foundation.py::test_contradictions -v`

- [ ] 9. Checkpoint - Ensure foundation learning tests pass
  - **Unit tests:** `pytest tests/unit/test_foundation.py tests/unit/test_knowledge_graph.py -v`
  - **Property tests:** `pytest tests/property/test_foundation.py tests/property/test_knowledge_graph.py -v`
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.

---

## Phase 3: Hypothesis (Tasks 10-15)

- [ ] 10. Implement Round 4: Synthesis and Critique (~1.5 hours)
  - [ ] 10.1 Create SynthesisRound class (~30 min)
    - Write comprehensive explainer from knowledge
    - Build knowledge graph from concepts and claims
    - _Requirements: 4.1, 4.5.1_
    - **Verify:** `pytest tests/unit/test_synthesis.py::test_synthesis_round -v`
  - [ ] 10.2 Implement critique with different model (~20 min)
    - Route critique to different model than writer
    - Identify gaps, oversimplifications, errors
    - _Requirements: 4.2_
    - **Verify:** `pytest tests/unit/test_synthesis.py::test_critique -v`
  - [ ] 10.3 Implement revision loop with escape hatch (~30 min)
    - Max 2 iterations of critique/revision
    - Targeted search for critique issues
    - _Requirements: 4.3, 4.4_
    - **Verify:** `pytest tests/unit/test_synthesis.py::test_revision_loop -v`
  - [ ] 10.4 Implement human review escape hatch (~15 min)
    - Flag for human review if confidence < 0.6 after 2 iterations
    - Present specific low-confidence areas to user
    - _Requirements: 4.5, 4.6_
    - **Verify:** `pytest tests/unit/test_synthesis.py::test_human_review_trigger -v`
  - [ ]* 10.5-10.6 Write property tests
    - **Verify:** `pytest tests/property/test_synthesis.py -v`

- [ ] 11. Implement Round 5: Self-Testing (~45 min)
  - [ ] 11.1 Create SelfTestRound class (~30 min)
    - Generate key questions about topic
    - Answer without re-reading sources
    - Calculate confidence scores
    - _Requirements: 5.1, 5.2, 5.4_
    - **Verify:** `pytest tests/unit/test_self_test.py -v`
  - [ ] 11.2 Implement open question detection (~15 min)
    - Mark uncertain answers as open questions
    - Include uncertainty reason
    - _Requirements: 5.3_
    - **Verify:** `pytest tests/unit/test_self_test.py::test_open_questions -v`
  - [ ]* 11.3 Write property test
    - **Verify:** `pytest tests/property/test_self_test.py -v`

- [ ] 12. Implement Hypothesis Formation (~2 hours)
  - [ ] 12.1 Create HypothesisFormer class with dynamic positioning (~30 min)
    - Accept foundation knowledge as input
    - Generate hypotheses with research questions
    - Adopt positions based on evidence strength
    - _Requirements: 6.1, 6.5_
    - **File:** `backend/hypothesis.py`
    - **Verify:** `pytest tests/unit/test_hypothesis.py::test_hypothesis_formation -v`
  - [ ] 12.2 Implement three agent roles (~30 min)
    - Agent A (Evidence-Based): Strong supporting evidence
    - Agent B (Risk-Aware): Limitations and failure modes
    - Agent C (Synthesis): Novel insights
    - _Requirements: 6.2, 6.3, 6.4_
    - **Verify:** `pytest tests/unit/test_hypothesis.py::test_agent_roles -v`
  - [ ] 12.3-12.5 Implement dependency tracking, cascade re-evaluation, dynamic updates (~45 min)
    - _Requirements: 6.7, 6.8, 6.9_
    - **Verify:** `pytest tests/unit/test_hypothesis.py -v`
  - [ ]* 12.6-12.11 Write property tests
    - **Verify:** `pytest tests/property/test_hypothesis.py -v`

- [ ] 13. Checkpoint - Ensure hypothesis tests pass
  - **Unit tests:** `pytest tests/unit/test_synthesis.py tests/unit/test_self_test.py tests/unit/test_hypothesis.py -v`
  - **Property tests:** `pytest tests/property/test_synthesis.py tests/property/test_hypothesis.py -v`
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.

---

## Phase 4: Collaboration (Tasks 14-20)

- [ ] 14. Implement Evidence Gathering (~1 hour)
  - [ ] 14.1 Create EvidenceGatherer class (~45 min)
    - Search using agent's research questions
    - Analyze if evidence supports or contradicts hypothesis
    - _Requirements: 7.1, 7.2, 7.4_
    - **File:** `backend/evidence.py`
    - **Verify:** `pytest tests/unit/test_evidence.py -v`
  - [ ] 14.2 Implement cross-agent deduplication (~15 min)
    - Track URLs across both agents
    - Skip duplicates
    - _Requirements: 7.3_
    - **Verify:** `pytest tests/unit/test_evidence.py::test_deduplication -v`
  - [ ]* 14.3 Write property test
    - **Verify:** `pytest tests/property/test_evidence.py -v`

- [ ] 15. Implement Evidence-Based Debate (~1 hour)
  - [ ] 15.1 Create EvidenceBasedDebater class (~45 min)
    - Require citations for all claims
    - Mark unsupported claims as speculation
    - _Requirements: 8.1, 8.2, 8.4_
    - **File:** `backend/debate.py`
    - **Verify:** `pytest tests/unit/test_debate.py -v`
  - [ ] 15.2 Implement counter-evidence handling (~15 min)
    - Include counter-evidence in arguments
    - _Requirements: 8.3_
    - **Verify:** `pytest tests/unit/test_debate.py::test_counter_evidence -v`
  - [ ]* 15.3 Write property test
    - **Verify:** `pytest tests/property/test_debate.py -v`

- [ ] 16. Implement Specialist Subagents (~2 hours)
  - [ ] 16.1 Create SubagentConfig and SubagentOrchestrator classes (~45 min)
    - Define 4 specialists: Methods, Risks, Integration, Cost
    - Configure model routing per specialist
    - _Requirements: 9.1, 9.2_
    - **File:** `backend/specialists.py`
    - **Verify:** `pytest tests/unit/test_specialists.py -v`
  - [ ] 16.2 Implement parallel specialist execution (~30 min)
    - Run all 4 specialists in parallel with ThreadPoolExecutor
    - Filter papers by specialist focus areas
    - _Requirements: 9.1, 9.3_
    - **Verify:** `pytest tests/unit/test_specialists.py::test_parallel_execution -v`
  - [ ] 16.3 Implement findings synthesis (~30 min)
    - Merge findings across specialists
    - Deduplicate by semantic similarity
    - Attribute concerns to source specialists
    - _Requirements: 9.4, 9.5_
    - **Verify:** `pytest tests/unit/test_specialists.py::test_synthesis -v`
  - [ ]* 16.4-16.6 Write property tests
    - **Verify:** `pytest tests/property/test_specialists.py -v`

- [ ] 17. Implement Agent Collaboration (~2 hours)
  - [ ] 17.1 Create AgentMessage and AgentCollaborationHub classes (~30 min)
    - Support message types: finding, question, challenge, request, response
    - Track all messages for transparency
    - _Requirements: 10.9_
    - **File:** `backend/collaboration.py`
    - **Verify:** `pytest tests/unit/test_collaboration.py -v`
  - [ ] 17.2-17.5 Implement broadcast filtering, consensus tracking, challenge-response, request_research (~1 hour)
    - _Requirements: 10.1-10.8_
    - **Verify:** `pytest tests/unit/test_collaboration.py -v`
  - [ ]* 17.6-17.9 Write property tests
    - **Verify:** `pytest tests/property/test_collaboration.py -v`

- [ ] 18. Checkpoint - Ensure subagent and collaboration tests pass
  - **Unit tests:** `pytest tests/unit/test_evidence.py tests/unit/test_debate.py tests/unit/test_specialists.py tests/unit/test_collaboration.py -v`
  - **Property tests:** `pytest tests/property/test_evidence.py tests/property/test_debate.py tests/property/test_specialists.py tests/property/test_collaboration.py -v`
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.

---

## Phase 5: Output (Tasks 19-55)

- [ ] 19. Integrate into orchestrator pipeline (~2 hours)
  - [ ] 19.1-19.8 Wire all components into orchestrator
    - Replace current search with SmartSearchPipeline
    - Wire DocumentDistiller after search
    - Replace current deep_research_round
    - Update research rounds to use evidence
    - Update debate to require citations
    - Wire SubagentOrchestrator
    - Wire AgentCollaborationHub
    - Add checkpointing for foundation learning
    - **File:** `backend/orchestrator.py`
    - **Verify:** Run full pipeline with new components
    - **Rollback:** `git checkout backend/orchestrator.py`

- [ ] 20. Update logging and output (~30 min)
  - [ ] 20.1-20.3 Add progress logging, save outputs, log compression stats
    - **Verify:** Run orchestrator, check logs and output files

- [ ] 21-26. Implement Report Generation (~6 hours total)
  - PDF Report, Executive Summaries, Diagrams, LaTeX, Code Examples, Citations
  - Each task follows pattern: create class, implement features, write tests
  - **Verify:** `pytest tests/unit/test_reports.py -v`

- [ ] 27-28. Implement Research Modes and Follow-Up Questions (~2 hours)
  - LEARN, BUILD, COMPARE, EXPLORE modes
  - Mode-specific questions and filtering
  - **Verify:** `pytest tests/unit/test_research_modes.py -v`

- [ ] 29-30. Context-Aware Filtering and Checkpoint (~1 hour)
  - **Verify:** `pytest tests/ -v`

- [ ] 31-55. Advanced Features (~10 hours total)
  - Query Effectiveness Feedback, Conditional Claims, Distillation Validation
  - Adaptive Iteration, Stratified Confidence, Depth Signaling
  - Steelman Requirement, Gaps Specialist, Confidence Weighting
  - Cross-Specialist Validation, Disagreement Metrics, Confidence Visualization
  - Multi-Format Export, Iterative Refinement, Mode Blending
  - Citation Chain Analysis, Temporal Knowledge Layering
  - Cost Circuit Breakers, Progressive Disclosure, Decision Trace Logging
  - Surprising Findings, Blind Red Teaming, Confidence Checkpoints
  - Each follows pattern: create class, implement, test
  - **Verify:** `pytest tests/unit/test_advanced_*.py -v`

- [ ] 55. Final Checkpoint - Ensure all new features pass
  - **All unit tests:** `pytest tests/unit/ -v`
  - **All property tests:** `pytest tests/property/ -v --hypothesis-show-statistics`
  - **Coverage:** `pytest tests/ --cov=backend --cov-fail-under=80`
  - **Integration test:** Run full pipeline end-to-end
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.
  - **Rollback:** `git checkout backend/` if new features break core pipeline
