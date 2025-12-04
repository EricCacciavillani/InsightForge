# Feature: Connect Frontend to Backend API

## Overview
Connect the Electron React frontend to the FastAPI backend so the UI shows real data and can trigger actual orchestrator runs.

## Requirements

### 1. Backend Connection
- Frontend should connect to FastAPI server at `http://127.0.0.1:8742`
- WebSocket connection for live updates during runs
- Handle connection errors gracefully (show message if backend not running)

### 2. Settings Page
- Save API keys to backend via `/settings` endpoint
- Show which API keys are configured (without revealing the actual keys)
- Persist settings between sessions

### 3. Run Orchestrator Page
- Start real runs via `/run` endpoint
- Show live logs via WebSocket
- Display progress and status updates
- Show cost estimate when run completes

### 4. Results Page
- Fetch real run history from `/runs` endpoint
- Display actual decomposition and node results
- Allow viewing JSON output files

### 5. Dashboard
- Show real statistics from backend
- Display recent runs from actual data
- Show current usage/cost stats

## Acceptance Criteria
- [ ] User can enter API keys and they persist
- [ ] User can start a research run and see live progress
- [ ] User can browse previous run results
- [ ] Dashboard shows real data, not mock data
- [ ] Errors are handled gracefully with user-friendly messages
