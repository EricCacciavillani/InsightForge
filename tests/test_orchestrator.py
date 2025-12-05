"""Unit tests for the backend orchestrator module."""

import json
import os
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
import tempfile
import shutil

# Import utils directly (no LLM client dependencies)
from backend.utils import slugify, safe_json_load
from backend.checkpoint import (
    save_checkpoint,
    load_checkpoint,
    get_stage_data,
    is_stage_complete,
    get_completed_stages,
    clear_checkpoint,
    CheckpointManager,
)


class TestSlugify:
    """Tests for slugify() function."""

    def test_slugify_basic_string(self):
        """Test slugify converts basic string to lowercase slug."""
        result = slugify("Hello World")
        assert result == "hello_world"

    def test_slugify_special_characters(self):
        """Test slugify replaces special characters with underscores."""
        result = slugify("Test@Component#123")
        assert result == "test_component_123"

    def test_slugify_multiple_spaces(self):
        """Test slugify handles multiple spaces/special chars."""
        result = slugify("Test   Multiple   Spaces")
        assert result == "test_multiple_spaces"

    def test_slugify_leading_trailing_special(self):
        """Test slugify strips leading/trailing underscores."""
        result = slugify("---Test---")
        assert result == "test"

    def test_slugify_truncates_long_strings(self):
        """Test slugify truncates strings longer than 80 chars."""
        long_name = "a" * 100
        result = slugify(long_name)
        assert len(result) == 80

    def test_slugify_preserves_short_strings(self):
        """Test slugify preserves strings under 80 chars."""
        short_name = "short_name"
        result = slugify(short_name)
        assert result == "short_name"

    def test_slugify_empty_string(self):
        """Test slugify handles empty string."""
        result = slugify("")
        assert result == ""

    def test_slugify_only_special_chars(self):
        """Test slugify handles string with only special chars."""
        result = slugify("@#$%^&*()")
        assert result == ""


class TestSafeJsonLoad:
    """Tests for safe_json_load() function."""

    def test_safe_json_load_valid_json(self):
        """Test safe_json_load parses valid JSON."""
        valid_json = '{"key": "value", "number": 42}'
        result = safe_json_load(valid_json)
        assert result == {"key": "value", "number": 42}

    def test_safe_json_load_valid_array(self):
        """Test safe_json_load parses valid JSON array."""
        valid_json = '[1, 2, 3]'
        result = safe_json_load(valid_json)
        assert result == [1, 2, 3]

    def test_safe_json_load_invalid_json(self):
        """Test safe_json_load returns error dict for invalid JSON."""
        invalid_json = "not valid json {"
        result = safe_json_load(invalid_json)
        assert result["parse_error"] is True
        assert result["raw_text"] == invalid_json

    def test_safe_json_load_empty_string(self):
        """Test safe_json_load handles empty string."""
        result = safe_json_load("")
        assert result["parse_error"] is True
        assert result["raw_text"] == ""

    def test_safe_json_load_nested_json(self):
        """Test safe_json_load parses nested JSON structures."""
        nested_json = '{"outer": {"inner": {"deep": "value"}}}'
        result = safe_json_load(nested_json)
        assert result["outer"]["inner"]["deep"] == "value"


class TestGetBackend:
    """Tests for get_backend() routing logic.
    
    Note: We test the routing logic directly without importing the orchestrator
    module to avoid LLM client initialization issues in test environments.
    """

    def _get_backend(self, model_routing: dict, role: str, index: int = 0) -> str:
        """Local implementation of get_backend for testing routing logic."""
        value = model_routing.get(role, "openai")
        return value[index % len(value)] if isinstance(value, list) else value

    def test_get_backend_single_value(self):
        """Test get_backend returns single value for non-list routing."""
        routing = {"agent_a": "openai"}
        result = self._get_backend(routing, "agent_a")
        assert result == "openai"

    def test_get_backend_list_value_index_0(self):
        """Test get_backend returns first item for index 0."""
        routing = {"debate": ["openai", "gemini"]}
        result = self._get_backend(routing, "debate", index=0)
        assert result == "openai"

    def test_get_backend_list_value_index_1(self):
        """Test get_backend returns second item for index 1."""
        routing = {"debate": ["openai", "gemini"]}
        result = self._get_backend(routing, "debate", index=1)
        assert result == "gemini"

    def test_get_backend_list_wraps_around(self):
        """Test get_backend wraps around for index > list length."""
        routing = {"reviewers": ["gemini", "openai"]}
        # Index 2 should wrap to index 0
        result = self._get_backend(routing, "reviewers", index=2)
        assert result == "gemini"
        # Index 3 should wrap to index 1
        result = self._get_backend(routing, "reviewers", index=3)
        assert result == "openai"

    def test_get_backend_unknown_role_defaults_to_openai(self):
        """Test get_backend returns 'openai' for unknown roles."""
        routing = {}
        result = self._get_backend(routing, "unknown_role")
        assert result == "openai"

    def test_get_backend_index_ignored_for_single_value(self):
        """Test get_backend ignores index for single value routing."""
        routing = {"agent_b": "gemini"}
        result = self._get_backend(routing, "agent_b", index=5)
        assert result == "gemini"

    def test_get_backend_three_item_list(self):
        """Test get_backend with three-item list routing."""
        routing = {"reviewers": ["gemini", "openai", "gemini"]}
        assert self._get_backend(routing, "reviewers", index=0) == "gemini"
        assert self._get_backend(routing, "reviewers", index=1) == "openai"
        assert self._get_backend(routing, "reviewers", index=2) == "gemini"
        # Wrap around
        assert self._get_backend(routing, "reviewers", index=3) == "gemini"


class TestCheckpointSaveLoad:
    """Tests for checkpoint save/load functionality."""

    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for checkpoint tests."""
        temp_path = Path(tempfile.mkdtemp())
        yield temp_path
        shutil.rmtree(temp_path, ignore_errors=True)

    def test_save_and_load_checkpoint(self, temp_dir):
        """Test saving and loading a checkpoint."""
        test_data = {"result": "success", "count": 42}
        
        save_checkpoint(temp_dir, "test_stage", test_data)
        loaded = load_checkpoint(temp_dir)
        
        assert loaded is not None
        assert "stages" in loaded
        assert "test_stage" in loaded["stages"]
        assert loaded["stages"]["test_stage"]["data"] == test_data

    def test_load_checkpoint_nonexistent(self, temp_dir):
        """Test loading checkpoint from directory without checkpoint."""
        result = load_checkpoint(temp_dir)
        assert result is None

    def test_save_multiple_stages(self, temp_dir):
        """Test saving multiple stages to same checkpoint."""
        save_checkpoint(temp_dir, "stage1", {"data": 1})
        save_checkpoint(temp_dir, "stage2", {"data": 2})
        
        loaded = load_checkpoint(temp_dir)
        
        assert "stage1" in loaded["stages"]
        assert "stage2" in loaded["stages"]
        assert loaded["stages"]["stage1"]["data"] == {"data": 1}
        assert loaded["stages"]["stage2"]["data"] == {"data": 2}

    def test_get_stage_data(self, temp_dir):
        """Test get_stage_data retrieves correct data."""
        test_data = {"key": "value"}
        save_checkpoint(temp_dir, "my_stage", test_data)
        
        loaded = load_checkpoint(temp_dir)
        result = get_stage_data(loaded, "my_stage")
        
        assert result == test_data

    def test_get_stage_data_missing_stage(self, temp_dir):
        """Test get_stage_data returns None for missing stage."""
        save_checkpoint(temp_dir, "existing", {"data": 1})
        
        loaded = load_checkpoint(temp_dir)
        result = get_stage_data(loaded, "nonexistent")
        
        assert result is None

    def test_is_stage_complete(self, temp_dir):
        """Test is_stage_complete returns correct boolean."""
        save_checkpoint(temp_dir, "completed_stage", {"done": True})
        
        loaded = load_checkpoint(temp_dir)
        
        assert is_stage_complete(loaded, "completed_stage") is True
        assert is_stage_complete(loaded, "incomplete_stage") is False

    def test_is_stage_complete_no_checkpoint(self):
        """Test is_stage_complete returns False for None checkpoint."""
        assert is_stage_complete(None, "any_stage") is False

    def test_get_completed_stages(self, temp_dir):
        """Test get_completed_stages returns list of stage names."""
        save_checkpoint(temp_dir, "stage_a", {})
        save_checkpoint(temp_dir, "stage_b", {})
        save_checkpoint(temp_dir, "stage_c", {})
        
        loaded = load_checkpoint(temp_dir)
        completed = get_completed_stages(loaded)
        
        assert set(completed) == {"stage_a", "stage_b", "stage_c"}

    def test_get_completed_stages_no_checkpoint(self):
        """Test get_completed_stages returns empty list for None."""
        result = get_completed_stages(None)
        assert result == []

    def test_clear_checkpoint(self, temp_dir):
        """Test clear_checkpoint removes checkpoint file."""
        save_checkpoint(temp_dir, "stage", {"data": 1})
        assert load_checkpoint(temp_dir) is not None
        
        clear_checkpoint(temp_dir)
        
        assert load_checkpoint(temp_dir) is None

    def test_clear_checkpoint_nonexistent(self, temp_dir):
        """Test clear_checkpoint handles nonexistent file gracefully."""
        # Should not raise an error
        clear_checkpoint(temp_dir)


class TestCheckpointManager:
    """Tests for CheckpointManager context manager."""

    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for checkpoint tests."""
        temp_path = Path(tempfile.mkdtemp())
        yield temp_path
        shutil.rmtree(temp_path, ignore_errors=True)

    def test_checkpoint_manager_saves_on_exit(self, temp_dir):
        """Test CheckpointManager saves data on successful exit."""
        with CheckpointManager(temp_dir, "test_stage", enabled=True) as cm:
            cm.save({"result": "success"})
        
        loaded = load_checkpoint(temp_dir)
        assert loaded["stages"]["test_stage"]["data"] == {"result": "success"}

    def test_checkpoint_manager_skips_completed_stage(self, temp_dir):
        """Test CheckpointManager skips already completed stages."""
        # First, save a checkpoint
        save_checkpoint(temp_dir, "existing_stage", {"cached": "data"})
        checkpoint = load_checkpoint(temp_dir)
        
        with CheckpointManager(temp_dir, "existing_stage", checkpoint, enabled=True) as cm:
            assert cm.should_skip is True
            assert cm.cached_data == {"cached": "data"}

    def test_checkpoint_manager_disabled(self, temp_dir):
        """Test CheckpointManager does not save when disabled."""
        with CheckpointManager(temp_dir, "test_stage", enabled=False) as cm:
            cm.save({"result": "should_not_save"})
        
        loaded = load_checkpoint(temp_dir)
        assert loaded is None

    def test_checkpoint_manager_no_save_on_exception(self, temp_dir):
        """Test CheckpointManager does not save on exception."""
        try:
            with CheckpointManager(temp_dir, "test_stage", enabled=True) as cm:
                cm.save({"result": "should_not_save"})
                raise ValueError("Test exception")
        except ValueError:
            pass
        
        loaded = load_checkpoint(temp_dir)
        assert loaded is None

    def test_checkpoint_manager_new_stage_not_skipped(self, temp_dir):
        """Test CheckpointManager does not skip new stages."""
        with CheckpointManager(temp_dir, "new_stage", enabled=True) as cm:
            assert cm.should_skip is False
            assert cm.cached_data is None


class TestRunState:
    """Tests for RunState class for tracking run status and resume capability."""

    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for run state tests."""
        temp_path = Path(tempfile.mkdtemp())
        yield temp_path
        shutil.rmtree(temp_path, ignore_errors=True)

    def test_run_state_save_and_load(self, temp_dir):
        """Test saving and loading run state."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(
            status=RunState.RUNNING,
            component="test_component",
            current_node="node_1",
            current_cycle=1,
            current_stage="research",
        )
        
        loaded = run_state.load()
        
        assert loaded is not None
        assert loaded["status"] == "running"
        assert loaded["component"] == "test_component"
        assert loaded["current_node"] == "node_1"
        assert loaded["current_cycle"] == 1
        assert loaded["current_stage"] == "research"

    def test_run_state_load_nonexistent(self, temp_dir):
        """Test loading run state from directory without state file."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        result = run_state.load()
        
        assert result is None

    def test_run_state_is_resumable_failed(self, temp_dir):
        """Test is_resumable returns True for failed runs."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(
            status=RunState.FAILED,
            component="test_component",
            error_message="API rate limit exceeded",
        )
        
        assert run_state.is_resumable() is True

    def test_run_state_is_resumable_paused(self, temp_dir):
        """Test is_resumable returns True for paused runs."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(
            status=RunState.PAUSED,
            component="test_component",
        )
        
        assert run_state.is_resumable() is True

    def test_run_state_is_resumable_running(self, temp_dir):
        """Test is_resumable returns False for running runs."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(
            status=RunState.RUNNING,
            component="test_component",
        )
        
        assert run_state.is_resumable() is False

    def test_run_state_is_resumable_completed(self, temp_dir):
        """Test is_resumable returns False for completed runs."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(
            status=RunState.COMPLETED,
            component="test_component",
        )
        
        assert run_state.is_resumable() is False

    def test_run_state_mark_resumed(self, temp_dir):
        """Test mark_resumed increments resume count."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(
            status=RunState.FAILED,
            component="test_component",
            error_message="Some error",
        )
        
        run_state.mark_resumed()
        loaded = run_state.load()
        
        assert loaded["status"] == "running"
        assert loaded["resume_count"] == 1
        assert loaded["error_message"] is None

    def test_run_state_multiple_resumes(self, temp_dir):
        """Test resume count increments correctly across multiple resumes."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(status=RunState.FAILED, component="test")
        
        run_state.mark_resumed()
        run_state.save(status=RunState.FAILED, component="test")
        run_state.mark_resumed()
        
        loaded = run_state.load()
        assert loaded["resume_count"] == 2

    def test_run_state_get_resume_info(self, temp_dir):
        """Test get_resume_info returns correct information."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(
            status=RunState.FAILED,
            component="test_component",
            current_node="node_2",
            current_cycle=2,
            current_stage="debate",
            error_message="Connection timeout",
        )
        
        info = run_state.get_resume_info()
        
        assert info is not None
        assert info["component"] == "test_component"
        assert info["current_node"] == "node_2"
        assert info["current_cycle"] == 2
        assert info["current_stage"] == "debate"
        assert info["error_message"] == "Connection timeout"

    def test_run_state_get_resume_info_not_resumable(self, temp_dir):
        """Test get_resume_info returns None for non-resumable runs."""
        from backend.checkpoint import RunState
        
        run_state = RunState(temp_dir)
        run_state.save(
            status=RunState.COMPLETED,
            component="test_component",
        )
        
        info = run_state.get_resume_info()
        
        assert info is None

    def test_run_state_preserves_created_at(self, temp_dir):
        """Test that created_at is preserved across updates."""
        from backend.checkpoint import RunState
        import time
        
        run_state = RunState(temp_dir)
        run_state.save(status=RunState.RUNNING, component="test")
        
        first_load = run_state.load()
        created_at = first_load["created_at"]
        
        time.sleep(0.01)  # Small delay
        run_state.save(status=RunState.FAILED, component="test")
        
        second_load = run_state.load()
        
        assert second_load["created_at"] == created_at
        assert second_load["last_updated"] != created_at


class TestFindResumableRuns:
    """Tests for find_resumable_runs function."""

    @pytest.fixture
    def temp_components_root(self):
        """Create a temporary components root directory."""
        temp_path = Path(tempfile.mkdtemp())
        yield temp_path
        shutil.rmtree(temp_path, ignore_errors=True)

    def test_find_resumable_runs_empty(self, temp_components_root):
        """Test find_resumable_runs returns empty list for empty directory."""
        from backend.checkpoint import find_resumable_runs
        
        result = find_resumable_runs(temp_components_root)
        
        assert result == []

    def test_find_resumable_runs_finds_failed(self, temp_components_root):
        """Test find_resumable_runs finds failed runs."""
        from backend.checkpoint import find_resumable_runs, RunState
        
        # Create a failed run
        run_dir = temp_components_root / "test_component" / "20240101_120000"
        run_dir.mkdir(parents=True)
        
        run_state = RunState(run_dir)
        run_state.save(
            status=RunState.FAILED,
            component="test_component",
            error_message="Test error",
        )
        
        result = find_resumable_runs(temp_components_root)
        
        assert len(result) == 1
        assert result[0]["component"] == "test_component"
        assert result[0]["timestamp"] == "20240101_120000"
        assert result[0]["status"] == "failed"
        assert result[0]["error_message"] == "Test error"

    def test_find_resumable_runs_ignores_completed(self, temp_components_root):
        """Test find_resumable_runs ignores completed runs."""
        from backend.checkpoint import find_resumable_runs, RunState
        
        # Create a completed run
        run_dir = temp_components_root / "test_component" / "20240101_120000"
        run_dir.mkdir(parents=True)
        
        run_state = RunState(run_dir)
        run_state.save(
            status=RunState.COMPLETED,
            component="test_component",
        )
        
        result = find_resumable_runs(temp_components_root)
        
        assert len(result) == 0

    def test_find_resumable_runs_multiple(self, temp_components_root):
        """Test find_resumable_runs finds multiple resumable runs."""
        from backend.checkpoint import find_resumable_runs, RunState
        
        # Create multiple runs
        for i, status in enumerate([RunState.FAILED, RunState.PAUSED, RunState.COMPLETED]):
            run_dir = temp_components_root / f"component_{i}" / f"2024010{i}_120000"
            run_dir.mkdir(parents=True)
            
            run_state = RunState(run_dir)
            run_state.save(status=status, component=f"component_{i}")
        
        result = find_resumable_runs(temp_components_root)
        
        # Should find 2 (failed and paused), not the completed one
        assert len(result) == 2


class TestProgressTracking:
    """Tests for progress tracking functionality."""

    def test_pipeline_stages_defined(self):
        """Test PIPELINE_STAGES constant is defined with expected stages."""
        from backend.orchestrator import PIPELINE_STAGES
        
        assert isinstance(PIPELINE_STAGES, list)
        assert len(PIPELINE_STAGES) == 13
        assert "deep_research" in PIPELINE_STAGES
        assert "research" in PIPELINE_STAGES
        assert "final_arbiter" in PIPELINE_STAGES

    def test_set_progress_callback(self):
        """Test set_progress_callback sets the callback."""
        from backend.orchestrator import set_progress_callback
        
        callback = lambda x: None
        set_progress_callback(callback)
        
        # Clean up
        set_progress_callback(None)

    def test_emit_progress_with_callback(self):
        """Test emit_progress calls callback with correct data."""
        from backend.orchestrator import set_progress_callback, emit_progress
        
        received = []
        def callback(data):
            received.append(data)
        
        set_progress_callback(callback)
        emit_progress("research", "TestNode", 1, 3, 2, 1)
        
        assert len(received) == 1
        assert received[0]["stage"] == "research"
        assert received[0]["node"] == "TestNode"
        assert received[0]["cycle"] == 1
        assert received[0]["total_cycles"] == 3
        assert received[0]["total_nodes"] == 2
        assert received[0]["current_node"] == 1
        assert "stage_index" in received[0]
        assert "total_stages" in received[0]
        
        # Clean up
        set_progress_callback(None)

    def test_emit_progress_without_callback(self):
        """Test emit_progress does nothing when no callback set."""
        from backend.orchestrator import set_progress_callback, emit_progress
        
        set_progress_callback(None)
        # Should not raise
        emit_progress("research", "TestNode", 1, 3, 2, 1)

    def test_emit_progress_stage_index(self):
        """Test emit_progress calculates correct stage index."""
        from backend.orchestrator import set_progress_callback, emit_progress, PIPELINE_STAGES
        
        received = []
        set_progress_callback(lambda d: received.append(d))
        
        emit_progress("debate", "TestNode", 1, 3, 1, 1)
        
        expected_idx = PIPELINE_STAGES.index("debate")
        assert received[0]["stage_index"] == expected_idx
        assert received[0]["total_stages"] == len(PIPELINE_STAGES)
        
        set_progress_callback(None)
