from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure venv site-packages are on path
_SITE = Path(__file__).resolve().parents[1] / "venv" / "lib" / "python3.14" / "site-packages"
sys.path.insert(0, str(_SITE))

import pytest
import httpx

BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8000")


@pytest.fixture(scope="module")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10) as c:
        yield c


def test_assistant_greeting(client):
    res = client.post("/api/assistant/chat", json={"message": "Hello"})
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "AstroAssist" in data["reply"]
    assert "suggested_actions" in data
    assert len(data["suggested_actions"]) > 0


def test_assistant_vitals_summary(client):
    res = client.post("/api/assistant/chat", json={"message": "How are my vitals?", "astronaut_id": 1})
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert "Heart Rate" in data["reply"] or "AST-" in data["reply"]
    assert data["context_used"] is not None
    assert "latest_vitals" in data["context_used"]


def test_assistant_heart_rate_query(client):
    res = client.post("/api/assistant/chat", json={"message": "Is my heart rate okay?", "astronaut_id": 1})
    assert res.status_code == 200
    data = res.json()
    assert "Cardiovascular" in data["reply"] or "Heart Rate" in data["reply"]
    assert "suggested_actions" in data


def test_assistant_pre_eva_check(client):
    res = client.post("/api/assistant/chat", json={"message": "Can I do a spacewalk?", "astronaut_id": 1})
    assert res.status_code == 200
    data = res.json()
    assert "EVA" in data["reply"]


def test_assistant_validation_error(client):
    # Empty message should fail with 422
    res = client.post("/api/assistant/chat", json={"message": ""})
    assert res.status_code == 422
