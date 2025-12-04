# Feature: Multi-Project Research Support

## Overview
Transform the orchestrator from a Neura Phase Lab-specific tool into a general-purpose deep research platform that can handle any domain. Neura Phase Lab becomes the default/example project.

## Requirements

### 1. Project Profiles
- Users can create, save, load, and delete research profiles
- Each profile contains:
  - Name and description
  - Domain context (like current PROJECT_CONTEXT)
  - Constraints (latency, budget, hardware, team size, etc.)
  - Custom prompts/focus areas (optional)
- Default profile: "Neura Phase Lab (BCI)"
- Example profiles to include: Finance, Game Dev, Scientific Research

#### Profile Format (YAML)
```yaml
# project-profile.yaml
name: "Medical Research"
description: "AI-powered medical image diagnosis research"
context: |
  This project focuses on developing AI systems for medical imaging.
  Key constraints: HIPAA compliance, explainability requirements,
  clinical validation needs.
models:
  primary: "gpt-5.1"
  secondary: "gemini-2.0-flash"
constraints:
  latency_ms: 1000
  budget_usd: 500
  team_size: 5
cost_tier: "standard"  # quick, standard, deep
custom_prompts:
  decomposer: null  # Use default
  research_agent: "Focus on peer-reviewed clinical studies"
```

### 2. Research Depth Configuration
- Presets: Quick (1 cycle, 2 rounds), Standard (2 cycles, 3 rounds), Deep (3 cycles, 3 rounds)
- Custom: User picks cycles, rounds, reviewers, critics
- Show what each depth level includes

### 3. Cost Estimation
- Before running, show estimated:
  - Token count (input + output)
  - API cost breakdown (OpenAI, Gemini, Tavily)
  - Time estimate
- "Dry run" mode: simulate without API calls
- Budget limits: warn or stop if exceeding threshold

### 4. Pipeline Customization
- Toggle stages: decomposition, debate, review, meta-review, etc.
- Adjust counts: number of reviewers (1-5), critics (1-3)
- Model selection per role (already have MODEL_ROUTING, expose in UI)

### 5. Rebranding
- App name: "Deep Research Lab" or similar (not Neura-specific)
- Neura Phase Lab is just one project/profile
- Generic branding in UI, docs, README

## Acceptance Criteria
- [ ] User can create a new project profile from UI
- [ ] User can switch between profiles
- [ ] User sees cost estimate before starting run
- [ ] User can adjust research depth
- [ ] Default profile is Neura Phase Lab
- [ ] App works for any research domain
