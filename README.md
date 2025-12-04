# Research Insight – Multi-Agent Research Orchestrator

A mixed GPT-5.1 + Gemini orchestrator with an Electron desktop app for automated deep research.

## Project Structure

```
research-insight/
├── backend/                 # Python orchestrator
│   ├── config.py           # Configuration
│   ├── llm_clients.py      # LLM + search APIs
│   ├── orchestrator.py     # Main pipeline
│   ├── checkpoint.py       # Resume support
│   └── utils.py            # Helpers
├── api/                     # FastAPI server
│   └── server.py           # REST + WebSocket API
├── frontend/                # Electron + React app
│   ├── electron/           # Electron main process
│   ├── src/                # React components
│   └── package.json
├── requirements.txt
└── environment.yml
```

## Features

- Multi-agent research (GPT-5.1 + Gemini)
- Deep research with web/academic search (Tavily)
- Parallel execution for speed
- Checkpointing for resume
- Cost tracking
- Desktop app with live progress

## Setup

```bash
# Python dependencies
pip install -r requirements.txt

# Or with conda
conda env create -f environment.yml
conda activate research-insight

# Set API keys
set OPENAI_API_KEY=your-key
set GEMINI_API_KEY=your-key
set TAVILY_API_KEY=your-key
```

## Usage

### CLI
```bash
python -m backend.orchestrator "AURORA v10 fast control head"
```

### Desktop App
```bash
# Terminal 1: Start backend
python api/server.py

# Terminal 2: Start frontend
cd frontend
npm install
npm run electron:dev
```

## Configuration

Edit `backend/config.py`:
- `DEEP_RESEARCH_ENABLED` - Toggle web search
- `PARALLEL_ENABLED` - Parallel execution
- `CHECKPOINT_ENABLED` - Resume support
- `MODEL_ROUTING` - Which model handles each role
