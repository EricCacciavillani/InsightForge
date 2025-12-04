# .kiro Directory Review & Suggestions

## Quick Wins: Delete Deprecated Hooks

These 7 hooks are marked deprecated and add confusion. Consider deleting them:

| File | Replaced By |
|------|-------------|
| `block-api-key-uploads.kiro.hook` | `security-check.kiro.hook` |
| `security-scanner.kiro.hook` | `security-check.kiro.hook` |
| `eslint-frontend.kiro.hook` | `frontend-quality.kiro.hook` |
| `typecheck-frontend.kiro.hook` | `frontend-quality.kiro.hook` |
| `format-python.kiro.hook` | `python-quality.kiro.hook` |
| `lint-python.kiro.hook` | `python-quality.kiro.hook` |
| `validate-python.kiro.hook` | `python-quality.kiro.hook` |

---

## High Priority Fixes

### 1. `security-check.kiro.hook` - No Severity Levels

**Problem:** All issues are treated equally. Hardcoded API key = same as using HTTP.

**Suggested Fix:** Add severity tiers to the prompt:

```
CRITICAL (block commit):
- Hardcoded API keys, passwords, tokens
- Private keys or certificates

WARNING (alert but allow):
- SQL injection patterns
- Command injection patterns
- Unsafe eval/exec usage

INFO (log only):
- HTTP instead of HTTPS
- Unvalidated redirects
```

---

### 2. `auto-push.kiro.hook` - Silent Failures

**Problem:** Current command `git push || echo 'Push failed'` just prints and continues silently.

**Suggested Fix:**
```json
{
  "command": "git push || exit 1"
}
```

This fails loudly so the agent knows push didn't succeed.

---

### 3. `python-backend.md` - Too Sparse

**Current:** Only 6 bullet points of guidance.

**Missing Sections to Add:**

```markdown
## Async Patterns
- Use asyncio.gather() for parallel LLM calls
- Always set timeouts on external API calls
- Wrap API calls in try/except with specific error handling

## LLM Integration
- Use clients from llm_clients.py (never call APIs directly)
- Always validate JSON responses before using
- Log token counts for cost tracking

## Error Handling
- Raise specific exceptions (ValueError, RuntimeError, etc.)
- Never silently catch exceptions - log at minimum
- Provide context in error messages

## Logging
- Use logging module (import logging; logger = logging.getLogger(__name__))
- INFO: pipeline milestones (stage start/complete)
- DEBUG: intermediate results, API calls
- WARNING: retries, fallbacks
- ERROR: failures requiring user attention

## Testing
- Unit tests for all public functions
- Mock external APIs using fixtures in conftest.py
- Use pytest.mark.asyncio for async tests
```

---

### 4. `react-frontend.md` - Too Sparse

**Current:** Only 5 bullet points of guidance.

**Missing Sections to Add:**

```markdown
## Component Structure
- Max ~200 lines per component; split if larger
- Props should be <8 items; use object destructuring
- One responsibility per component

## State Management
- Use useState for local state
- Use context (useApi hook) for global API state
- Lift state up only when needed by siblings

## API Integration
- All API calls through useApi hook
- Handle loading state: show spinner while fetching
- Handle error state: show error message with retry button
- Handle empty state: show placeholder before data arrives

## Error Handling
- Wrap components in ErrorBoundary for crash protection
- Display user-friendly error messages
- Log errors for debugging but don't expose to user

## Accessibility
- Use semantic HTML (button, section, nav, etc.)
- Include alt text for images
- Ensure keyboard navigation works
- Use aria-labels for screen readers

## Testing
- Unit tests for utilities and hooks
- Component tests using React Testing Library
- Mock useApi hook responses in tests

## TypeScript
- Define component props as interface Props { ... }
- Use function components: const MyComponent: React.FC<Props> = ({ ... }) => {}
```

---

## Medium Priority Fixes

### `auto-commit.kiro.hook`

**Issues:**
- Commit message `"auto: agent changes"` doesn't follow Conventional Commits format
- `--allow-empty` flag masks errors

**Suggested Fix:**
```json
{
  "command": "git add -A && git commit -m 'chore(auto): Agent-generated changes'"
}
```

Remove `--allow-empty` so it fails naturally if nothing to commit.

---

### `preflight-check.kiro.hook`

**Issue:** Name says "preflight" (before start) but runs *after* agent response.

**Suggested Fix:** Either:
- Rename to `environment-verification.kiro.hook`
- Or change trigger to run before agent starts (if supported)

---

### `check-api-keys.kiro.hook`

**Issues:**
- Grammar error: "NEVER allow them to uploaded ever" → "NEVER allow them to be uploaded"
- Limited scope: only checks 3 specific keys
- Runs after agent response (should be before)

**Suggested Fix:**
- Fix grammar in description
- Add note about required vs optional keys
- Consider merging with preflight-check

---

### `test-coverage-maintainer.kiro.hook`

**Issue:** Only checks Python backend, not frontend React components.

**Suggested Fix:** Add patterns for frontend:
```json
{
  "patterns": [
    "backend/**/*.py",
    "api/**/*.py",
    "frontend/src/**/*.tsx"
  ]
}
```

And update prompt to check for `*.test.tsx` files for React components.

---

### `prettier-frontend.kiro.hook`

**Issue:** No documentation of interaction with `frontend-quality.kiro.hook`. Both run on same files.

**Suggested Fix:** Add comment in description:
```
"Runs independently from frontend-quality. Formatting (Prettier) runs first, then linting (ESLint)."
```

---

## Specs Review

### `orchestrator-refactor/design.md`

**Issues:**
- `StageResult` class missing fields for `warnings`, `cost`, `token_count`
- Example `DecomposerStage` calls undefined methods (`_get_backend()`, `_get_system_prompt()`)

**Suggested Fix:** Add to StageResult:
```python
@dataclass
class StageResult:
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)  # NEW
    cost_usd: float = 0.0  # NEW
    tokens_used: int = 0  # NEW
```

---

### `intelligent-research-system/tasks.md`

**Issue:** 55 tasks is too many to track effectively.

**Suggested Fix:** Break into phases:
1. Foundation Phase (tasks 1-12)
2. Hypothesis Phase (tasks 13-22)
3. Debate Phase (tasks 23-35)
4. Red Team Phase (tasks 36-45)
5. Synthesis Phase (tasks 46-55)

---

### `multi-project-support/requirements.md`

**Issue:** Profile format not specified (JSON, YAML, TOML?).

**Suggested Fix:** Add example:
```yaml
# project-profile.yaml
name: "Medical Research"
context: "AI-powered medical image diagnosis..."
models:
  primary: "gpt-5.1"
  secondary: "gemini-3.0-pro"
cost_tier: "standard"
```

---

## Steering Files

### `structure.md`

**Issue:** Shows `backend/orchestrator.py` as single file, but `orchestrator-refactor` spec will split it into a package.

**Suggested Fix:** Add "Future Structure" section:
```markdown
## Planned Structure (Post-Refactor)

backend/orchestrator/
├── __init__.py
├── core.py              # Main orchestrator class
├── pipeline.py          # Pipeline runner
├── context.py           # Shared context
├── registry.py          # Stage registry
└── stages/              # Individual pipeline stages
    ├── decomposer.py
    ├── research.py
    ├── debate.py
    └── ...
```

---

### `project-rules.md`

**Issues:**
1. Mixes product info (belongs in `product.md`) with technical rules
2. API endpoints table duplicates `tech.md`
3. Quick start missing "how to get API keys"

**Suggested Fixes:**
- Move "Project Overview" section to `product.md`
- Remove API endpoints (keep only in `tech.md`)
- Add to Quick Start:
  ```markdown
  ### Obtaining API Keys
  - OpenAI: https://platform.openai.com/api-keys
  - Gemini: https://aistudio.google.com/apikey
  - Tavily: https://tavily.com (optional, for web search)
  ```

---

### `tech.md`

**Issues:**
- API endpoints duplicated from `project-rules.md`
- Missing error response format documentation
- Commands section incomplete (no test commands)

**Suggested Fixes:**
- Keep API endpoints only here (remove from project-rules.md)
- Add error response format:
  ```markdown
  ## API Error Format

  All errors return JSON:
  {
    "error": "Error message",
    "code": "ERROR_CODE"
  }

  Status codes:
  - 400: Invalid parameters
  - 401: Missing/invalid API key
  - 404: Resource not found
  - 500: Server error
  ```
- Add commands:
  ```markdown
  # Run tests
  pytest tests/
  pytest tests/ --cov  # with coverage

  # Frontend tests
  cd frontend && npm test
  ```

---

## Summary Table

| Category | Critical | Medium | Low (Delete) |
|----------|----------|--------|--------------|
| Hooks | 2 | 3 | 7 deprecated |
| Steering | 2 | 2 | 0 |
| Specs | 1 | 3 | 0 |

### Priority Order

1. Delete 7 deprecated hooks (5 min)
2. Fix `security-check.kiro.hook` severity levels (15 min)
3. Fix `auto-push.kiro.hook` error handling (5 min)
4. Expand `python-backend.md` (30 min)
5. Expand `react-frontend.md` (30 min)
6. Update `structure.md` with future layout (15 min)
7. Fix spec issues (1-2 hours)
