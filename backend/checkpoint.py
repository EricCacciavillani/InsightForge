"""
Checkpointing system for resumable pipeline runs.
Saves state after each stage so runs can be resumed if interrupted.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime


CHECKPOINT_FILENAME = "checkpoint.json"


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
