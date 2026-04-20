import os

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def login_token() -> str:
    email = os.getenv("TEST_USER_EMAIL", "Akash@example.com")
    password = os.getenv("TEST_USER_PASSWORD", "akash")

    r = client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def auth_headers() -> dict:
    return {"Authorization": f"Bearer {login_token()}"}


def test_protected_requires_auth():
    r = client.get("/students/")
    assert r.status_code in (401, 403)


def test_login_and_me():
    r = client.get("/auth/me", headers=auth_headers())
    assert r.status_code == 200
    assert "email" in r.json()


def test_student_search():
    r = client.get("/students/search?dataset_id=2&limit=5", headers=auth_headers())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_dashboard_summary():
    r = client.get("/dashboard/summary", headers=auth_headers())
    assert r.status_code == 200
    data = r.json()
    assert "total_students" in data
    assert "risk_counts" in data


def test_intervention_suggestions():
    # Pick a student from dataset 2
    r = client.get("/students/search?dataset_id=2&limit=1", headers=auth_headers())
    assert r.status_code == 200
    results = r.json()
    assert results, "No students found in dataset_id=2"
    student_id = results[0]["student"]["student_id"]

    # Ensure there is a prediction
    client.post(f"/predictions/generate/{student_id}", headers=auth_headers())

    r2 = client.get(f"/interventions/suggestions/{student_id}", headers=auth_headers())
    assert r2.status_code == 200
    body = r2.json()
    assert "suggestions" in body