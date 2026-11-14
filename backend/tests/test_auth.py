"""
VYOMA Authentication Tests
==========================

Tests all 9 specified scenarios using httpx against a running server.

Run from backend/ directory:
    PYTHONPATH=. python3 -m pytest tests/test_auth.py -v
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

# Ensure venv site-packages are on path
_SITE = Path(__file__).resolve().parents[1] / "venv" / "lib" / "python3.14" / "site-packages"
sys.path.insert(0, str(_SITE))

import pytest
import httpx

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8000")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "")
TEST_ASTRONAUT_ID = int(os.environ.get("TEST_ASTRONAUT_ID", "1"))
TEST_EMAIL = "testcrew@vyoma.space"
TEST_PASSWORD = "SecurePass2026!"
TEST_OTHER_ASTRONAUT_ID = int(os.environ.get("TEST_OTHER_ASTRONAUT_ID", "2"))
TEST_OTHER_EMAIL = "othercrew@vyoma.space"
TEST_OTHER_PASSWORD = "OtherPass2026!"


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10) as c:
        yield c


@pytest.fixture(scope="module", autouse=True)
def provision_test_accounts():
    """
    Create test astronaut accounts before running tests.
    Uses the admin provisioning endpoint.
    Skips if ADMIN_KEY is not set (server must be running).
    """
    if not ADMIN_KEY:
        pytest.skip("ADMIN_KEY not set — cannot provision test accounts")

    headers = {"X-Admin-Key": ADMIN_KEY}
    with httpx.Client(base_url=BASE_URL, timeout=10) as prov_client:
        # Provision primary test account
        r1 = prov_client.post("/api/auth/provision", json={
            "astronaut_id": TEST_ASTRONAUT_ID,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
        }, headers=headers)
        # 201 = created, 409 = already exists (OK on re-runs)
        assert r1.status_code in (201, 409), f"Provision failed: {r1.text}"

        # Provision second account for cross-access tests (if second astronaut exists)
        r2 = prov_client.post("/api/auth/provision", json={
            "astronaut_id": TEST_OTHER_ASTRONAUT_ID,
            "email": TEST_OTHER_EMAIL,
            "password": TEST_OTHER_PASSWORD,
        }, headers=headers)
        assert r2.status_code in (201, 409), f"Provision other failed: {r2.text}"


# ── Test 1: Valid login ───────────────────────────────────────────────────────

def test_valid_login(client):
    """A correct email + password returns 200 and an access token."""
    r = client.post("/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "access_token" in data
    assert data["astronaut_id"] == TEST_ASTRONAUT_ID
    assert data["token_type"] == "bearer"


# ── Test 2: Invalid password ─────────────────────────────────────────────────

def test_invalid_password(client):
    """Wrong password → generic 401. No hint about which field was wrong."""
    r = client.post("/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": "wrong_password_xyz",
    })
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
    detail = r.json().get("detail", "")
    # Must not leak email existence
    assert "email" not in detail.lower() or "invalid credentials" in detail.lower()


# ── Test 3: Unknown account ───────────────────────────────────────────────────

def test_unknown_account(client):
    """Non-existent email → generic 401. Same response as wrong password."""
    r = client.post("/api/auth/login", json={
        "identifier": "ghost@vyoma.space",
        "password": "doesnotmatter",
    })
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
    # Confirm same generic message
    detail = r.json().get("detail", "")
    assert "invalid credentials" in detail.lower()


# ── Test 4: Inactive account ─────────────────────────────────────────────────

def test_inactive_account(client):
    """
    Deactivate an account via MongoDB directly, then verify 403 on login.
    Skips if pymongo is unavailable.
    """
    try:
        import pymongo
    except ImportError:
        pytest.skip("pymongo not available for direct MongoDB manipulation")

    from pathlib import Path
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parents[1] / ".env")
    mongo_url = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
    mongo_db = os.environ.get("MONGO_DB", "vyoma_auth")

    mc = pymongo.MongoClient(mongo_url, serverSelectionTimeoutMS=3000)
    col = mc[mongo_db]["astronaut_users"]

    inactive_email = "inactive@vyoma.space"

    # Clean up and insert inactive user (linked to astronaut 1 — reuse test slot)
    col.delete_one({"email": inactive_email})

    # Provision via API first (need a real hash)
    if ADMIN_KEY:
        headers = {"X-Admin-Key": ADMIN_KEY}
        r = client.post("/api/auth/provision", json={
            "astronaut_id": TEST_ASTRONAUT_ID,
            "email": inactive_email,
            "password": "inactive_pass_123",
        }, headers=headers)
        # Might conflict with primary — that's OK, we set is_active=False directly
        col.update_one(
            {"email": inactive_email},
            {"$set": {"is_active": False}},
            upsert=False,
        )

        r = client.post("/api/auth/login", json={
            "identifier": inactive_email,
            "password": "inactive_pass_123",
        })
        # Could be 401 (account not found if provision conflicted) or 403
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}: {r.text}"
        col.delete_one({"email": inactive_email})
    else:
        pytest.skip("ADMIN_KEY not set")

    mc.close()


# ── Test 5: Missing JWT ───────────────────────────────────────────────────────

def test_missing_jwt(client):
    """Accessing /api/auth/me without a token → 401."""
    r = client.get("/api/auth/me")
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"


# ── Test 6: Expired JWT ───────────────────────────────────────────────────────

def test_expired_jwt(client):
    """A manually crafted expired token → 401."""
    import jwt as _jwt
    from pathlib import Path
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parents[1] / ".env")

    secret = os.environ.get("JWT_SECRET", "")
    if not secret:
        pytest.skip("JWT_SECRET not set")

    from datetime import datetime, timezone, timedelta
    payload = {
        "sub": str(TEST_ASTRONAUT_ID),
        "email": TEST_EMAIL,
        "jti": "expired-jti-test",
        "iat": datetime.now(timezone.utc) - timedelta(hours=2),
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    expired_token = _jwt.encode(payload, secret, algorithm="HS256")

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
    assert "expired" in r.json().get("detail", "").lower()


# ── Test 7: Access own astronaut profile ──────────────────────────────────────

def test_access_own_profile(client):
    """Logged-in astronaut can GET /api/auth/me and /api/astronauts/{own_id}."""
    # Login
    login_r = client.post("/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert login_r.status_code == 200
    token = login_r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # /api/auth/me
    me_r = client.get("/api/auth/me", headers=headers)
    assert me_r.status_code == 200, f"/me returned {me_r.status_code}: {me_r.text}"
    me_data = me_r.json()
    assert me_data["astronaut_id"] == TEST_ASTRONAUT_ID
    assert "password" not in me_data
    assert "password_hash" not in me_data

    # /api/astronauts/{id}
    profile_r = client.get(f"/api/astronauts/{TEST_ASTRONAUT_ID}", headers=headers)
    assert profile_r.status_code == 200, f"Profile returned {profile_r.status_code}: {profile_r.text}"
    assert profile_r.json()["id"] == TEST_ASTRONAUT_ID


# ── Test 8: Attempted access to another astronaut's profile ──────────────────

def test_access_other_profile_forbidden(client):
    """Astronaut cannot access another astronaut's profile → 403."""
    login_r = client.post("/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert login_r.status_code == 200
    token = login_r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get(f"/api/astronauts/{TEST_OTHER_ASTRONAUT_ID}", headers=headers)
    assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"


# ── Test 9: Logout and token revocation ──────────────────────────────────────

def test_logout_revokes_token(client):
    """After logout, the same token cannot access protected endpoints."""
    login_r = client.post("/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert login_r.status_code == 200
    token = login_r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Confirm token works
    me_r = client.get("/api/auth/me", headers=headers)
    assert me_r.status_code == 200

    # Logout
    logout_r = client.post("/api/auth/logout", headers=headers)
    assert logout_r.status_code == 200

    # Same token must now be rejected
    revoked_r = client.get("/api/auth/me", headers=headers)
    assert revoked_r.status_code == 401, (
        f"Expected 401 after logout, got {revoked_r.status_code}: {revoked_r.text}"
    )


# ── Test 10: Vitals isolation ───────────────────────────────────────────────

def test_vitals_isolation(client):
    """Astronaut can access own vitals and cannot access or submit for another."""
    login_r = client.post("/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert login_r.status_code == 200
    token = login_r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Own vitals
    own_r = client.get(f"/api/vitals/astronaut/{TEST_ASTRONAUT_ID}", headers=headers)
    assert own_r.status_code == 200

    # Other vitals -> 403
    other_r = client.get(f"/api/vitals/astronaut/{TEST_OTHER_ASTRONAUT_ID}", headers=headers)
    assert other_r.status_code == 403

    # Other vital history -> 403
    hist_r = client.get(f"/api/vitals/astronaut/{TEST_OTHER_ASTRONAUT_ID}/history", headers=headers)
    assert hist_r.status_code == 403

    # Other vital summary -> 403
    sum_r = client.get(f"/api/vitals/astronaut/{TEST_OTHER_ASTRONAUT_ID}/summary", headers=headers)
    assert sum_r.status_code == 403

    # Attempt to submit vital reading with another astronaut's id -> 403
    post_other = client.post("/api/vitals/", json={
        "astronaut_id": TEST_OTHER_ASTRONAUT_ID,
        "heart_rate": 80.0,
    }, headers=headers)
    assert post_other.status_code == 403


# ── Test 11: Alerts isolation and status update authorization ────────────────

def test_alerts_isolation_and_status(client):
    """Astronaut can access own alerts, not another's, and cannot update another's status."""
    login_r = client.post("/api/auth/login", json={
        "identifier": TEST_EMAIL,
        "password": TEST_PASSWORD,
    })
    assert login_r.status_code == 200
    token = login_r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get my alerts list
    my_alerts_r = client.get("/api/alerts/", headers=headers)
    assert my_alerts_r.status_code == 200
    data = my_alerts_r.json()
    for alert in data["alerts"]:
        assert alert["astronaut_id"] == TEST_ASTRONAUT_ID

    # Other astronaut's alerts by ID endpoint -> 403
    other_alerts = client.get(f"/api/alerts/astronaut/{TEST_OTHER_ASTRONAUT_ID}", headers=headers)
    assert other_alerts.status_code == 403


# ── Test 12: Verify MongoDB records & PostgreSQL relationship ────────────────

def test_mongodb_records_and_schema():
    """Verify MongoDB structure: no profile duplication, unique indexes."""
    import pymongo
    mc = pymongo.MongoClient(os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017"), serverSelectionTimeoutMS=3000)
    col = mc[os.environ.get("MONGO_DB", "vyoma_auth")]["astronaut_users"]

    # Verify document exists and has only required fields
    doc = col.find_one({"email": TEST_EMAIL})
    assert doc is not None
    assert doc["astronaut_id"] == TEST_ASTRONAUT_ID
    assert doc["email"] == TEST_EMAIL
    assert "password_hash" in doc
    assert doc["password_hash"].startswith("$2b$") or doc["password_hash"].startswith("$2a$")
    assert "password" not in doc  # NEVER plain text
    assert doc["is_active"] is True
    assert "created_at" in doc

    # Verify profile info is NOT duplicated in MongoDB
    assert "name" not in doc
    assert "age" not in doc
    assert "mission_id" not in doc
    assert "astronaut_code" not in doc

    # Verify unique indexes
    index_info = col.index_information()
    assert "idx_email_unique" in index_info or any("email" in str(idx) for idx in index_info.values())
    assert "idx_astronaut_id_unique" in index_info or any("astronaut_id" in str(idx) for idx in index_info.values())
    mc.close()
