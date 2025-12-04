# Deep Research Lab - Spec Overview & Implementation Order

## Master Implementation Roadmap

This document defines the correct order for implementing specs and their dependencies.

## Quick Reference: Implementation Order

```
1. testing-infrastructure     ← DO FIRST (enables all other testing)
2. connect-frontend-backend   ← Get basics working
3. orchestrator-refactor      ← Modularize before adding features
4. hierarchical-learning      ← System-wide context
5. intelligent-research-system ← Better learning
6. red-team-agent             ← Quality gate
7. research-pipeline-v2       ← Integration of 4-6
8. frontend-pipeline-visualization ← Show new features in UI
9. electron-playwright-testing ← Visual validation
10. multi-project-support     ← (parallel track, can do anytime after 2)
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION PHASES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 1: FOUNDATION (Do First)                                             │
│  ════════════════════════════════                                           │
│  ┌──────────────────────┐    ┌──────────────────────┐                       │
│  │ connect-frontend-    │    │ testing-             │                       │
│  │ backend              │    │ infrastructure       │                       │
│  │ (get basics working) │    │ (pytest + fast-check)│                       │
│  └──────────────────────┘    └──────────────────────┘                       │
│           │                            │                                     │
│           └────────────┬───────────────┘                                     │
│                        ▼                                                     │
│  PHASE 2: REFACTORING                                                        │
│  ════════════════════════                                                    │
│  ┌──────────────────────────────────────────────┐                           │
│  │ orchestrator-refactor                         │                           │
│  │ (modularize before adding features)           │                           │
│  └──────────────────────────────────────────────┘                           │
│                        │                                                     │
│                        ▼                                                     │
│  PHASE 3: RESEARCH PIPELINE V2                                               │
│  ══════════════════════════════                                              │
│  ┌──────────────────────────────────────────────┐                           │
│  │ research-pipeline-v2 (meta-spec)              │                           │
│  │ ┌────────────────┐ ┌────────────────┐        │                           │
│  │ │ hierarchical-  │ │ intelligent-   │        │                           │
│  │ │ learning       │→│ research-system│        │                           │
│  │ └────────────────┘ └────────────────┘        │                           │
│  │         │                   │                 │                           │
│  │         └─────────┬─────────┘                 │                           │
│  │                   ▼                           │                           │
│  │         ┌────────────────┐                   │                           │
│  │         │ red-team-agent │                   │                           │
│  │         └────────────────┘                   │                           │
│  └──────────────────────────────────────────────┘                           │
│                        │                                                     │
│                        ▼                                                     │
│  PHASE 4: FRONTEND UPDATES                                                   │
│  ══════════════════════════                                                  │
│  ┌──────────────────────────────────────────────┐                           │
│  │ frontend-pipeline-visualization               │                           │
│  │ (show new stages in UI)                       │                           │
│  └──────────────────────────────────────────────┘                           │
│                        │                                                     │
│                        ▼                                                     │
│  PHASE 5: VALIDATION                                                         │
│  ════════════════════════                                                    │
│  ┌──────────────────────────────────────────────┐                           │
│  │ electron-playwright-testing                   │                           │
│  │ (visual validation of everything)             │                           │
│  └──────────────────────────────────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Spec Dependencies

| Spec | Depends On | Must Complete Before |
|------|------------|---------------------|
| connect-frontend-backend | - | orchestrator-refactor |
| testing-infrastructure | - | All other specs |
| orchestrator-refactor | connect-frontend-backend | research-pipeline-v2 |
| research-pipeline-v2 | orchestrator-refactor, testing-infrastructure | frontend-pipeline-visualization |
| hierarchical-learning | orchestrator-refactor | intelligent-research-system |
| intelligent-research-system | hierarchical-learning | red-team-agent |
| red-team-agent | intelligent-research-system | frontend-pipeline-visualization |
| frontend-pipeline-visualization | research-pipeline-v2 | electron-playwright-testing |
| electron-playwright-testing | frontend-pipeline-visualization | - |
| multi-project-support | connect-frontend-backend | - (parallel track) |

## Cost Tiers

All research specs support three cost tiers:

| Tier | Foundation Rounds | Evidence Searches | Red Team | Est. Cost/Component |
|------|-------------------|-------------------|----------|---------------------|
| Quick | 2 (survey + synthesis) | 3 per agent | Skip | ~$0.50 |
| Standard | 4 (skip contradiction) | 5 per agent | Light | ~$1.50 |
| Thorough | 5 (full) | 8 per agent | Full | ~$3.00 |

## File Structure After Implementation

```
backend/
├── orchestrator/
│   ├── __init__.py
│   ├── core.py              # Main orchestrator class
│   ├── stages/
│   │   ├── __init__.py
│   │   ├── decomposer.py
│   │   ├── foundation.py    # Foundation learning
│   │   ├── hypothesis.py    # Hypothesis formation
│   │   ├── evidence.py      # Evidence gathering
│   │   ├── research.py      # Research rounds
│   │   ├── debate.py        # Evidence-based debate
│   │   ├── review.py        # Reviewers
│   │   ├── paper.py         # Paper generation
│   │   ├── red_team.py      # Red team agent
│   │   └── arbiter.py       # Final arbiter
│   ├── hierarchical/
│   │   ├── __init__.py
│   │   ├── system_survey.py
│   │   ├── relationships.py
│   │   ├── constraints.py
│   │   └── validation.py
│   └── models/
│       ├── __init__.py
│       ├── foundation.py    # FoundationKnowledge, etc.
│       ├── hypothesis.py    # Hypothesis, Evidence
│       ├── relationships.py # RelationshipMap, etc.
│       └── results.py       # Research results
├── llm_clients.py
├── config.py
├── checkpoint.py
└── utils.py

tests/
├── conftest.py
├── unit/
│   ├── test_foundation.py
│   ├── test_hypothesis.py
│   └── ...
├── property/
│   ├── test_foundation_props.py
│   ├── test_constraint_props.py
│   └── ...
└── integration/
    ├── test_pipeline.py
    └── test_hierarchical.py
```


## Spec Summaries

### Phase 1: Foundation

#### testing-infrastructure
Sets up pytest + hypothesis (Python) and vitest + fast-check (TypeScript). Provides LLM mocking utilities for fast, deterministic tests. **Must complete before any spec with property tests.**

#### connect-frontend-backend
Wires up the Electron app to the Python FastAPI backend. Basic REST + WebSocket communication.

### Phase 2: Refactoring

#### orchestrator-refactor
Transforms the monolithic 400-line orchestrator.py into a modular stage-based architecture. Each stage is a separate module with a common interface. **Must complete before adding new pipeline features.**

### Phase 3: Research Pipeline V2

#### hierarchical-learning
Adds system-wide understanding before component research:
- System Survey (understand entire domain)
- Relationship Mapping (component dependencies)
- Constraint Propagation (budget allocation)
- Interface Validation (compatibility checks)

#### intelligent-research-system
Replaces simple search with true learning:
- 5-round Foundation Learning (survey → deep dive → contradictions → synthesis → self-test)
- Hypothesis Formation (optimistic vs skeptical angles)
- Evidence Gathering (each agent searches for their own evidence)
- Evidence-Based Debate (citations required)

#### red-team-agent
Adversarial analysis before final decisions:
- Attack vectors
- Failure modes (critical/major/minor)
- Overlooked risks
- Recommendation (proceed/caution/revise/reject)

#### research-pipeline-v2 (META-SPEC)
Defines how hierarchical-learning, intelligent-research-system, and red-team-agent integrate:
- Data flow contracts
- Cost tier propagation
- Graceful degradation
- Configuration interface

### Phase 4: Frontend Updates

#### frontend-pipeline-visualization
Updates UI to show new pipeline stages:
- PipelineTimeline (all stages with status)
- FoundationViewer (what the system learned)
- HypothesisEvidence (agent comparison)
- RedTeamReport (findings and recommendations)
- RelationshipGraph (component dependencies)
- CostTracker (real-time cost)

### Phase 5: Validation

#### electron-playwright-testing
Visual testing with screenshots mapped to spec tasks:
- Screenshot capture with task IDs
- Baseline comparison
- Diff generation
- Task-linked reports

### Parallel Track

#### multi-project-support
Configurable project profiles for different research domains. Can be implemented anytime after connect-frontend-backend.

## Estimated Total Effort

| Spec | Requirements | Tasks | Est. Hours |
|------|--------------|-------|------------|
| testing-infrastructure | 10 | 16 | 6-8 |
| connect-frontend-backend | 6 | 22 | 8-10 |
| orchestrator-refactor | 6 | 13 | 8-12 |
| hierarchical-learning | 9 | 15 | 12-16 |
| intelligent-research-system | 45 | 55 | 20-28 |
| red-team-agent | 8 | 12 | 8-10 |
| research-pipeline-v2 | 12 | 15 | 8-10 |
| frontend-pipeline-visualization | 20 | 30 | 14-18 |
| electron-playwright-testing | 9 | 13 | 8-10 |
| multi-project-support | 7 | 7 | 6-8 |
| **Total** | **132** | **198** | **98-130 hours** |

## Cross-Spec Reference Table

Features that span multiple specs with their requirement/task locations:

| Feature | Backend Spec | Frontend Spec | Pipeline Spec |
|---------|--------------|---------------|---------------|
| Cost Circuit Breakers | intelligent-research-system Req 40, Task 49 | - | research-pipeline-v2 Req 9, Task 14 |
| Decision Trace Logging | intelligent-research-system Req 42, Task 51 | - | research-pipeline-v2 Req 8, Task 13 |
| Progressive Disclosure | intelligent-research-system Req 41, Task 50 | frontend-pipeline-visualization Req 15, Task 24 | - |
| Confidence Display | intelligent-research-system Req 34, Task 42 | frontend-pipeline-visualization Req 16, Task 25 | - |
| Surprising Findings | intelligent-research-system Req 43, Task 52 | frontend-pipeline-visualization Req 20, Task 29 | - |
| Red Team Integration | red-team-agent Req 1-8 | frontend-pipeline-visualization Req 14, Task 23 | research-pipeline-v2 Req 6, Task 11 |
| WebSocket Updates | connect-frontend-backend Req 3, Task 3 | frontend-pipeline-visualization Req 1, Task 1 | - |
| Cost Estimation | intelligent-research-system Req 14, Task 3.3 | frontend-pipeline-visualization Req 13, Task 22 | research-pipeline-v2 Req 9, Task 14 |

## Recommended Implementation Order (Detailed)

```
Phase 1: Core Infrastructure (Week 1-2)
├── testing-infrastructure Tasks 1-16
├── connect-frontend-backend Tasks 1-7
└── orchestrator-refactor Tasks 1-13

Phase 2: Learning & Analysis (Week 3-4)
├── hierarchical-learning Tasks 1-15
├── intelligent-research-system Tasks 1-20
└── red-team-agent Tasks 1-12

Phase 3: Advanced Features (Week 5-6)
├── intelligent-research-system Tasks 21-42
├── research-pipeline-v2 Tasks 1-15
└── frontend-pipeline-visualization Tasks 1-14

Phase 4: Polish & Validation (Week 7-8)
├── intelligent-research-system Tasks 43-55
├── frontend-pipeline-visualization Tasks 15-30
├── electron-playwright-testing Tasks 1-13
└── multi-project-support Tasks 1-7 (parallel)
```

## Recent Additions (Claude Suggestions)

The following enhancements were added based on comprehensive analysis:

### Smart Search & Distillation
- Query effectiveness feedback loop
- Conditional claims extraction with full context
- Distillation validation loop with second model
- "Lossless mode" for top-3 papers

### Foundation Learning
- Adaptive iteration with diminishing returns detection
- Stratified confidence thresholds by topic type
- Depth signaling when out of depth

### Hypothesis & Debate
- Steelman requirement before countering
- Productive disagreement metrics

### Specialists
- Gaps specialist (unexplored approaches, missing comparisons)
- Specialist confidence weighting
- Cross-specialist validation
- Two-phase execution (independent then cross-review)

### Reports & Output
- Confidence visualization/map
- Multi-format export (PDF, Markdown, Jupyter, Slides)
- Iterative refinement ("go deeper on X")
- Mode blending (weighted modes)

### Research Quality
- Citation chain analysis (detect citation laundering)
- Temporal knowledge layering (foundational vs cutting-edge)
- Surprising findings detector

### Red Team
- Blind red teaming (independent conclusions)
- Persona-based red teaming (multiple adversarial personas)
- Red team the red team (main agents can refute)

### System Robustness
- Cost circuit breakers
- Resilient pipeline with graceful degradation
- Context window management
- Decision trace logging

### User Experience
- Progressive disclosure with intervention points
- Real-time confidence display
- "Why did you..." query interface
- Output format negotiation

### Testing
- Golden dataset tests
- End-to-end smoke tests
- Chaos testing for robustness
- Human evaluation protocol

## Risk Mitigation

1. **Cost explosion**: Use cost tiers (quick/standard/thorough) to control LLM usage
2. **Complexity**: Modular architecture allows testing stages in isolation
3. **Integration issues**: Meta-spec defines clear data contracts
4. **UI lag**: WebSocket updates keep UI responsive
5. **Test flakiness**: LLM mocking ensures deterministic tests
