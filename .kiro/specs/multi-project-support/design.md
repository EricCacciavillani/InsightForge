# Design: Multi-Project Research Support

## Data Model

### Project Profile
```json
{
  "id": "uuid",
  "name": "Neura Phase Lab",
  "description": "BCI for gaming",
  "created_at": "2025-11-30T...",
  "context": "Long project context string...",
  "constraints": {
    "latency_ms": 180,
    "budget_usd": 5000,
    "vram_gb": 20,
    "team_size": 1
  },
  "research_config": {
    "depth_preset": "standard",
    "max_cycles": 2,
    "rounds_per_cycle": 3,
    "num_reviewers": 3,
    "num_critics": 2,
    "enable_deep_search": true,
    "enable_meta_debate": true
  },
  "model_routing": {
    "agent_a": "openai",
    "agent_b": "gemini",
    ...
  }
}
```

### Storage
- Profiles stored in: `~/.deep-research-lab/profiles/`
- Or in project: `.research-profiles/`
- JSON files, one per profile

## Cost Estimation Logic

```python
def estimate_cost(profile, components):
    # Base tokens per stage (approximate)
    TOKENS_PER_RESEARCH_ROUND = 4000
    TOKENS_PER_DEBATE = 6000
    TOKENS_PER_REVIEW = 2000
    TOKENS_PER_PAPER = 8000
    
    num_nodes = estimate_decomposition_nodes(components)
    cycles = profile.research_config.max_cycles
    rounds = profile.research_config.rounds_per_cycle
    
    total_tokens = num_nodes * cycles * (
        rounds * 2 * TOKENS_PER_RESEARCH_ROUND +  # 2 agents
        TOKENS_PER_DEBATE +
        profile.num_reviewers * TOKENS_PER_REVIEW +
        TOKENS_PER_PAPER * 2 +  # v1 and v2
        ...
    )
    
    return {
        "estimated_tokens": total_tokens,
        "estimated_cost_usd": calculate_cost(total_tokens),
        "estimated_time_minutes": total_tokens / 1000 * 0.5
    }
```

## UI Changes

### New: Project Selector (top of sidebar or header)
- Dropdown showing current profile
- "New Profile" button
- "Edit Profile" opens modal

### New: Profile Editor Modal
- Name, description
- Context textarea (with templates)
- Constraints form
- Research depth slider/presets
- Advanced: model routing, stage toggles

### New: Pre-Run Estimation Panel
- Shows before clicking "Start Run"
- Token estimate, cost estimate, time estimate
- Warning if over budget
- "Dry Run" checkbox

### Settings Page Updates
- Move API keys here (shared across profiles)
- Global settings vs profile-specific settings

## File Structure Changes

```
backend/
├── profiles/
│   ├── manager.py      # CRUD for profiles
│   ├── estimator.py    # Cost estimation
│   └── defaults/
│       └── neura_phase_lab.json
├── config.py           # Now loads from active profile
```

## API Changes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/profiles` | GET | List all profiles |
| `/profiles` | POST | Create profile |
| `/profiles/{id}` | GET | Get profile |
| `/profiles/{id}` | PUT | Update profile |
| `/profiles/{id}` | DELETE | Delete profile |
| `/profiles/active` | GET/PUT | Get/set active profile |
| `/estimate` | POST | Estimate cost for components |
