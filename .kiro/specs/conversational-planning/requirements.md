# Requirements Document

## Introduction

This feature adds a conversational planning phase before the expensive multi-agent research pipeline runs. Instead of jumping straight into decomposition, the system first learns about the topic, understands the state of the art, proposes a scoped research plan, and gets user approval before committing to costly LLM calls. This transforms the current "dump components and run" approach into an interactive discovery process.

After approval, the plan is saved and the user is directed to the Run Orchestrator page with components pre-filled, giving them final control before execution.

## Glossary

- **Planning_System**: The conversational AI system that guides users through research planning
- **Discovery_Phase**: The initial phase where the system learns fundamentals about a topic (3-13 Tavily searches based on topic complexity)
- **Scoping_Phase**: The phase where the system proposes specific research components based on discovery
- **Research_Plan**: A structured proposal of components to research, with estimated costs
- **Plan_Session**: A conversation session tracking the planning state and history, persisted as JSON files
- **Source_Filter**: Rules that prioritize academic/authoritative sources over low-quality ones
- **Approved_Plan**: A locked plan ready for execution, stored in `neura_lab_runs/plans/`

## Requirements

### Requirement 1: Topic Discovery

**User Story:** As a researcher, I want the system to learn about my topic before proposing research, so that the research plan is informed and relevant.

#### Acceptance Criteria

1.1. WHEN a user initiates a new research session with a topic THEN the Planning_System SHALL conduct 3-13 discovery searches using Tavily based on topic complexity
1.2. WHEN conducting discovery THEN the Planning_System SHALL prioritize sources from arXiv, PubMed, Google Scholar, IEEE, ACM, and research lab blogs
1.3. WHEN conducting discovery THEN the Planning_System SHALL exclude Wikipedia, generic encyclopedias, Quora, Reddit, and blog spam from primary sources
1.4. WHEN discovery completes THEN the Planning_System SHALL present a summary containing key concepts, terminology, and current state of the field
1.5. WHEN presenting discovery results THEN the Planning_System SHALL ask 2-4 clarifying questions about the user's specific context and constraints

### Requirement 2: Conversational Refinement

**User Story:** As a researcher, I want to have a conversation to refine the research scope, so that the final plan matches my actual needs.

#### Acceptance Criteria

2.1. WHEN a user responds to clarifying questions THEN the Planning_System SHALL incorporate their answers into the research context within 5 seconds
2.2. WHEN the user provides context THEN the Planning_System SHALL conduct additional targeted searches for state-of-the-art approaches
2.3. WHEN state-of-the-art research completes THEN the Planning_System SHALL present relevant papers, approaches, and tools with source citations
2.4. WHEN presenting findings THEN the Planning_System SHALL maintain full conversation history for context continuity
2.5. WHEN the user asks follow-up questions THEN the Planning_System SHALL respond using information from previously gathered sources before conducting new searches

### Requirement 3: Plan Generation

**User Story:** As a researcher, I want to see a proposed research plan before committing, so that I can adjust scope and understand what I'm paying for.

#### Acceptance Criteria

3.1. WHEN sufficient context is gathered THEN the Planning_System SHALL generate a structured research plan with 2-10 specific components
3.2. WHEN generating a plan THEN the Planning_System SHALL organize components hierarchically with name, description, and research questions
3.3. WHEN presenting the plan THEN the Planning_System SHALL display estimated number of LLM calls per component
3.4. WHEN presenting the plan THEN the Planning_System SHALL display estimated API cost range in USD based on MODEL_ROUTING configuration
3.5. WHEN presenting the plan THEN the Planning_System SHALL display estimated runtime duration in minutes
3.6. WHEN the user requests changes THEN the Planning_System SHALL modify the plan and recalculate all estimates within 10 seconds

### Requirement 4: Plan Approval and Persistence

**User Story:** As a researcher, I want to approve the plan before research starts, so that I have control over costs and scope.

#### Acceptance Criteria

4.1. WHEN a user approves a plan THEN the Planning_System SHALL lock the plan and generate a unique plan identifier using timestamp and topic slug
4.2. WHEN a plan is approved THEN the Planning_System SHALL persist the plan as JSON to `neura_lab_runs/plans/{plan_id}.json`
4.3. WHEN a plan is approved THEN the Planning_System SHALL redirect the user to Run Orchestrator with components pre-filled
4.4. WHEN a user rejects a plan THEN the Planning_System SHALL allow continued conversation to refine the plan
4.5. IF a plan session is abandoned THEN the Planning_System SHALL retain the session in `neura_lab_runs/plans/drafts/` for later resumption

### Requirement 5: Chat Interface

**User Story:** As a researcher, I want a chat-based interface for planning, so that the interaction feels natural and iterative.

#### Acceptance Criteria

5.1. WHEN the planning page loads THEN the Frontend SHALL display a chat interface with scrollable message history
5.2. WHEN the user sends a message THEN the Frontend SHALL display the message immediately and show a typing indicator
5.3. WHEN the system responds THEN the Frontend SHALL stream tokens via WebSocket for real-time display
5.4. WHEN rendering responses THEN the Frontend SHALL format markdown including code blocks, lists, bold, and links
5.5. WHEN a plan is proposed THEN the Frontend SHALL display the plan in a collapsible sidebar panel with cost estimates
5.6. WHEN the plan changes THEN the Frontend SHALL update the sidebar panel without page refresh
5.7. WHEN the user clicks "Approve Plan" THEN the Frontend SHALL navigate to Run Orchestrator with plan components pre-populated

### Requirement 6: Planning API

**User Story:** As a developer, I want clean API endpoints for planning, so that the frontend can interact with the planning system reliably.

#### Acceptance Criteria

6.1. WHEN POST /plan/start is called with a topic THEN the API SHALL create a new plan session and begin streaming discovery results via WebSocket
6.2. WHEN POST /plan/chat is called with a message and session_id THEN the API SHALL process the message and stream the response via WebSocket
6.3. WHEN POST /plan/approve is called with a session_id THEN the API SHALL lock the plan, persist it, and return the plan_id with component list
6.4. WHEN GET /plan/{session_id} is called THEN the API SHALL return the full plan session state including message history and current plan
6.5. WHEN GET /plans is called THEN the API SHALL return a list of all plan sessions (drafts and approved)
6.6. IF an invalid session_id is provided THEN the API SHALL return a 404 error with message "Plan session not found"

### Requirement 7: Session Serialization

**User Story:** As a developer, I want plan sessions to be serializable, so that they can be persisted and resumed.

#### Acceptance Criteria

7.1. WHEN a plan session is serialized THEN the Planning_System SHALL produce valid JSON containing all session state
7.2. WHEN a plan session is deserialized THEN the Planning_System SHALL restore the exact session state including conversation history
7.3. WHEN serializing THEN the Planning_System SHALL include: session_id, topic, messages, discovered_sources, current_plan, status, timestamps
7.4. WHEN deserializing invalid JSON THEN the Planning_System SHALL raise a descriptive error without crashing
