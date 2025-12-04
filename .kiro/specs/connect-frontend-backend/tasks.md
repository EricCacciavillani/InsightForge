# Tasks: Connect Frontend to Backend API

## Phase 1: Connection Infrastructure

- [x] **Task 1.1**: Add backend health check on app startup
  - File: `frontend/src/App.tsx`
  - Check `/health` endpoint
  - Show banner if backend not running

- [x] **Task 1.2**: Add connection status component
  - File: `frontend/src/components/ConnectionStatus.tsx`
  - Show green/red indicator
  - Display in titlebar or sidebar

## Phase 2: API Security & Environment Setup

- [ ] **Task 2.1**: Set up .gitignore for API key protection (~15 min)
  - Create comprehensive `.gitignore` file at project root
  - Exclude `.env` files, `*.env`, `.env.*` patterns
  - Exclude `neura_lab_runs/` output directory
  - Exclude Python cache, node_modules, IDE files
  - Exclude any local config files that might contain secrets
  - **Verify:** `git status` should not show .env files
  - **Rollback:** `git checkout .gitignore`

- [ ] **Task 2.2**: Implement secure API key storage (~45 min)
  - File: `api/server.py`, `backend/config.py`
  - Use python-dotenv to load keys from `.env` file
  - Create `.env.example` template (without real keys)
  - Validate API key format before accepting
  - Never log or expose full API keys in responses
  - Add rate limiting to `/settings` endpoint
  - Restrict CORS to localhost only (not wildcard)
  - **Done when:**
    - API keys loaded from .env
    - /settings returns masked keys (sk-...xxxx)
    - CORS only allows localhost origins
  - **Verify:** `curl http://127.0.0.1:8742/config` should show masked keys
  - **Rollback:** `git checkout api/server.py backend/config.py`

- [ ] **Task 2.3**: Add API input validation and security headers (~30 min)
  - File: `api/server.py`
  - Add request size limits
  - Sanitize all user inputs
  - Add security headers (X-Content-Type-Options, etc.)
  - Validate component names against allowed list
  - Add proper error handling without exposing internals
  - **Verify:** `curl -I http://127.0.0.1:8742/health` should show security headers

## Phase 3: Settings Page

- [ ] **Task 3.1**: Connect Settings to real API (~1 hour)
  - File: `frontend/src/pages/Settings.tsx`
  - Load current config from `/config`
  - Save API keys via `/settings`
  - Show success/error feedback
  - **Done when:**
    - Settings page loads current API key status
    - Save button calls /settings endpoint
    - Toast shows success/error message
  - **Verify:** Open Settings, enter API key, save, refresh - key should persist

## Phase 4: Dashboard

- [ ] **Task 4.1**: Fetch real stats (~45 min)
  - File: `frontend/src/pages/Dashboard.tsx`
  - Get usage from `/usage`
  - Get recent runs from `/runs`
  - Add loading states
  - **Done when:**
    - Dashboard shows real token usage
    - Recent runs list populated from API
    - Loading spinner while fetching
  - **Verify:** Run orchestrator, then check Dashboard shows the run

## Phase 5: Run Orchestrator

- [ ] **Task 5.1**: Connect to WebSocket for live logs (~45 min)
  - File: `frontend/src/pages/RunOrchestrator.tsx`
  - Use existing `useWebSocket` hook
  - Display real-time log messages
  - **Done when:**
    - Log panel shows live messages during run
    - Messages appear as they're emitted from backend
  - **Verify:** Start a run, watch logs appear in real-time

- [ ] **Task 5.2**: Start real runs (~1 hour)
  - Call `/run` endpoint with components
  - Handle run_started, log, run_complete, run_error events
  - Show cost estimate on completion
  - **Done when:**
    - Start button calls /run endpoint
    - Progress updates via WebSocket
    - Completion shows cost estimate
  - **Verify:** Start run with test component, verify it completes

## Phase 6: Email Notifications

- [-] **Task 6.1**: Implement email notification service (PARTIAL)
  - File: `backend/notifications.py`
  - Use SMTP with Gmail App Password or SendGrid free tier
  - Python's built-in `smtplib` + `email` modules (no extra deps)
  - Send email when each component completes
  - Include: component name, status, duration, timestamp
  - Send summary email when full run completes with cost estimate
  - HTML email template for nice formatting

- [ ] **Task 6.2**: Add email notification settings to frontend (~1 hour)
  - File: `frontend/src/pages/Settings.tsx`
  - Add toggle to enable/disable email notifications
  - Input fields: SMTP server, port, email, app password, recipient
  - "Send Test Email" button to verify setup works
  - Save email settings via `/settings` endpoint (store in .env)
  - Show setup instructions for Gmail App Password
  - **Done when:**
    - Email settings section in Settings page
    - Test email button sends test message
    - Settings persist across restarts
  - **Verify:** Configure email, click Test, check inbox

- [ ] **Task 6.3**: Integrate email notifications into orchestrator (~30 min)
  - File: `api/server.py`, `backend/orchestrator.py`
  - Call notification service on `component_complete` event
  - Call notification service on `run_complete` and `run_error` events
  - Use asyncio to send emails without blocking runs
  - Log but don't fail if email delivery fails
  - **Verify:** Run orchestrator with email enabled, check inbox for notifications

## Phase 7: Results Browser

- [ ] **Task 7.1**: Fetch real run history (~45 min)
  - File: `frontend/src/pages/Results.tsx`
  - Load from `/runs` endpoint
  - Build tree from actual data
  - **Done when:**
    - Results page shows real run history
    - Tree structure matches neura_lab_runs/ directory
  - **Verify:** Complete a run, check Results page shows it

- [ ] **Task 7.2**: View run details (~45 min)
  - Fetch from `/runs/{component}/{timestamp}`
  - Display decomposition and node results
  - Show JSON in preview panel
  - **Done when:**
    - Clicking run shows details panel
    - JSON viewer displays cycle_result.json
  - **Verify:** Click on a completed run, verify JSON displays

## Phase 8: Polish

- [ ] **Task 8.1**: Add toast notifications (~30 min)
  - Success/error messages
  - Connection status changes
  - **Verify:** Trigger success/error actions, verify toasts appear

- [ ] **Task 8.2**: Loading states everywhere (~30 min)
  - Skeleton loaders
  - Disable buttons while loading
  - **Verify:** Check all pages show loading states during fetch

## Phase 9: Automated Testing

- [ ] **Task 9.1**: Set up testing frameworks (~30 min)
  - Frontend: Add Vitest + React Testing Library to package.json
  - Backend: Add pytest to requirements.txt
  - Add test scripts: `npm test`, `pytest`
  - **Verify:** `cd frontend && npm test -- --run` and `pytest tests/`

- [ ] **Task 9.2**: Backend API unit tests (~1 hour)
  - File: `tests/test_api.py`
  - Test `/health` returns 200
  - Test `/config` returns expected structure
  - Test `/runs` returns list
  - Test `/settings` accepts valid keys
  - Mock LLM calls (don't hit real APIs in tests)
  - **Verify:** `pytest tests/test_api.py -v`

- [ ] **Task 9.3**: Backend orchestrator unit tests (~1 hour)
  - File: `tests/test_orchestrator.py`
  - Test `slugify()` function
  - Test `safe_json_load()` with valid/invalid JSON
  - Test checkpoint save/load
  - Test `get_backend()` routing logic
  - **Verify:** `pytest tests/test_orchestrator.py -v`

- [ ] **Task 9.4**: Frontend component tests (~1 hour)
  - Files: `frontend/src/__tests__/*.test.tsx`
  - Test Dashboard renders without crashing
  - Test Settings form validation
  - Test Sidebar navigation
  - Test ConnectionStatus shows correct state
  - **Verify:** `cd frontend && npm test -- --run`

- [ ] **Task 9.5**: Frontend hook tests (~45 min)
  - File: `frontend/src/__tests__/useApi.test.ts`
  - Test `fetchApi` handles errors
  - Test WebSocket reconnection logic
  - Mock fetch/WebSocket for isolation
  - **Verify:** `cd frontend && npm test -- --run src/__tests__/useApi.test.ts`

- [ ] **Task 9.6**: Integration tests (~1 hour)
  - Test full flow with mock backend
  - Start run -> receive updates -> see completion
  - Verify UI updates correctly
  - **Verify:** `cd frontend && npm test -- --run src/__tests__/integration/`

- [ ] **Task 9.7**: Add CI workflow (optional) (~30 min)
  - File: `.github/workflows/test.yml`
  - Run backend tests with pytest
  - Run frontend tests with vitest
  - Run on push and PR
  - **Verify:** Push to branch, check GitHub Actions

## Phase 10: Error Handling & Resilience

- [ ] **Task 10.1**: Graceful LLM API failures (~45 min)
  - Catch and retry on rate limits (already have backoff)
  - Save partial progress if run fails mid-way
  - Allow resuming failed runs from checkpoint
  - **Verify:** Simulate API failure, verify checkpoint saved, resume works

- [ ] **Task 10.2**: Frontend error boundaries (~30 min)
  - Add React error boundary component
  - Show friendly error page instead of white screen
  - Log errors for debugging
  - **Verify:** Throw error in component, verify error boundary catches it

- [ ] **Task 10.3**: Offline mode indicator (~30 min)
  - Detect when backend is unreachable
  - Queue actions to retry when reconnected
  - Show clear "offline" state in UI
  - **Verify:** Stop backend, verify UI shows offline state

## Phase 11: Performance & UX

- [ ] **Task 11.1**: Add run progress percentage (~45 min)
  - Calculate based on completed stages
  - Show progress bar during runs
  - Estimate time remaining
  - **Verify:** Start run, verify progress bar updates

- [ ] **Task 11.2**: Lazy load results (~30 min)
  - Don't load all JSON files upfront
  - Load on-demand when user clicks
  - Add virtualized list for large result sets
  - **Verify:** Check network tab, verify JSON loaded on click only

- [ ] **Task 11.3**: Dark/light theme toggle (~30 min)
  - Add theme switcher in settings
  - Persist preference in localStorage
  - Already have dark theme, add light variant
  - **Verify:** Toggle theme, refresh, verify persists

## Phase 12: Export & Sharing

- [ ] **Task 12.1**: Export run results (~1 hour)
  - Export as ZIP (all JSON + markdown files)
  - Export as single merged PDF/Markdown report
  - Copy shareable summary to clipboard
  - **Verify:** Export run, verify ZIP contains all files

- [ ] **Task 12.2**: Run templates (~45 min)
  - Save frequently used component lists
  - Quick-start from template
  - Import/export templates
  - **Verify:** Save template, load it, verify components populated

## Phase 13: Documentation

- [ ] **Task 13.1**: In-app help (~30 min)
  - Add tooltips explaining each feature
  - "What's this?" hover hints
  - Link to full documentation
  - **Verify:** Hover over features, verify tooltips appear

- [ ] **Task 13.2**: Developer docs (~45 min)
  - Document API endpoints
  - Document config options
  - Add architecture diagram to README
  - **Verify:** Review README, verify all endpoints documented

## Phase 14: Automated Git Integration

- [ ] **Task 14.1**: Auto-commit after research runs (~30 min)
  - Create Kiro hook triggered on run completion
  - Commit message: "research: {component} - {status}"
  - Include run output files in commit
  - **Verify:** Complete run, verify git log shows commit

- [ ] **Task 14.2**: Auto-commit on file saves (optional) (~20 min)
  - Hook triggered when code files are saved
  - Commit message: "wip: {filename}"
  - Configurable: enable/disable in settings
  - **Verify:** Save file, verify commit created

- [ ] **Task 14.3**: Auto-push option (~15 min)
  - Toggle in settings: auto-push after commits
  - Push to current branch
  - Handle push failures gracefully
  - **Verify:** Enable auto-push, complete run, verify pushed to remote

- [ ] **Task 14.4**: Git status in UI (~30 min)
  - Show current branch in header
  - Show uncommitted changes count
  - Manual commit/push buttons
  - **Verify:** Make changes, verify UI shows uncommitted count
