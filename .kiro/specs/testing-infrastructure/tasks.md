# Implementation Plan

- [ ] 1. Set up Python testing framework (~1 hour)
  - [ ] 1.1 Add pytest and dependencies to requirements.txt (~10 min)
    - Add pytest, pytest-cov, pytest-asyncio, hypothesis
    - _Requirements: 1.1, 2.1_
    - **Verify:** `pip install -r requirements.txt && python -c "import pytest, hypothesis; print('OK')"`
    - **Expected output:** `OK`
  - [ ] 1.2 Create pyproject.toml test configuration (~15 min)
    - Configure pytest paths, markers, coverage settings
    - Configure hypothesis default settings
    - _Requirements: 1.1, 1.2, 2.3_
    - **Done when:**
      - pyproject.toml contains [tool.pytest.ini_options] section
      - Coverage settings target 80%+
      - Hypothesis profile configured
    - **Verify:** `pytest --collect-only`
  - [ ] 1.3 Create tests/ directory structure (~15 min)
    - Create tests/unit/, tests/property/, tests/integration/
    - Create tests/conftest.py with shared fixtures
    - Create tests/mocks/ and tests/fixtures/ directories
    - _Requirements: 6.1, 6.3_
    - **Verify:** `python -c "import tests.conftest; print('OK')"`

- [ ] 2. Implement hypothesis strategies (~45 min)
  - [ ] 2.1 Create tests/strategies.py (~20 min)
    - Implement concept_strategy for Concept dataclass
    - Implement verified_claim_strategy for VerifiedClaim
    - Implement foundation_knowledge_strategy for FoundationKnowledge
    - _Requirements: 2.2_
    - **Depends on:** Task 1.3 (tests/ directory)
    - **Verify:** `python -c "from tests.strategies import concept_strategy; print('OK')"`
  - [ ] 2.2 Add relationship strategies (~15 min)
    - Implement component_relationship_strategy
    - Implement interface_spec_strategy
    - Implement relationship_map_strategy
    - _Requirements: 2.2_
    - **Verify:** `python -c "from tests.strategies import relationship_map_strategy; print('OK')"`
  - [ ] 2.3 Write property test for strategy validity (~10 min)
    - **Property 2: Strategy generates valid objects**
    - **Validates: Requirements 2.2**
    - **Verify:** `pytest tests/property/test_strategies.py -v`
    - **Expected output:**
      ```
      tests/property/test_strategies.py::test_strategy_generates_valid_objects PASSED
      ```

- [ ] 3. Implement LLM mocking system (~1.5 hours)
  - [ ] 3.1 Create tests/mocks/llm_mock.py (~30 min)
    - Implement LLMMockRegistry class
    - Implement prompt hashing for deterministic lookups
    - Implement save/load recording functionality
    - _Requirements: 5.1, 5.2_
    - **Depends on:** Task 1.3 (tests/mocks/ directory)
    - **Done when:**
      - Registry can store and retrieve responses by prompt hash
      - Recordings can be saved to JSON and loaded back
    - **Verify:** `python -c "from tests.mocks.llm_mock import LLMMockRegistry; print('OK')"`
  - [ ] 3.2 Create MockLLMClient class (~20 min)
    - Implement call method with registry lookup
    - Implement default response generator
    - _Requirements: 5.1_
    - **Done when:**
      - MockLLMClient can be instantiated
      - `call()` returns registered response for matching prompt hash
      - `call()` returns default response when no match found
    - **Verify:** `pytest tests/mocks/test_llm_mock.py::test_mock_client -v`
  - [ ] 3.3 Create pytest fixtures for LLM mocking (~20 min)
    - Create llm_mock_registry fixture
    - Create mock_llm fixture
    - Create patch_llm_calls fixture
    - _Requirements: 5.1, 5.3_
    - **Verify:** `pytest tests/unit/test_fixtures.py -v`
  - [ ] 3.4 Write property test for mock determinism (~15 min)
    - **Property 1: Mock registry determinism**
    - **Validates: Requirements 5.1**
    - **Verify:** `pytest tests/property/test_llm_mock.py -v --hypothesis-show-statistics`
    - **Expected output:**
      ```
      tests/property/test_llm_mock.py::test_mock_determinism PASSED
      ```

- [ ] 4. Checkpoint - Verify Python test setup
  - **Pre-flight:**
    - Ensure Tasks 1.1-3.4 are complete
    - All test directories exist
  - **Unit tests:** `pytest tests/unit/ -v`
  - **Property tests:** `pytest tests/property/ -v --hypothesis-show-statistics`
  - **Import check:** `python -c "from tests.mocks.llm_mock import LLMMockRegistry, MockLLMClient; print('OK')"`
  - **Expected results:**
    - All tests pass
    - No import errors
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.

- [ ] 5. Set up TypeScript testing framework (~1 hour)
  - [ ] 5.1 Add vitest and dependencies to package.json (~15 min)
    - Add vitest, @vitest/coverage-v8, jsdom, @testing-library/react
    - Add fast-check for property testing
    - _Requirements: 3.1, 4.1_
    - **Verify:** `cd frontend && npm install && npm run test -- --run --passWithNoTests`
  - [ ] 5.2 Create vitest.config.ts (~15 min)
    - Configure test environment, coverage, setup files
    - _Requirements: 3.1, 3.4_
    - **Done when:**
      - vitest.config.ts exists with jsdom environment
      - Coverage thresholds set to 80%
    - **Verify:** `cd frontend && npx vitest --version`
  - [ ] 5.3 Create frontend/src/test/ directory structure (~15 min)
    - Create setup.ts for test initialization
    - Create test-utils.tsx for React testing helpers
    - _Requirements: 3.2, 6.1_
    - **Verify:** `cd frontend && npm run test -- --run --passWithNoTests`

- [ ] 6. Implement fast-check arbitraries (~30 min)
  - [ ] 6.1 Create frontend/src/test/arbitraries.ts (~20 min)
    - Implement researchResultArb
    - Implement foundationKnowledgeArb
    - Implement apiResponseArb
    - _Requirements: 4.2_
    - **Depends on:** Task 5.3 (test/ directory)
    - **Verify:** `cd frontend && npx tsx -e "import './src/test/arbitraries'; console.log('OK')"`
  - [ ] 6.2 Add component-specific arbitraries (~10 min)
    - Implement pipelineStageArb
    - Implement redTeamFindingArb
    - _Requirements: 4.2_
    - **Verify:** `cd frontend && npm run test -- --run src/test/arbitraries.test.ts`

- [ ] 7. Implement API mocking utilities (~30 min)
  - [ ] 7.1 Create frontend/src/test/api-mocks.ts (~30 min)
    - Implement createApiMock factory
    - Implement mockSuccess and mockError helpers
    - Implement mockWebSocket for real-time updates
    - _Requirements: 3.3_
    - **Done when:**
      - createApiMock returns mock fetch function
      - mockWebSocket simulates WS events
    - **Verify:** `cd frontend && npm run test -- --run src/test/api-mocks.test.ts`

- [ ] 8. Add npm scripts for testing (~15 min)
  - [ ] 8.1 Update package.json scripts (~15 min)
    - Add "test" script for vitest
    - Add "test:coverage" for coverage report
    - Add "test:watch" for development
    - _Requirements: 3.1, 3.4_
    - **Verify:** `cd frontend && npm run test -- --run`
    - **Expected output:**
      ```
      ✓ All tests passed
      ```

- [ ] 9. Create sample tests to verify setup (~1 hour)
  - [ ] 9.1 Create sample Python unit test (~10 min)
    - Test a simple utility function
    - Verify pytest discovers and runs it
    - _Requirements: 1.1_
    - **Verify:** `pytest tests/unit/test_sample.py -v`
    - **Expected output:**
      ```
      tests/unit/test_sample.py::test_example PASSED
      ========== 1 passed in 0.05s ==========
      ```
  - [ ] 9.2 Create sample Python property test (~15 min)
    - Test with hypothesis strategy
    - Verify 100 examples run
    - _Requirements: 2.3_
    - **Verify:** `pytest tests/property/test_sample.py -v --hypothesis-show-statistics`
    - **Expected output:**
      ```
      tests/property/test_sample.py::test_property_example PASSED
      Hypothesis calls: 100
      ```
  - [ ] 9.3 Create sample TypeScript unit test (~10 min)
    - Test a React component
    - Verify vitest discovers and runs it
    - _Requirements: 3.1, 3.2_
    - **Verify:** `cd frontend && npm run test -- --run src/__tests__/Sample.test.tsx`
  - [ ] 9.4 Create sample TypeScript property test (~15 min)
    - Test with fast-check arbitrary
    - Verify property testing works
    - _Requirements: 4.3_
    - **Verify:** `cd frontend && npm run test -- --run src/__tests__/Sample.property.test.ts`
  - [ ] 9.5 Write property test for test discovery (~10 min)
    - **Property 3: Test discovery finds all tests**
    - **Validates: Requirements 1.1, 3.1**
    - **Verify:** `pytest --collect-only && cd frontend && npm run test -- --run`

- [ ] 10. Document testing conventions (~30 min)
  - [ ] 10.1 Create tests/README.md (~30 min)
    - Document test organization
    - Document how to run tests
    - Document how to add new tests
    - Document LLM mocking usage
    - _Requirements: 6.2, 6.4_
    - **Done when:**
      - README explains directory structure
      - README has examples for each test type
      - README documents mock usage
    - **Verify:** File exists and contains all sections

- [ ] 11. Checkpoint - Verify complete setup
  - **Pre-flight:**
    - Ensure Tasks 1-10 are complete
  - **Python unit tests:** `pytest tests/unit/ -v`
  - **Python property tests:** `pytest tests/property/ -v --hypothesis-show-statistics`
  - **Python coverage:** `pytest tests/ --cov=backend --cov-fail-under=80`
  - **Frontend tests:** `cd frontend && npm run test -- --run`
  - **Frontend coverage:** `cd frontend && npm run test:coverage`
  - **Expected results:**
    - All tests pass
    - Coverage ≥ 80%
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.

- [ ] 12. Implement Golden Dataset Tests (~2 hours)
  - [ ] 12.1 Create golden dataset test framework (~1 hour)
    - Define well-researched topics with known expected findings
    - Create comparison logic for output vs expected
    - Report specific differences when output differs
    - _Requirements: 7.1, 7.2, 7.3_
    - **Depends on:** Task 11 (complete test setup)
    - **Done when:**
      - GoldenDatasetRunner class exists
      - Can load expected results from JSON
      - Comparison reports specific field differences
    - **Verify:** `pytest tests/golden/test_framework.py -v`
  - [ ] 12.2 Add initial golden datasets (~45 min)
    - Add 3-5 topics with verified expected results
    - Document how to add new golden datasets
    - _Requirements: 7.4_
    - **Verify:** `pytest tests/golden/ -v`
    - **Expected output:**
      ```
      tests/golden/test_topic_1.py PASSED
      tests/golden/test_topic_2.py PASSED
      ```
  - [ ]* 12.3 Write property test for golden dataset validation (~15 min)
    - **Property 4: Golden datasets produce expected results**
    - **Validates: Requirements 7.1-7.4**
    - **Verify:** `pytest tests/property/test_golden.py -v`

- [ ] 13. Implement End-to-End Smoke Tests (~1.5 hours)
  - [ ] 13.1 Create smoke test runner (~1 hour)
    - Execute complete mini research cycle
    - Use minimal cost tier and limited scope
    - Verify all stages execute successfully
    - _Requirements: 8.1, 8.2, 8.3_
    - **Depends on:** Task 3 (LLM mocking)
    - **Done when:**
      - SmokeTestRunner executes full pipeline with mocks
      - All stages complete without error
      - Results are valid JSON
    - **Verify:** `pytest tests/smoke/test_full_cycle.py -v`
  - [ ] 13.2 Add smoke test reporting (~20 min)
    - Report which stage failed and why
    - Track smoke test success rate over time
    - _Requirements: 8.4_
    - **Verify:** `pytest tests/smoke/ -v --tb=short`
  - [ ]* 13.3 Write property test for smoke test coverage (~10 min)
    - **Property 5: Smoke tests cover all stages**
    - **Validates: Requirements 8.1-8.4**
    - **Verify:** `pytest tests/property/test_smoke_coverage.py -v`

- [ ] 14. Implement Chaos Testing (~2 hours)
  - [ ] 14.1 Create ChaosTestRunner class (~1.5 hours)
    - Inject random API timeouts
    - Inject malformed LLM responses
    - Verify graceful degradation
    - _Requirements: 9.1, 9.2, 9.3_
    - **Depends on:** Task 3 (LLM mocking)
    - **Done when:**
      - ChaosTestRunner can inject failures at configurable rate
      - System recovers or degrades gracefully
      - Partial results are preserved
    - **Verify:** `pytest tests/chaos/test_resilience.py -v`
  - [ ] 14.2 Add chaos test reporting (~20 min)
    - Report recovery success rate
    - Verify partial results on degradation
    - _Requirements: 9.4, 9.5_
    - **Verify:** `pytest tests/chaos/ -v --tb=short`
  - [ ]* 14.3 Write property test for chaos resilience (~10 min)
    - **Property 6: System degrades gracefully under chaos**
    - **Validates: Requirements 9.1-9.5**
    - **Verify:** `pytest tests/property/test_chaos.py -v`

- [ ] 15. Implement Human Evaluation Protocol (~1 hour)
  - [ ] 15.1 Create evaluation rubric (~45 min)
    - Define criteria: accuracy, completeness, synthesis quality, usefulness
    - Create scoring interface for domain experts
    - _Requirements: 10.1, 10.2_
    - **Done when:**
      - EvaluationRubric class with scoring methods
      - CLI or web interface for scoring
    - **Verify:** `python -c "from tests.evaluation import EvaluationRubric; print('OK')"`
  - [ ] 15.2 Add evaluation tracking (~15 min)
    - Store scores for tracking over time
    - Compare scores across versions
    - _Requirements: 10.3, 10.4_
    - **Verify:** `python -c "from tests.evaluation import EvaluationTracker; print('OK')"`

- [ ] 16. Final Checkpoint - Verify advanced testing setup
  - **Pre-flight:**
    - Ensure Tasks 12-15 are complete
  - **Golden tests:** `pytest tests/golden/ -v`
  - **Smoke tests:** `pytest tests/smoke/ -v`
  - **Chaos tests:** `pytest tests/chaos/ -v`
  - **All property tests:** `pytest tests/property/ -v --hypothesis-show-statistics`
  - **Full coverage:** `pytest tests/ --cov=backend --cov-fail-under=80`
  - **Expected results:**
    - All tests pass
    - Coverage ≥ 80%
    - Chaos tests show graceful degradation
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.
  - **Rollback:** `git checkout tests/` if test infrastructure breaks existing code
