"""Pytest configuration and fixtures for backend tests."""

import os
import pytest
from fastapi.testclient import TestClient

# Set dummy API keys for tests that import modules requiring them
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy-key-for-testing-only")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key-for-testing")


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    from api.server import app
    return TestClient(app)
