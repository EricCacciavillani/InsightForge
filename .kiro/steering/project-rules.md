# Deep Research Lab - Project Rules

## Quick Start

1. Install Python deps: `pip install -r requirements.txt`
2. Install frontend deps: `cd frontend && npm install`
3. Set environment variables (see "Obtaining API Keys" in tech.md):
   - `OPENAI_API_KEY` (required)
   - `GEMINI_API_KEY` (required)
   - `TAVILY_API_KEY` (optional, for deep research)
4. Start backend: `python -m api.server` (runs on port 8742)
5. Start frontend: `cd frontend && npm run dev` (runs on port 5173)
6. Or run Electron: `cd frontend && npm run electron:dev`

## Code Style

- Python: Use type hints, docstrings for public functions
- TypeScript/React: Functional components, hooks, Tailwind for styling
- Keep code minimal and clean - avoid over-engineering
- See `python-backend.md` and `react-frontend.md` for detailed rules

## When Making Changes

- Always check for TypeScript/Python errors after edits
- Use relative imports in Python (`from .config import ...`)
- Frontend components go in `frontend/src/components/`
- Pages go in `frontend/src/pages/`
- When modifying the orchestrator pipeline, update both `backend/orchestrator.py` and `api/server.py` if needed
- See `structure.md` for full project layout and file placement

## Key Integration Points

- Frontend connects to backend at `http://127.0.0.1:8742`
- WebSocket at `ws://127.0.0.1:8742/ws` for live logs
- Run outputs saved to `neura_lab_runs/` directory
- Checkpoints enable resumable runs (see `backend/checkpoint.py`)
- See `tech.md` for API endpoints and error formats

## Git Workflow

- After completing a spec task, run git commit with a descriptive message
- Commit message format: `type(scope): Task X.X - description`
- Types: feat, fix, refactor, docs, test, chore
- Example: `feat(frontend): Task 3.1 - connect Settings to real API`
- Push after committing if user has enabled auto-push
