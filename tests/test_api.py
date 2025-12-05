"""Unit tests for the FastAPI backend API endpoints."""

import pytest
from unittest.mock import patch, MagicMock
import os


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_returns_200(self, test_client):
        """Test /health returns 200 status code."""
        response = test_client.get("/health")
        assert response.status_code == 200

    def test_health_returns_ok_status(self, test_client):
        """Test /health returns status ok."""
        response = test_client.get("/health")
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


class TestConfigEndpoint:
    """Tests for /config endpoint."""

    def test_config_returns_200(self, test_client):
        """Test /config returns 200 status code."""
        response = test_client.get("/config")
        assert response.status_code == 200

    def test_config_returns_expected_structure(self, test_client):
        """Test /config returns expected structure with all required fields."""
        response = test_client.get("/config")
        data = response.json()
        
        # Check all expected keys are present
        assert "deep_research_enabled" in data
        assert "deep_research_queries" in data
        assert "parallel_enabled" in data
        assert "checkpoint_enabled" in data
        assert "model_routing" in data
        assert "api_keys_set" in data
        assert "api_keys_masked" in data

    def test_config_api_keys_set_structure(self, test_client):
        """Test api_keys_set has correct structure."""
        response = test_client.get("/config")
        data = response.json()
        
        api_keys_set = data["api_keys_set"]
        assert "openai" in api_keys_set
        assert "gemini" in api_keys_set
        assert "tavily" in api_keys_set
        # Values should be booleans
        assert isinstance(api_keys_set["openai"], bool)
        assert isinstance(api_keys_set["gemini"], bool)
        assert isinstance(api_keys_set["tavily"], bool)

    def test_config_api_keys_masked_structure(self, test_client):
        """Test api_keys_masked has correct structure."""
        response = test_client.get("/config")
        data = response.json()
        
        api_keys_masked = data["api_keys_masked"]
        assert "openai" in api_keys_masked
        assert "gemini" in api_keys_masked
        assert "tavily" in api_keys_masked


class TestRunsEndpoint:
    """Tests for /runs endpoint."""

    def test_runs_returns_200(self, test_client):
        """Test /runs returns 200 status code."""
        response = test_client.get("/runs")
        assert response.status_code == 200

    def test_runs_returns_list(self, test_client):
        """Test /runs returns a list of runs."""
        response = test_client.get("/runs")
        data = response.json()
        
        assert "runs" in data
        assert isinstance(data["runs"], list)


class TestSettingsEndpoint:
    """Tests for /settings endpoint."""

    def test_settings_accepts_valid_openai_key(self, test_client):
        """Test /settings accepts valid OpenAI API key format."""
        # Valid OpenAI key format: sk- followed by 20+ alphanumeric chars
        valid_key = "sk-" + "a" * 48
        
        with patch.dict(os.environ, {}, clear=False):
            response = test_client.post(
                "/settings",
                json={"openai_key": valid_key}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "updated"
        assert "openai" in data["keys_updated"]

    def test_settings_rejects_invalid_openai_key(self, test_client):
        """Test /settings rejects invalid OpenAI API key format."""
        invalid_key = "invalid-key-format"
        
        response = test_client.post(
            "/settings",
            json={"openai_key": invalid_key}
        )
        
        assert response.status_code == 422  # Validation error

    def test_settings_accepts_valid_gemini_key(self, test_client):
        """Test /settings accepts valid Gemini API key."""
        valid_key = "AIzaSyA" + "a" * 30  # At least 10 chars
        
        with patch.dict(os.environ, {}, clear=False):
            response = test_client.post(
                "/settings",
                json={"gemini_key": valid_key}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "updated"
        assert "gemini" in data["keys_updated"]

    def test_settings_rejects_short_gemini_key(self, test_client):
        """Test /settings rejects too short Gemini API key."""
        short_key = "short"  # Less than 10 chars
        
        response = test_client.post(
            "/settings",
            json={"gemini_key": short_key}
        )
        
        assert response.status_code == 422  # Validation error

    def test_settings_accepts_valid_tavily_key(self, test_client):
        """Test /settings accepts valid Tavily API key format."""
        valid_key = "tvly-" + "a" * 20
        
        with patch.dict(os.environ, {}, clear=False):
            response = test_client.post(
                "/settings",
                json={"tavily_key": valid_key}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "updated"
        assert "tavily" in data["keys_updated"]

    def test_settings_rejects_invalid_tavily_key(self, test_client):
        """Test /settings rejects invalid Tavily API key format."""
        invalid_key = "invalid-tavily-key"
        
        response = test_client.post(
            "/settings",
            json={"tavily_key": invalid_key}
        )
        
        assert response.status_code == 422  # Validation error

    def test_settings_accepts_empty_request(self, test_client):
        """Test /settings accepts empty request (no keys to update)."""
        response = test_client.post("/settings", json={})
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "updated"
        assert data["keys_updated"] == []


class TestSecurityHeaders:
    """Tests for security headers."""

    def test_health_has_security_headers(self, test_client):
        """Test /health response includes security headers."""
        response = test_client.get("/health")
        
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"


class TestRunEndpoint:
    """Tests for /run endpoint."""

    def test_run_rejects_empty_components(self, test_client):
        """Test /run rejects request with empty components list."""
        response = test_client.post("/run", json={"components": []})
        
        assert response.status_code == 400
        data = response.json()
        assert "No components provided" in data["detail"]

    def test_run_accepts_valid_components(self, test_client):
        """Test /run accepts valid components list."""
        # Mock the orchestrator to avoid actual LLM calls
        with patch("api.server.asyncio.create_task"):
            response = test_client.post(
                "/run",
                json={"components": ["test_component"]}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "started"
        assert "test_component" in data["components"]


class TestResumableRunsEndpoint:
    """Tests for /runs/resumable endpoint."""

    def test_resumable_runs_returns_200(self, test_client):
        """Test /runs/resumable returns 200 status code."""
        response = test_client.get("/runs/resumable")
        assert response.status_code == 200

    def test_resumable_runs_returns_list(self, test_client):
        """Test /runs/resumable returns a list of runs."""
        response = test_client.get("/runs/resumable")
        data = response.json()
        
        assert "runs" in data
        assert isinstance(data["runs"], list)


class TestResumeEndpoint:
    """Tests for /resume endpoint."""

    def test_resume_rejects_nonexistent_run(self, test_client):
        """Test /resume rejects request for non-existent run."""
        response = test_client.post(
            "/resume",
            json={"component": "nonexistent", "timestamp": "20240101_120000"}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_resume_requires_component(self, test_client):
        """Test /resume requires component field."""
        response = test_client.post(
            "/resume",
            json={"timestamp": "20240101_120000"}
        )
        
        assert response.status_code == 422  # Validation error

    def test_resume_requires_timestamp(self, test_client):
        """Test /resume requires timestamp field."""
        response = test_client.post(
            "/resume",
            json={"component": "test_component"}
        )
        
        assert response.status_code == 422  # Validation error


class TestRunsEndpointWithStatus:
    """Tests for /runs endpoint with status information."""

    def test_runs_includes_status_info(self, test_client):
        """Test /runs includes status and resumable info when available."""
        response = test_client.get("/runs")
        data = response.json()
        
        # Just verify the endpoint works - actual status depends on existing runs
        assert "runs" in data
        assert isinstance(data["runs"], list)
