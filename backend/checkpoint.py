"""
Checkpointing system for resumable pipeline runs.
Saves state after each stage so runs can be resumed if interrupted.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime


CHECKPOINT_FILENAME = "checkpoint.json"
RUN_STATE_FILENAME = "run_state.json"


class RunState:
    """Track the overall state of a run for resume capability."""
    
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    
    def __init__(self, run_dir: Path):
        self.run_dir = run_dir
        self.state_path = run_dir / RUN_STATE_FILENAME
    
    def save(
        self,
        status: str,
        component: str,
        current_node: Optional[str] = None,
        current_cycle: Optional[int] = None,
        current_stage: Optional[str] = None,
        error_message: Optional[str] = None,
        error_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Save the current run state for resume capability."""
        self.run_dir.mkdir(parents=True, exist_ok=True)
        
        state = {
            "status": status,
            "component": component,
            "current_node": current_node,
            "current_cycle": current_cycle,
            "current_stage": current_stage,
            "error_message": error_message,
            "error_type": error_type,
            "last_updated": datetime.utcnow().isoformat(),
            "metadata": metadata or {},
        }
        
        # Load existing state to preserve history
        if self.state_path.exists():
            try:
                existing = json.loads(self.state_path.read_text(encoding="utf-8"))
                state["created_at"] = existing.get("created_at", state["last_updated"])
                state["resume_count"] = existing.get("resume_count", 0)
            except (json.JSONDecodeError, IOError):
                state["created_at"] = state["last_updated"]
                state["resume_count"] = 0
        else:
            state["created_at"] = state["last_updated"]
            state["resume_count"] = 0
        
        self.state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    
    def load(self) -> Optional[Dict[str, Any]]:
        """Load the run state if it exists."""
        if not self.state_path.exists():
            return None
        try:
            return json.loads(self.state_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            return None
    
    def mark_resumed(self) -> None:
        """Increment the resume count when a run is resumed."""
        state = self.load()
        if state:
            state["resume_count"] = state.get("resume_count", 0) + 1
            state["status"] = self.RUNNING
            state["last_updated"] = datetime.utcnow().isoformat()
            state["error_message"] = None
            state["error_type"] = None
            self.state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")
    
    def is_resumable(self) -> bool:
        """Check if this run can be resumed."""
        state = self.load()
        if not state:
            return False
        return state.get("status") in [self.FAILED, self.PAUSED]
    
    def get_resume_info(self) -> Optional[Dict[str, Any]]:
        """Get information needed to resume the run."""
        state = self.load()
        if not state or not self.is_resumable():
            return None
        return {
            "component": state.get("component"),
            "current_node": state.get("current_node"),
            "current_cycle": state.get("current_cycle"),
            "current_stage": state.get("current_stage"),
            "error_message": state.get("error_message"),
            "resume_count": state.get("resume_count", 0),
        }


def save_checkpoint(
    checkpoint_dir: Path,
    stage: str,
    data: Dict[str, Any],
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Save a checkpoint after completing a stage.
    """
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    checkpoint_path = checkpoint_dir / CHECKPOINT_FILENAME
    
    if checkpoint_path.exists():
        checkpoint = json.loads(checkpoint_path.read_text(encoding="utf-8"))
    else:
        checkpoint = {
            "created_at": datetime.utcnow().isoformat(),
            "stages": {},
        }
    
    checkpoint["stages"][stage] = {
        "completed_at": datetime.utcnow().isoformat(),
        "data": data,
        "metadata": metadata or {},
    }
    checkpoint["last_updated"] = datetime.utcnow().isoformat()
    checkpoint["last_stage"] = stage
    
    checkpoint_path.write_text(json.dumps(checkpoint, indent=2), encoding="utf-8")


def load_checkpoint(checkpoint_dir: Path) -> Optional[Dict[str, Any]]:
    """Load checkpoint from directory if it exists."""
    checkpoint_path = checkpoint_dir / CHECKPOINT_FILENAME
    if not checkpoint_path.exists():
        return None
    
    try:
        return json.loads(checkpoint_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, IOError):
        return None


def get_stage_data(checkpoint: Dict[str, Any], stage: str) -> Optional[Dict[str, Any]]:
    """Get data for a specific stage from checkpoint."""
    if not checkpoint:
        return None
    stages = checkpoint.get("stages", {})
    stage_info = stages.get(stage)
    if stage_info:
        return stage_info.get("data")
    return None


def is_stage_complete(checkpoint: Optional[Dict[str, Any]], stage: str) -> bool:
    """Check if a stage has been completed."""
    if not checkpoint:
        return False
    return stage in checkpoint.get("stages", {})


def get_completed_stages(checkpoint: Optional[Dict[str, Any]]) -> List[str]:
    """Get list of completed stage names."""
    if not checkpoint:
        return []
    return list(checkpoint.get("stages", {}).keys())


def clear_checkpoint(checkpoint_dir: Path) -> None:
    """Remove checkpoint file to start fresh."""
    checkpoint_path = checkpoint_dir / CHECKPOINT_FILENAME
    if checkpoint_path.exists():
        checkpoint_path.unlink()


class CheckpointManager:
    """Context manager for checkpointed pipeline stages."""
    
    def __init__(
        self,
        checkpoint_dir: Path,
        stage: str,
        checkpoint: Optional[Dict[str, Any]] = None,
        enabled: bool = True,
    ):
        self.checkpoint_dir = checkpoint_dir
        self.stage = stage
        self.checkpoint = checkpoint
        self.enabled = enabled
        self.should_skip = False
        self.cached_data: Optional[Dict[str, Any]] = None
        self._data_to_save: Optional[Dict[str, Any]] = None
    
    def __enter__(self) -> "CheckpointManager":
        if self.enabled and is_stage_complete(self.checkpoint, self.stage):
            self.should_skip = True
            self.cached_data = get_stage_data(self.checkpoint, self.stage)
            print(f"[Checkpoint] Skipping '{self.stage}' - already complete")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is None and self._data_to_save is not None and self.enabled:
            save_checkpoint(self.checkpoint_dir, self.stage, self._data_to_save)
    
    def save(self, data: Dict[str, Any]) -> None:
        """Mark data to be saved on successful exit."""
        self._data_to_save = data


def find_resumable_runs(components_root: Path) -> List[Dict[str, Any]]:
    """Find all runs that can be resumed."""
    resumable = []
    if not components_root.exists():
        return resumable
    
    for component_dir in components_root.iterdir():
        if not component_dir.is_dir():
            continue
        for run_dir in component_dir.iterdir():
            if not run_dir.is_dir():
                continue
            run_state = RunState(run_dir)
            if run_state.is_resumable():
                state = run_state.load()
                resumable.append({
                    "component": component_dir.name,
                    "timestamp": run_dir.name,
                    "path": str(run_dir),
                    "status": state.get("status"),
                    "error_message": state.get("error_message"),
                    "current_node": state.get("current_node"),
                    "current_cycle": state.get("current_cycle"),
                    "current_stage": state.get("current_stage"),
                    "resume_count": state.get("resume_count", 0),
                })
    
    return sorted(resumable, key=lambda x: x["timestamp"], reverse=True)
