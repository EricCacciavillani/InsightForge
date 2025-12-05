# Tasks: Multi-Project Research Support

## Git Branch Setup

**Before starting any tasks:**
```bash
git checkout -b feature/multi-project-support
```

**After completing all tasks:**
```bash
git push -u origin feature/multi-project-support
# Then create PR to merge into main
```

---

## Phase 1: Profile Data Model

- [ ] **Task 1.1**: Create profile manager (~1.5 hours)




  - File: `backend/profiles/manager.py`
  - Profile dataclass/model
  - CRUD operations (create, read, update, delete)
  - Save/load from JSON files
  - **Done when:**
    - ProfileManager class exists
    - create(), get(), update(), delete() methods work
    - Profiles saved to `profiles/` directory as JSON
  - **Verify:** `python -c "from backend.profiles.manager import ProfileManager; pm = ProfileManager(); print('OK')"`

- [ ] **Task 1.2**: Create default Neura Phase Lab profile (~30 min)
  - File: `backend/profiles/defaults/neura_phase_lab.json`
  - Move PROJECT_CONTEXT from config.py to profile
  - Include current constraints and settings
  - **Done when:**
    - JSON file contains all current PROJECT_CONTEXT fields
    - Profile includes model_routing, constraints, research_depth
  - **Verify:** `python -c "import json; print(json.load(open('backend/profiles/defaults/neura_phase_lab.json'))['name'])"`
  - **Expected output:** `Neura Phase Lab`

- [ ] **Task 1.3**: Update config.py to use profiles (~45 min)
  - Load active profile on startup
  - PROJECT_CONTEXT comes from profile
  - MODEL_ROUTING comes from profile
  - Fallback to defaults if no profile
  - **Depends on:** Task 1.1, 1.2
  - **Done when:**
    - config.py loads active profile
    - PROJECT_CONTEXT populated from profile
    - Works without profile (uses defaults)
  - **Verify:** `python -c "from backend.config import PROJECT_CONTEXT; print(PROJECT_CONTEXT['name'])"`
  - **Rollback:** `git checkout backend/config.py`

## Phase 2: Cost Estimation

- [ ] **Task 2.1**: Create cost estimator (~1 hour)
  - File: `backend/profiles/estimator.py`
  - Estimate tokens per stage
  - Calculate cost based on model pricing
  - Estimate time based on typical response times
  - **Done when:**
    - CostEstimator class exists
    - estimate(components, profile) returns { tokens, cost, time }
    - Uses MODEL_PRICING dict for cost calculation
  - **Verify:** `python -c "from backend.profiles.estimator import CostEstimator; e = CostEstimator(); print(e.estimate(['comp1'], 'standard'))"`

- [ ] **Task 2.2**: Add /estimate endpoint (~30 min)
  - File: `api/server.py`
  - POST with components list and profile
  - Return token estimate, cost, time
  - **Depends on:** Task 2.1
  - **Done when:**
    - POST /estimate accepts { components, profile_id, tier }
    - Returns { estimated_tokens, estimated_cost, estimated_time }
  - **Verify:** `curl -X POST http://127.0.0.1:8742/estimate -H "Content-Type: application/json" -d '{"components": ["test"], "tier": "quick"}'`

- [ ] **Task 2.3**: Add dry run mode (~30 min)
  - Flag in run request: `dry_run: true`
  - Returns estimation without calling APIs
  - Simulates decomposition structure
  - **Done when:**
    - POST /run with dry_run=true returns estimate only
    - No LLM calls made during dry run
  - **Verify:** `curl -X POST http://127.0.0.1:8742/run -H "Content-Type: application/json" -d '{"components": ["test"], "dry_run": true}'`

## Phase 3: Profile API Endpoints

- [ ] **Task 3.1**: Add profile CRUD endpoints (~1 hour)
  - GET /profiles - list all
  - POST /profiles - create new
  - GET /profiles/{id} - get one
  - PUT /profiles/{id} - update
  - DELETE /profiles/{id} - delete
  - **Depends on:** Task 1.1
  - **File:** `api/server.py`
  - **Verify:** 
    ```bash
    curl http://127.0.0.1:8742/profiles
    curl -X POST http://127.0.0.1:8742/profiles -H "Content-Type: application/json" -d '{"name": "Test"}'
    ```

- [ ] **Task 3.2**: Add active profile endpoints (~20 min)
  - GET /profiles/active - current profile
  - PUT /profiles/active - switch profile
  - **Done when:**
    - GET returns current active profile
    - PUT switches active profile and reloads config
  - **Verify:** `curl http://127.0.0.1:8742/profiles/active`

## Phase 4: Frontend - Profile Management

- [ ] **Task 4.1**: Profile selector component (~1 hour)
  - File: `frontend/src/components/ProfileSelector.tsx`
  - Dropdown in sidebar header
  - Shows current profile name
  - Quick switch between profiles
  - **Done when:**
    - Dropdown shows all profiles
    - Selecting profile calls PUT /profiles/active
    - UI updates to show new profile name
  - **Verify:** Open app, click profile dropdown, switch profiles

- [ ] **Task 4.2**: Profile editor modal (~1.5 hours)
  - File: `frontend/src/components/ProfileEditor.tsx`
  - Form for name, description, context
  - Constraints inputs
  - Research depth presets + custom
  - Model routing (advanced section)
  - **Done when:**
    - Modal opens from profile selector
    - All fields editable
    - Save calls PUT /profiles/{id}
  - **Verify:** Open editor, modify profile, save, verify changes persist

- [ ] **Task 4.3**: Profile list page (~1 hour)
  - File: `frontend/src/pages/Profiles.tsx`
  - List all profiles with edit/delete
  - Create new profile button
  - Import/export profiles
  - **Done when:**
    - Page shows all profiles in cards/list
    - Edit button opens ProfileEditor
    - Delete button removes profile (with confirmation)
    - Export downloads JSON, Import uploads JSON
  - **Verify:** Navigate to Profiles page, create/edit/delete profiles

## Phase 5: Frontend - Cost Estimation

- [ ] **Task 5.1**: Pre-run estimation panel (~1 hour)
  - File: `frontend/src/components/CostEstimate.tsx`
  - Show before starting run
  - Token count, cost, time estimates
  - Warning if over budget threshold
  - **Done when:**
    - Panel shows estimates from /estimate endpoint
    - Warning badge if cost > $5
    - Updates when components change
  - **Verify:** Add components to run, verify estimate updates

- [ ] **Task 5.2**: Integrate into RunOrchestrator (~30 min)
  - Call /estimate when components change
  - Show estimation panel
  - Dry run checkbox
  - Confirm before expensive runs
  - **Depends on:** Task 5.1
  - **Done when:**
    - Estimate shown below component list
    - Dry run checkbox triggers dry_run=true
    - Confirmation dialog for runs > $10
  - **Verify:** Add expensive components, verify confirmation appears

## Phase 6: Research Depth UI

- [ ] **Task 6.1**: Depth preset selector (~45 min)
  - Quick/Standard/Deep presets
  - Custom option with sliders
  - Cycles, rounds, reviewers, critics
  - **File:** `frontend/src/components/DepthSelector.tsx`
  - **Done when:**
    - Three preset buttons (Quick/Standard/Deep)
    - Custom reveals sliders for each parameter
    - Selection updates cost estimate
  - **Verify:** Select each preset, verify estimate changes

- [ ] **Task 6.2**: Stage toggles (~30 min)
  - Enable/disable: decomposition, debate, meta-debate, etc.
  - Visual pipeline diagram showing active stages
  - **Done when:**
    - Toggle switches for each stage
    - Pipeline diagram grays out disabled stages
    - Disabled stages not executed in run
  - **Verify:** Disable debate, start run, verify debate skipped

## Phase 7: Rebranding

- [ ] **Task 7.1**: Update app name and branding (~30 min)
  - New name: "Deep Research Lab" (or your choice)
  - Update package.json, window title, README
  - Update logo/icon
  - **Done when:**
    - Window title shows new name
    - package.json name updated
    - README header updated
  - **Verify:** Launch app, verify window title

- [ ] **Task 7.2**: Update documentation (~45 min)
  - README reflects general-purpose nature
  - Neura Phase Lab mentioned as example/default
  - Add examples for other domains
  - **Done when:**
    - README describes general-purpose research tool
    - Neura Phase Lab listed as example profile
    - 2-3 other domain examples mentioned
  - **Verify:** Read README, verify general-purpose messaging

- [ ] **Task 7.3**: Create example profiles (~1 hour)
  - Finance/Quant research
  - Game development
  - Scientific research
  - Software architecture
  - **File:** `backend/profiles/defaults/`
  - **Done when:**
    - 4 example profile JSON files exist
    - Each has appropriate context, constraints, model routing
  - **Verify:** `ls backend/profiles/defaults/` shows 5 profiles (including Neura)
