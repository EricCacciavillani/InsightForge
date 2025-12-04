# Implementation Plan

## Phase 1: Core Data Models

- [ ] 1. Create planning module structure
  - [ ] 1.1 Create backend/planning/ directory and __init__.py
    - Create directory structure for planning module
    - Export public interfaces from __init__.py
    - _Requirements: 7.1_
    - **Verify:** `python -c "from backend.planning import PlanSession; print('OK')"`

  - [ ] 1.2 Implement PlanSession and related models
    - Create models.py with PlanSession, Message, ResearchComponent, ResearchPlan dataclasses
    - Implement SessionStatus enum
    - Add type hints and docstrings
    - _Requirements: 7.1, 7.3_
    - **Verify:** `python -c "from backend.planning.models import PlanSession, SessionStatus; print('OK')"`

  - [ ] 1.3 Write property test for session serialization round-trip
    - **Property 1: Session serialization round-trip**
    - **Validates: Requirements 7.1, 7.2**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_session_roundtrip -v`

## Phase 2: Source Filtering

- [ ] 2. Implement source filtering
  - [ ] 2.1 Create SourceFilter class
    - Create source_filter.py with PRIORITY_DOMAINS and EXCLUDED_DOMAINS lists
    - Implement filter_sources() method
    - Implement _is_excluded() and _priority_score() helpers
    - _Requirements: 1.2, 1.3_
    - **Verify:** `python -c "from backend.planning.source_filter import SourceFilter; print('OK')"`

  - [ ] 2.2 Write property test for source filtering
    - **Property 2: Source filtering correctness**
    - **Validates: Requirements 1.2, 1.3**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_source_filtering -v`

## Phase 3: Cost Estimation

- [ ] 3. Implement cost estimator
  - [ ] 3.1 Create CostEstimator class
    - Create cost_estimator.py with MODEL_COSTS and TOKENS_PER_STAGE constants
    - Implement estimate_component() method using MODEL_ROUTING config
    - Support quick/standard/thorough cost tiers
    - _Requirements: 3.3, 3.4, 3.5_
    - **Verify:** `python -c "from backend.planning.cost_estimator import CostEstimator; e = CostEstimator(); print(e.estimate_component('test', 'standard'))"`

  - [ ] 3.2 Write property test for estimate fields
    - **Property 5: Plan contains required estimate fields**
    - **Validates: Requirements 3.3, 3.4, 3.5**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_estimate_fields -v`

## Phase 4: Session Persistence

- [ ] 4. Implement session storage
  - [ ] 4.1 Create SessionStore class
    - Create session_store.py with save/load/list_all methods
    - Store approved plans in neura_lab_runs/plans/
    - Store drafts in neura_lab_runs/plans/drafts/
    - _Requirements: 4.2, 4.5, 7.1_
    - **Verify:** `python -c "from backend.planning.session_store import SessionStore; s = SessionStore(); print(s.list_all())"`

  - [ ] 4.2 Implement serialization helpers
    - Handle datetime to ISO string conversion
    - Handle SessionStatus enum to string conversion
    - Handle nested dataclass serialization
    - _Requirements: 7.1, 7.3_
    - **Verify:** `pytest tests/unit/test_session_store.py -v`

  - [ ] 4.3 Write property test for serialization completeness
    - **Property 9: Serialization completeness**
    - **Validates: Requirements 7.3**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_serialization_completeness -v`

  - [ ] 4.4 Write property test for invalid JSON handling
    - **Property 10: Invalid JSON handling**
    - **Validates: Requirements 7.4**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_invalid_json -v`

- [ ] 5. Checkpoint - Verify core models and persistence
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Discovery Controller

- [ ] 6. Implement discovery logic
  - [ ] 6.1 Create DiscoveryController class
    - Create discovery.py with run_discovery() method
    - Integrate with Tavily client from llm_clients.py
    - Implement adaptive search count (3-13 based on topic complexity)
    - _Requirements: 1.1, 1.4_
    - **Verify:** `python -c "from backend.planning.discovery import DiscoveryController; print('OK')"`

  - [ ] 6.2 Implement discovery summarization
    - Use LLM to generate summary of key concepts, terminology, state of field
    - Generate 2-4 clarifying questions
    - _Requirements: 1.4, 1.5_
    - **Verify:** Mock test with sample Tavily results

  - [ ] 6.3 Write property test for discovery search bounds
    - **Property 3: Discovery search count bounds**
    - **Validates: Requirements 1.1**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_discovery_bounds -v`

## Phase 6: Conversation Controller

- [ ] 7. Implement conversation handling
  - [ ] 7.1 Create ConversationController class
    - Create conversation.py with process_message() method
    - Maintain conversation context from session history
    - Trigger additional searches when user provides context
    - _Requirements: 2.1, 2.2, 2.4_
    - **Verify:** `python -c "from backend.planning.conversation import ConversationController; print('OK')"`

  - [ ] 7.2 Implement context incorporation
    - Parse user responses for constraints and preferences
    - Update session context with extracted information
    - _Requirements: 2.1, 2.3_

  - [ ] 7.3 Write property test for conversation history preservation
    - **Property 6: Conversation history preservation**
    - **Validates: Requirements 2.4**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_history_preservation -v`

## Phase 7: Plan Generation

- [ ] 8. Implement plan generator
  - [ ] 8.1 Create PlanGenerator class
    - Create plan_generator.py with generate_plan() method
    - Use LLM to propose 2-10 components based on conversation context
    - Include research questions for each component
    - _Requirements: 3.1, 3.2_
    - **Verify:** `python -c "from backend.planning.plan_generator import PlanGenerator; print('OK')"`

  - [ ] 8.2 Integrate cost estimation into plan
    - Calculate estimates for each component
    - Sum totals for full plan
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ] 8.3 Implement plan modification
    - Allow adding/removing/editing components
    - Recalculate estimates on change
    - _Requirements: 3.6_

  - [ ] 8.4 Write property test for plan component bounds
    - **Property 4: Plan component bounds**
    - **Validates: Requirements 3.1**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_plan_bounds -v`

## Phase 8: Planning Service

- [ ] 9. Create unified PlanningService
  - [ ] 9.1 Implement PlanningService class
    - Create planning_service.py as facade for all planning operations
    - Coordinate DiscoveryController, ConversationController, PlanGenerator
    - Manage session lifecycle
    - _Requirements: 4.1, 4.4_
    - **Verify:** `python -c "from backend.planning.planning_service import PlanningService; print('OK')"`

  - [ ] 9.2 Implement plan approval
    - Lock plan on approval (set status to APPROVED)
    - Generate unique plan_id from timestamp + topic slug
    - Persist to approved plans directory
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 9.3 Write property test for approved plan immutability
    - **Property 7: Approved plan immutability**
    - **Validates: Requirements 4.1**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_approved_immutability -v`

  - [ ] 9.4 Write property test for session ID uniqueness
    - **Property 8: Session ID uniqueness**
    - **Validates: Requirements 4.1**
    - **Verify:** `pytest tests/property/test_planning_props.py::test_session_id_uniqueness -v`

- [ ] 10. Checkpoint - Verify backend planning system
  - Ensure all tests pass, ask the user if questions arise.

## Phase 9: API Endpoints

- [ ] 11. Add planning API endpoints
  - [ ] 11.1 Implement POST /plan/start
    - Create new session, begin discovery
    - Stream discovery results via WebSocket
    - _Requirements: 6.1_
    - **Verify:** `curl -X POST http://127.0.0.1:8742/plan/start -H "Content-Type: application/json" -d '{"topic":"test"}'`

  - [ ] 11.2 Implement POST /plan/chat
    - Process user message, stream response via WebSocket
    - _Requirements: 6.2_
    - **Verify:** `curl -X POST http://127.0.0.1:8742/plan/chat -H "Content-Type: application/json" -d '{"session_id":"...", "message":"test"}'`

  - [ ] 11.3 Implement POST /plan/approve
    - Lock plan, persist, return plan_id and components
    - _Requirements: 6.3_
    - **Verify:** `curl -X POST http://127.0.0.1:8742/plan/approve -H "Content-Type: application/json" -d '{"session_id":"..."}'`

  - [ ] 11.4 Implement GET /plan/{session_id}
    - Return full session state
    - Return 404 for invalid session_id
    - _Requirements: 6.4, 6.6_
    - **Verify:** `curl http://127.0.0.1:8742/plan/invalid-id` should return 404

  - [ ] 11.5 Implement GET /plans
    - Return list of all sessions (drafts and approved)
    - _Requirements: 6.5_
    - **Verify:** `curl http://127.0.0.1:8742/plans`

  - [ ] 11.6 Write API integration tests
    - Test all endpoints with mock LLM/Tavily
    - Test error cases (invalid session_id, etc.)
    - _Requirements: 6.1-6.6_
    - **Verify:** `pytest tests/integration/test_planning_api.py -v`

## Phase 10: WebSocket Streaming

- [ ] 12. Implement WebSocket streaming for planning
  - [ ] 12.1 Add planning message types to WebSocket handler
    - Add "planning_discovery", "planning_chat", "planning_plan" message types
    - Stream tokens as they're generated
    - _Requirements: 5.3, 6.1, 6.2_
    - **Verify:** Connect to ws://127.0.0.1:8742/ws and observe streaming

  - [ ] 12.2 Implement token-by-token streaming
    - Use async generator for LLM responses
    - Send each token as WebSocket message
    - _Requirements: 5.3_

## Phase 11: Frontend Planning Page

- [ ] 13. Create Planning page component
  - [ ] 13.1 Create PlanningPage.tsx
    - Add route /planning to App.tsx
    - Create basic page layout with chat area and sidebar
    - _Requirements: 5.1_
    - **Verify:** Navigate to /planning in app

  - [ ] 13.2 Implement chat interface
    - Message list with user/assistant styling
    - Input field with send button
    - Typing indicator during responses
    - _Requirements: 5.1, 5.2_

  - [ ] 13.3 Implement message streaming display
    - Connect to WebSocket for planning messages
    - Display tokens as they arrive
    - _Requirements: 5.3_

  - [ ] 13.4 Implement markdown rendering
    - Render code blocks, lists, bold, links in responses
    - _Requirements: 5.4_

- [ ] 14. Implement plan sidebar
  - [ ] 14.1 Create PlanSidebar component
    - Collapsible panel showing current plan
    - Display components with estimates
    - Show total cost and time
    - _Requirements: 5.5_

  - [ ] 14.2 Implement real-time plan updates
    - Update sidebar when plan changes via WebSocket
    - _Requirements: 5.6_

  - [ ] 14.3 Add "Approve Plan" button
    - Call POST /plan/approve
    - Navigate to /run with components pre-filled
    - _Requirements: 5.7, 4.3_

- [ ] 15. Checkpoint - Verify frontend planning flow
  - Ensure all tests pass, ask the user if questions arise.

## Phase 12: Run Orchestrator Integration

- [ ] 16. Integrate approved plans with Run Orchestrator
  - [ ] 16.1 Add plan_id query parameter support
    - RunOrchestrator.tsx reads ?plan_id=... from URL
    - Load plan components from GET /plan/{plan_id}
    - Pre-fill component list
    - _Requirements: 4.3_
    - **Verify:** Navigate to /run?plan_id=... and see components pre-filled

  - [ ] 16.2 Show plan source indicator
    - Display "From plan: {topic}" when running from approved plan
    - Link back to plan details
    - _Requirements: 4.3_

## Phase 13: Navigation and Polish

- [ ] 17. Add planning to navigation
  - [ ] 17.1 Add Planning link to Sidebar
    - Add navigation item for /planning
    - Show icon (e.g., MessageSquare from lucide-react)
    - _Requirements: 5.1_

  - [ ] 17.2 Add "New Plan" button to Dashboard
    - Quick action to start new planning session
    - _Requirements: 5.1_

  - [ ] 17.3 Show recent plans on Dashboard
    - List recent plan sessions (drafts and approved)
    - Allow resuming draft sessions
    - _Requirements: 4.5_

- [ ] 18. Final Checkpoint - Verify complete planning flow
  - Ensure all tests pass, ask the user if questions arise.
  - **End-to-end test:**
    1. Start new plan with topic
    2. See discovery results stream in
    3. Answer clarifying questions
    4. See plan proposed in sidebar
    5. Approve plan
    6. Verify redirected to Run Orchestrator with components
    7. Start run and verify it uses plan components
