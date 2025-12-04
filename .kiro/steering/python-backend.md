---
inclusion: fileMatch
fileMatchPattern: "backend/**/*.py"
---

# Python Backend Rules

When working on Python files in the backend:

- Always use type hints for function parameters and return values
- Use async/await for any I/O operations
- Follow the existing pattern in orchestrator.py for new pipeline stages
- Import from relative paths: `from .config import ...`
- Log important operations using the existing logging setup
- When calling LLMs, use the clients from `llm_clients.py`

## Async Patterns

- Use `asyncio.gather()` for parallel LLM calls
- Always set timeouts on external API calls: `async with asyncio.timeout(30):`
- Wrap API calls in try/except with specific error handling
- Use `asyncio.create_task()` for fire-and-forget operations

## LLM Integration

- Use clients from `llm_clients.py` (never call APIs directly)
- Always validate JSON responses before using with `safe_json_load()`
- Log token counts for cost tracking via `get_usage_stats()`
- Handle rate limits with exponential backoff

## Error Handling

- Raise specific exceptions (`ValueError`, `RuntimeError`, `ConnectionError`)
- Never silently catch exceptions - log at minimum
- Provide context in error messages: `raise ValueError(f"Invalid component: {name}")`
- Use custom exceptions for domain-specific errors

## Logging

```python
import logging
logger = logging.getLogger(__name__)

# Levels:
# INFO: pipeline milestones (stage start/complete)
# DEBUG: intermediate results, API calls
# WARNING: retries, fallbacks, non-critical issues
# ERROR: failures requiring user attention
```

## Testing

- Unit tests for all public functions
- Mock external APIs using fixtures in `conftest.py`
- Use `pytest.mark.asyncio` for async tests
- Test both success and error paths
