# Task Improvement Suggestions

## Current Task Pattern

Your tasks currently have:
- ✅ Requirements references (`_Requirements: 1.1, 2.1_`)
- ✅ Property tests (`**Property X: ...**`)
- ✅ Checkpoints ("Ensure all tests pass")

## Missing Elements to Add

### 1. Verification Commands

Add a `Verify:` line with the exact command to run after completing the task.

**Before:**
```markdown
- [ ] 1.1 Add pytest and dependencies to requirements.txt
  - Add pytest, pytest-cov, pytest-asyncio, hypothesis
  - _Requirements: 1.1, 2.1_
```

**After:**
```markdown
- [ ] 1.1 Add pytest and dependencies to requirements.txt
  - Add pytest, pytest-cov, pytest-asyncio, hypothesis
  - _Requirements: 1.1, 2.1_
  - **Verify:** `pip install -r requirements.txt && python -c "import pytest, hypothesis; print('OK')"`
```

---

### 2. Success Criteria ("Done When")

Add explicit completion criteria so there's no ambiguity.

**Before:**
```markdown
- [ ] 2.2 Create MockLLMClient class
  - Implement call method with registry lookup
  - Implement default response generator
  - _Requirements: 5.1_
```

**After:**
```markdown
- [ ] 2.2 Create MockLLMClient class
  - Implement call method with registry lookup
  - Implement default response generator
  - _Requirements: 5.1_
  - **Done when:**
    - MockLLMClient can be instantiated
    - `call()` returns registered response for matching prompt hash
    - `call()` returns default response when no match found
  - **Verify:** `pytest tests/mocks/test_llm_mock.py -v`
```

---

### 3. Expected Output

Show what success looks like so the user knows if it's working.

**Before:**
```markdown
- [ ] 9.1 Create sample Python unit test
  - Test a simple utility function
  - Verify pytest discovers and runs it
  - _Requirements: 1.1_
```

**After:**
```markdown
- [ ] 9.1 Create sample Python unit test
  - Test a simple utility function
  - Verify pytest discovers and runs it
  - _Requirements: 1.1_
  - **Verify:** `pytest tests/unit/test_sample.py -v`
  - **Expected output:**
    ```
    tests/unit/test_sample.py::test_example PASSED
    ========== 1 passed in 0.05s ==========
    ```
```

---

### 4. Explicit Dependencies

Make task dependencies crystal clear.

**Before:**
```markdown
- [ ] 7.1 Create DecomposerStage
  - Extract decomposer logic from orchestrator.py
  - Implement Stage interface
  - Register with @register_stage
  - _Requirements: 1.1, 6.1_
```

**After:**
```markdown
- [ ] 7.1 Create DecomposerStage
  - Extract decomposer logic from orchestrator.py
  - Implement Stage interface
  - Register with @register_stage
  - _Requirements: 1.1, 6.1_
  - **Depends on:** Task 2.1 (Stage base class), Task 4.2 (@register_stage decorator)
  - **Verify:** `python -c "from backend.orchestrator.stages import DecomposerStage; print('OK')"`
```

---

### 5. Rollback Instructions

What to do if the task breaks something.

**Before:**
```markdown
- [ ] 12.1 Update backend/__init__.py
  - Export new Orchestrator class
  - _Requirements: 6.2_
```

**After:**
```markdown
- [ ] 12.1 Update backend/__init__.py
  - Export new Orchestrator class
  - _Requirements: 6.2_
  - **Verify:** `python -c "from backend import Orchestrator; print('OK')"`
  - **Rollback:** `git checkout backend/__init__.py` if imports break
```

---

### 6. Time Estimates

Help with planning by adding rough estimates.

**Before:**
```markdown
- [ ] 3.1 Add Red Team stage to run_component_node_pipeline
  - Insert after meta-reviewers, before final arbiter
  - Use CheckpointManager for resumability
  - Skip if RED_TEAM_ENABLED = False
  - _Requirements: 1.1, 5.4_
```

**After:**
```markdown
- [ ] 3.1 Add Red Team stage to run_component_node_pipeline (~30 min)
  - Insert after meta-reviewers, before final arbiter
  - Use CheckpointManager for resumability
  - Skip if RED_TEAM_ENABLED = False
  - _Requirements: 1.1, 5.4_
  - **Verify:** Run orchestrator with RED_TEAM_ENABLED=True, check logs show "[Red Team]" stage
```

---

### 7. Integration Test Commands

For larger tasks, add integration-level verification.

**Before:**
```markdown
- [ ] 8. Checkpoint - Verify stage migration
  - Ensure all tests pass, ask the user if questions arise.
```

**After:**
```markdown
- [ ] 8. Checkpoint - Verify stage migration
  - **Run all unit tests:** `pytest tests/unit/ -v`
  - **Run stage integration tests:** `pytest tests/integration/test_stages.py -v`
  - **Run backward compatibility test:** `pytest tests/integration/test_backward_compat.py -v`
  - **Expected:** All tests pass, no import errors
  - If tests fail, review error messages and fix before proceeding.
```

---

## Enhanced Checkpoint Pattern

Replace vague checkpoints with specific verification steps:

**Before:**
```markdown
- [ ] 4. Checkpoint - Verify core abstractions
  - Ensure all tests pass, ask the user if questions arise.
```

**After:**
```markdown
- [ ] 4. Checkpoint - Verify core abstractions
  - **Unit tests:** `pytest tests/unit/orchestrator/ -v`
  - **Property tests:** `pytest tests/property/ -v --hypothesis-show-statistics`
  - **Type check:** `mypy backend/orchestrator/ --strict`
  - **Import check:** `python -c "from backend.orchestrator import Stage, PipelineContext, StageRegistry; print('All imports OK')"`
  - **Coverage check:** `pytest tests/ --cov=backend/orchestrator --cov-fail-under=80`
  - **Expected results:**
    - All tests pass
    - No type errors
    - Coverage ≥ 80%
  - **If failing:** Review test output, fix issues, re-run checkpoint before continuing.
```

---

## Example: Fully Enhanced Task

Here's a complete example of an enhanced task:

```markdown
- [ ] 2.2 Create `run_red_team` function (~45 min)
  - Accept component, agent proposals, debate, paper, meta-debate as input
  - Call LLM with appropriate intensity prompt
  - Parse and validate JSON output
  - Ensure minimum 3 failure modes (or log warning)
  - _Requirements: 1.2, 1.3, 2.1_
  - **Depends on:** Task 2.1 (Red Team prompts)
  - **File:** `backend/orchestrator.py` or `backend/red_team.py`
  - **Done when:**
    - Function accepts all required inputs
    - Returns valid RedTeamResult with failure_modes, vulnerability_score, recommendation
    - Logs warning if <3 failure modes found
    - Handles LLM errors gracefully (retry, then fail with clear error)
  - **Verify:**
    ```bash
    # Unit test
    pytest tests/unit/test_red_team.py::test_run_red_team -v

    # Manual smoke test
    python -c "
    from backend.red_team import run_red_team
    result = run_red_team('openai', 'test_component', {}, {}, '', '', '')
    print(f'Score: {result[\"vulnerability_score\"]}, Modes: {len(result[\"failure_modes\"])}')
    "
    ```
  - **Expected output:**
    ```
    tests/unit/test_red_team.py::test_run_red_team PASSED
    Score: 0.3, Modes: 5
    ```
  - **Rollback:** If function breaks orchestrator, revert with `git checkout backend/orchestrator.py`
```

---

## Additional Patterns to Add

### A. Pre-flight Check

Add at the start of complex tasks:

```markdown
- [ ] 7.1 Create DecomposerStage
  - **Pre-flight:**
    - Ensure Task 2.1 (Stage base class) is complete
    - Ensure `backend/orchestrator/stages/` directory exists
    - Run `pytest tests/unit/` to confirm no existing failures
  - ... rest of task
```

### B. Post-task Cleanup

Add cleanup steps where relevant:

```markdown
- [ ] 12.3 Keep old orchestrator.py as deprecated
  - Add deprecation warning
  - Forward to new implementation
  - _Requirements: 6.2_
  - **Verify:** `python -c "from backend.orchestrator import run_decomposer" 2>&1 | grep -q "DeprecationWarning"`
  - **Cleanup:** After 2 releases, create task to delete old file
```

### C. Documentation Check

Remind to update docs:

```markdown
- [ ] 9.2 Implement run() method
  - Create PipelineContext
  - Execute pipeline
  - Return results
  - _Requirements: 2.2, 6.1_
  - **Verify:** `pytest tests/unit/test_orchestrator.py::test_run -v`
  - **Docs:** Update `README.md` usage example if API changed
```

### D. Error Scenario Testing

Add negative test cases:

```markdown
- [ ] 6.1 Add logic to detect unaddressed critical flaws
  - Check if Red Team found critical severity items
  - Check if arbiter's critical_flaws_addressed is False
  - Force needs_more_research judgement if unaddressed
  - _Requirements: 4.4_
  - **Verify (happy path):** `pytest tests/unit/test_critical_flaws.py::test_addressed_flaws_pass -v`
  - **Verify (error case):** `pytest tests/unit/test_critical_flaws.py::test_unaddressed_flaws_force_revision -v`
  - **Verify (edge case):** `pytest tests/unit/test_critical_flaws.py::test_no_critical_flaws_pass -v`
```

---

## Template for New Tasks

Use this template when creating new tasks:

```markdown
- [ ] X.X Task title (~estimated time)
  - Bullet point describing what to do
  - Another bullet point with more detail
  - _Requirements: X.X, Y.Y_
  - **Depends on:** Task A.B (if any)
  - **File(s):** `path/to/file.py`
  - **Done when:**
    - Specific completion criterion 1
    - Specific completion criterion 2
  - **Verify:**
    ```bash
    command to verify task is complete
    ```
  - **Expected output:**
    ```
    What you should see if it worked
    ```
  - **Rollback:** How to undo if it breaks something
  - **Docs:** What documentation to update (if any)
```

---

## Summary of Additions

| Addition | Purpose | When to Use |
|----------|---------|-------------|
| `**Verify:**` | Command to confirm task is done | Every task |
| `**Done when:**` | Explicit success criteria | Complex tasks |
| `**Expected output:**` | What success looks like | Tests, commands |
| `**Depends on:**` | Task prerequisites | Tasks with dependencies |
| `**Rollback:**` | How to undo | Risky changes |
| `**Pre-flight:**` | Checks before starting | Complex tasks |
| `**Cleanup:**` | Post-task housekeeping | Migrations, deprecations |
| `**Docs:**` | Documentation updates | API changes |
| `(~time)` | Time estimate | All tasks |
