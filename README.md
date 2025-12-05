# InsightForge – Multi-Agent Research Orchestrator

A GPT-5.1 + Gemini orchestrator with an Electron desktop app for automated deep research.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Electron Desktop App                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    React Frontend                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │  Dashboard  │  │    Run      │  │    Results      │   │  │
│  │  │  - Stats    │  │ Orchestrator│  │    Browser      │   │  │
│  │  │  - Runs     │  │  - Live logs│  │  - Tree view    │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  │                         │                                 │  │
│  │              useApi.ts (REST + WebSocket)                 │  │
│  └───────────────────────────┬───────────────────────────────┘  │
│                              │                                  │
│              HTTP :8742      │      WebSocket /ws               │
│                              ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   FastAPI Backend                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │  REST API   │  │  WebSocket  │  │   Checkpoint    │   │  │
│  │  │  Endpoints  │  │  Broadcast  │  │   Manager       │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │  │
│  │         │                │                  │             │  │
│  │         └────────────────┼──────────────────┘             │  │
│  │                          ▼                                │  │
│  │  ┌───────────────────────────────────────────────────┐   │  │
│  │  │              Python Orchestrator                   │   │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐           │   │  │
│  │  │  │ Agent A │  │ Agent B │  │ Debate  │           │   │  │
│  │  │  │ (GPT-5) │  │(Gemini) │  │ System  │           │   │  │
│  │  │  └────┬────┘  └────┬────┘  └────┬────┘           │   │  │
│  │  │       │            │            │                 │   │  │
│  │  │       └────────────┼────────────┘                 │   │  │
│  │  │                    ▼                              │   │  │
│  │  │  ┌─────────────────────────────────────────────┐ │   │  │
│  │  │  │ Reviewers → Paper → Critics → Meta-debate   │ │   │  │
│  │  │  │ → Meta-review → Final Arbiter → Arch Spec   │ │   │  │
│  │  │  └─────────────────────────────────────────────┘ │   │  │
│  │  └───────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│         ┌─────────┐    ┌─────────┐    ┌─────────────┐          │
│         │ OpenAI  │    │ Gemini  │    │   Tavily    │          │
│         │ GPT-5.1 │    │   3.0   │    │ Web Search  │          │
│         └─────────┘    └─────────┘    └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
insightforge/
├── api/
│   └── server.py           # FastAPI REST + WebSocket server
├── backend/
│   ├── config.py           # Configuration and model routing
│   ├── llm_clients.py      # OpenAI/Gemini/Tavily API wrappers
│   ├── orchestrator.py     # Multi-agent research pipeline
│   ├── checkpoint.py       # Resume support for failed runs
│   ├── notifications.py    # Email notification service
│   └── utils.py            # Helper functions
├── frontend/
│   ├── electron/           # Electron main process
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── hooks/useApi.ts # API client + WebSocket hook
│   │   └── pages/          # Dashboard, Run, Results, Settings
│   └── package.json
├── tests/                  # Python backend tests
├── neura_lab_runs/         # Output directory (gitignored)
├── requirements.txt
└── environment.yml
```

## Quick Start

```bash
# 1. Create conda environment
conda env create -f environment.yml
conda activate InsightForge

# 2. Install dependencies
pip install -r requirements.txt
cd frontend && npm install && cd ..

# 3. Set API keys (create .env file)
cp .env.example .env
# Edit .env with your keys

# 4. Start backend (Terminal 1)
python -m api.server

# 5. Start frontend (Terminal 2)
cd frontend && npm run electron:dev
```

## API Reference

Base URL: `http://127.0.0.1:8742`

### Health & Configuration

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check, returns `{"status": "ok"}` |
| `/config` | GET | Current configuration and API key status |
| `/settings` | POST | Update API keys and email settings |
| `/usage` | GET | Token usage statistics and cost estimate |

### Research Runs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/run` | POST | Start new research run |
| `/resume` | POST | Resume a failed run from checkpoint |
| `/runs` | GET | List all previous runs |
| `/runs/resumable` | GET | List runs that can be resumed |
| `/runs/{component}/{timestamp}` | GET | Get detailed run results |

### Real-time Updates

| Endpoint | Type | Description |
|----------|------|-------------|
| `/ws` | WebSocket | Live updates during runs |

### Email Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/test-email` | POST | Send test email to verify configuration |

---

### Endpoint Details

#### POST /run
Start a new research run.

Request:
```json
{
  "components": ["Component Name 1", "Component Name 2"]
}
```

Response:
```json
{
  "status": "started",
  "components": ["Component Name 1", "Component Name 2"]
}
```

#### POST /resume
Resume a failed run from its checkpoint.

Request:
```json
{
  "component": "component-slug",
  "timestamp": "20241204_123456"
}
```

#### POST /settings
Update API keys and email settings.

Request:
```json
{
  "openai_key": "sk-...",
  "gemini_key": "...",
  "tavily_key": "tvly-...",
  "email_enabled": true,
  "smtp_server": "smtp.gmail.com",
  "smtp_port": 587,
  "smtp_email": "you@gmail.com",
  "smtp_password": "app-password",
  "email_recipient": "notify@example.com"
}
```

#### GET /config
Returns current configuration.

Response:
```json
{
  "deep_research_enabled": true,
  "deep_research_queries": 5,
  "parallel_enabled": true,
  "checkpoint_enabled": true,
  "model_routing": {
    "agent_a": "openai",
    "agent_b": "gemini",
    "debate": ["openai", "gemini"]
  },
  "api_keys_set": {
    "openai": true,
    "gemini": true,
    "tavily": false
  },
  "api_keys_masked": {
    "openai": "sk-...xxxx",
    "gemini": "AIza...xxxx",
    "tavily": ""
  },
  "email_settings": {
    "enabled": false,
    "configured": false
  }
}
```

#### GET /usage
Returns token usage and cost estimate.

Response:
```json
{
  "openai_input_tokens": 15000,
  "openai_output_tokens": 8000,
  "gemini_input_tokens": 12000,
  "gemini_output_tokens": 6000,
  "tavily_searches": 10,
  "estimated_cost_usd": 0.85
}
```

### WebSocket Messages

Connect to `ws://127.0.0.1:8742/ws` for real-time updates.

Message types:
```typescript
// Run started
{ "type": "run_started", "components": ["..."] }

// Log message
{ "type": "log", "message": "[System] Starting component..." }

// Component completed
{ "type": "component_complete", "component": "...", "nodes": 5 }

// Run completed
{ 
  "type": "run_complete",
  "components": ["..."],
  "usage": {
    "openai_tokens": 23000,
    "gemini_tokens": 18000,
    "tavily_searches": 10,
    "estimated_cost": 0.85
  }
}

// Run error
{ "type": "run_error", "error": "...", "resumable": true }

// Run resumed
{ "type": "run_resumed", "component": "...", "timestamp": "..." }
```

---

## Configuration Options

Edit `backend/config.py` to customize behavior:

### LLM Models

| Option | Default | Description |
|--------|---------|-------------|
| `OPENAI_MODEL` | `"gpt-5.1"` | OpenAI model to use |
| `OPENAI_REASONING_EFFORT` | `"high"` | Reasoning effort: none, minimal, low, medium, high |
| `GEMINI_MODEL` | `"gemini-3.0-pro"` | Google Gemini model to use |

### Deep Research (Tavily)

| Option | Default | Description |
|--------|---------|-------------|
| `DEEP_RESEARCH_ENABLED` | `True` | Enable web/academic search |
| `DEEP_RESEARCH_QUERIES_PER_ROUND` | `5` | Search queries per research round |
| `DEEP_RESEARCH_ON_FIRST_ROUND_ONLY` | `True` | Only search on first round (saves cost) |

### Execution

| Option | Default | Description |
|--------|---------|-------------|
| `PARALLEL_ENABLED` | `True` | Run agents in parallel |
| `PARALLEL_MAX_WORKERS` | `4` | Max concurrent LLM calls |
| `CHECKPOINT_ENABLED` | `True` | Save checkpoints for resume |

### Model Routing

Controls which LLM handles each pipeline role:

```python
MODEL_ROUTING = {
    "agent_a": "openai",           # Research Agent A
    "agent_b": "gemini",           # Research Agent B
    "debate": ["openai", "gemini"], # Alternating for debates
    "reviewers": ["gemini", "openai", "gemini"],
    "paper_v1": "gemini",
    "paper_critics": ["openai", "gemini"],
    "paper_revision": "openai",
    "meta_debate": "openai",
    "final_arbiter": "openai",
    "decomposer": "openai",
    "system_architect": "openai",
    "search_queries": "openai",
}
```

---

## Environment Variables

Create a `.env` file in the project root:

```bash
# Required
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Optional - enables deep research
TAVILY_API_KEY=tvly-...

# Optional - email notifications
NEURA_EMAIL_ENABLED=true
NEURA_SMTP_SERVER=smtp.gmail.com
NEURA_SMTP_PORT=587
NEURA_SMTP_EMAIL=you@gmail.com
NEURA_SMTP_PASSWORD=your-app-password
NEURA_EMAIL_RECIPIENT=notify@example.com
```

### Obtaining API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Gemini**: https://aistudio.google.com/apikey
- **Tavily**: https://tavily.com (free tier available)

---

## Research Pipeline

The orchestrator runs a multi-stage pipeline for each component:

1. **Decomposition** - Break component into subcomponents (up to 3 levels)
2. **Research Rounds** - Agent A and B independently research (3 rounds each)
3. **Debate** - Agents debate their findings
4. **Review** - 3 reviewers evaluate the debate
5. **Paper v1** - Write initial mini-paper
6. **Critics** - 2 critics review the paper
7. **Paper Revision** - Revise based on feedback
8. **Verification** - Agents verify paper coverage
9. **Meta-debate** - Rank POC candidates, choose champion
10. **Meta-review** - 3 reviewers evaluate meta-debate
11. **Paper v2** - Final paper with POC champion
12. **Final Arbiter** - Make final decision
13. **Architecture Spec** - Generate implementation spec

After all components complete, **System Integration** synthesizes results.

---

## Testing

```bash
# Backend tests
conda activate InsightForge
pytest tests/ -v

# Frontend tests
cd frontend
npm test
```

---

## CLI Usage

Run directly without the desktop app:

```bash
conda activate InsightForge
python -m backend.orchestrator "Your Research Topic"
```

Results are saved to `neura_lab_runs/components/{topic}/{timestamp}/`.

---

## License

MIT
