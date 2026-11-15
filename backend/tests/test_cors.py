from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure venv site-packages are on path
_SITE = Path(__file__).resolve().parents[1] / "venv" / "lib" / "python3.14" / "site-packages"
sys.path.insert(0, str(_SITE))

import pytest
from fastapi.testclient import TestClient
from app.main import app, DEV_ORIGINS

client = TestClient(app)


def test_dev_origins_allowed():
    """Verify that localhost development origins continue to work."""
    for origin in DEV_ORIGINS:
        response = client.options(
            "/",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.headers.get("access-control-allow-origin") == origin
        assert response.headers.get("access-control-allow-credentials") == "true"


def test_disallowed_origin_blocked():
    """Verify that unapproved external origins do not receive CORS allow headers."""
    response = client.options(
        "/",
        headers={
            "Origin": "https://unauthorized-domain.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in response.headers
