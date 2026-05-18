import os

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def login_token() -> str:
    # login  with the test user and return a bearer token 
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
    #build auth headers for requests that need authentication
    return {"Authorization": f"Bearer {login_token()}"}


def test_password_reset_unknown_email():
    r = client.post("/auth/request-password-reset", json={"email": "nobody-here@example.com"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "message" in body
    assert body.get("reset_token") is None


def test_protected_requires_auth():
    #protected routes should reject requests without a token 
    r = client.get("/students/")
    assert r.status_code in (401, 403)


def test_login_and_me():
    # a valid test login should be able to read the current user
    r = client.get("/auth/me", headers=auth_headers())
    assert r.status_code == 200
    assert "email" in r.json()


def test_student_search():
    #student search should return a list 
    r = client.get("/students/search?limit=5", headers=auth_headers())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_dashboard_summary():
    #dashboard summary should include the main count fields
    r = client.get("/dashboard/summary", headers=auth_headers())
    assert r.status_code == 200
    data = r.json()
    assert "total_students" in data
    assert "risk_counts" in data


def test_intervention_suggestions():
    #Generate a prediction for one student and then check intervention suggestions
    r = client.get("/students/search?limit=1", headers=auth_headers())
    assert r.status_code == 200
    results = r.json()
    assert results, "No students found"
    student_id = results[0]["student"]["student_id"]

    # Make sure there is a prediction
    client.post(f"/predictions/generate/{student_id}", headers=auth_headers())

    r2 = client.get(f"/interventions/suggestions/{student_id}", headers=auth_headers())
    assert r2.status_code == 200
    body = r2.json()
    assert "suggestions" in body