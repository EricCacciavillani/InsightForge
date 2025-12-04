"""
Configuration for Neura Phase Lab multi-agent orchestrator.
"""

from pathlib import Path

# Root directories for runs
NEURA_ROOT = Path(__file__).resolve().parent.parent / "neura_lab_runs"
COMPONENTS_ROOT = NEURA_ROOT / "components"
SYSTEM_ROOT = NEURA_ROOT / "system"

for _p in (COMPONENTS_ROOT, SYSTEM_ROOT):
    _p.mkdir(parents=True, exist_ok=True)

# OpenAI config
OPENAI_MODEL = "gpt-5.1"
OPENAI_REASONING_EFFORT = "high"  # "none" | "minimal" | "low" | "medium" | "high"

# Gemini config (google-genai)
GEMINI_MODEL = "gemini-3.0-pro"

# Notification webhook env var
NOTIFY_WEBHOOK_ENV = "NEURA_NOTIFY_WEBHOOK"

# Tavily API for deep research
TAVILY_API_KEY_ENV = "TAVILY_API_KEY"

# Deep research settings
DEEP_RESEARCH_ENABLED = True
DEEP_RESEARCH_QUERIES_PER_ROUND = 5
DEEP_RESEARCH_ON_FIRST_ROUND_ONLY = True  # Set False to search every round

# Parallel execution
PARALLEL_ENABLED = True
PARALLEL_MAX_WORKERS = 4

# Model routing - which backend to use for each role
# Options: "openai", "gemini"
MODEL_ROUTING = {
    "agent_a": "openai",
    "agent_b": "gemini",
    "debate": ["openai", "gemini"],
    "reviewers": ["gemini", "openai", "gemini"],
    "paper_v1": "gemini",
    "paper_critics": ["openai", "gemini"],
    "paper_revision": "openai",
    "verification_a": "openai",
    "verification_b": "gemini",
    "meta_debate": "openai",
    "meta_reviewers": ["gemini", "openai", "gemini"],
    "paper_v2": "openai",
    "final_arbiter": "openai",
    "arch_training": "openai",
    "decomposer": "openai",
    "system_architect": "openai",
    "system_critic": "gemini",
    "system_feasibility": "openai",
    "search_queries": "openai",  # For generating search queries
}

# Checkpointing
CHECKPOINT_ENABLED = True

PROJECT_CONTEXT = """Neura Phase Lab is a long-term R&D project to build a real, playable brain–computer
interface (BCI) for games.

Core elements:
- EEG (AURORA pipeline): risk-aware EEG processing that outputs continuous 2D
  look and move signals plus discrete actions. Designed for very low latency and
  stable, game-ready control.
- EMG veto: a small number of EMG channels used as a safety and precision layer,
  helping suppress false positives and optionally encode micro-gestures.
- Gaze: main gaze input is a high-quality Tobii eye tracker (fast, ~0.8° error).
  Gaze is used as a soft gate and directional hint for intent decoding and target
  selection.
- Fusion and control: Neura Phase Lab fuses EEG + EMG + Tobii gaze into
  analog-style control signals that drive games (e.g., via keyboard, mouse, or
  gamepad virtualization). Includes things like MovementRouter, WASDAnalogMapper,
  analog stick emulation, deadzones, and jerk/latency control.
- Visualization: a 3D brain visualization stack (e.g., PyVista/VTK) with
  holographic brain meshes, neuron sprites, and overlays for activity, latency,
  and connectivity.
- UI/UX: custom UIs to visualize signals, tune parameters, debug fusion, and
  monitor latency/robustness.

Hard constraints:
- The system must be able to play real games in real time; end-to-end
  thought→action latency should be extremely low (on the order of ~150–180 ms
  p95 or better).
- Models must be small and efficient enough to run in real time on a single GPU
  with around 20 GB VRAM.
- A single developer is implementing and maintaining this, with a total compute
  budget on the order of a few thousand USD (e.g. one strong GPU + occasional
  cloud bursts), so architectures must be practical and maintainable.
""".strip()
