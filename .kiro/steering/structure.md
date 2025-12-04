# Project Structure

```
├── api/
│   └── server.py           # FastAPI server (REST + WebSocket)
│
├── backend/
│   ├── config.py           # All configuration, MODEL_ROUTING
│   ├── llm_clients.py      # OpenAI/Gemini/Tavily API wrappers
│   ├── orchestrator.py     # Main research pipeline
│   ├── checkpoint.py       # Resume support for long runs
│   ├── notifications.py    # Webhook notifications
│   └── utils.py            # Helper functions
│
├── frontend/
│   ├── electron/
│   │   ├── main.js         # Electron main process
│   │   └── preload.js      # Preload scripts
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── hooks/
│   │   │   └── useApi.ts   # API client + WebSocket hook
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── RunOrchestrator.tsx
│   │   │   ├── Results.tsx
│   │   │   └── Settings.tsx
│   │   ├── types/          # TypeScript definitions
│   │   ├── App.tsx         # Root component with routing
│   │   └── main.tsx        # Entry point
│   └── package.json
│
├── scripts/
│   └── check-ready.py      # Readiness check script
│
├── neura_lab_runs/         # Output directory (gitignored)
│   ├── components/         # Per-component run outputs
│   └── system/             # System-level outputs
│
└── .kiro/
    ├── steering/           # AI guidance rules
    ├── hooks/              # Agent automation hooks
    └── specs/              # Feature specifications
```

## Key Integration Points

- Frontend connects to backend at `http://127.0.0.1:8742`
- WebSocket at `ws://127.0.0.1:8742/ws` for live logs
- Run outputs saved to `neura_lab_runs/` directory

## File Placement Guidelines

| Type | Location |
|------|----------|
| New React components | `frontend/src/components/` |
| New pages | `frontend/src/pages/` |
| New hooks | `frontend/src/hooks/` |
| Pipeline stages | `backend/orchestrator.py` |
| LLM integrations | `backend/llm_clients.py` |
| Configuration | `backend/config.py` |
| API endpoints | `api/server.py` |

## Planned Structure (Post-Refactor)

The orchestrator will be refactored into a modular package:

```
backend/orchestrator/
├── __init__.py          # Public exports
├── core.py              # Main orchestrator class
├── pipeline.py          # Pipeline runner
├── context.py           # Shared context between stages
├── registry.py          # Stage registry
└── stages/              # Individual pipeline stages
    ├── __init__.py
    ├── decomposer.py    # Component decomposition
    ├── research.py      # Research agent rounds
    ├── debate.py        # Agent debates
    ├── review.py        # Reviewer stages
    ├── paper.py         # Paper writing/revision
    ├── meta.py          # Meta-debate and meta-review
    ├── arbiter.py       # Final arbiter decision
    └── system.py        # System integration stages
```
