from pathlib import Path

target = Path(r"c:\Users\treso\Downloads\ProjectPajes\project\backend\tests\test_auth.py")
s = target.read_text(encoding="utf-8")

addition = '''

# ── Resend activation ────────────────────────────────────────────────────


def test_resend_activation_queues_email_for_profile_without_credentials(
    client: TestClient, test_db: Session
):
    user_id = str(uuid.uuid4())
    test_db.add(
        Profile(
            id=user_id,
            email="resend-eligible@test.com",
            full_name="Eligible User",
            role="junior_audit",
            active=True,
        )
    )
    test_db.commit()

    response = client.post(
        "/api/v1/auth/resend-activation",
        json={"email": "RESEND-ELIGIBLE@test.com"},
    )
    assert response.status_code == 202
    assert response.json()["message"] == _GENERIC_AUTH_MESSAGE

    messages = get_development_mailbox("resend-eligible@test.com")
    assert len(messages) == 1
    assert "#token=" in messages[0].text_body


def test_resend_activation_invalidates_previous_token(
    client: TestClient, test_db: Session
):
    user_id = str(uuid.uuid4())
    test_db.add(
        Profile(
            id=user_id,
            email="resend-rotate@test.com",
            full_name="Rotate User",
            role="junior_audit",
            active=True,
        )
    )
    test_db.commit()

    client.post(
        "/api/v1/auth/resend-activation",
        json={"email": "resend-rotate@test.com"},
    )
    first_messages = get_development_mailbox("resend-rotate@test.com")
    assert len(first_messages) == 1
    first_token = parse_qs(
        urlparse(first_messages[0].text_body.splitlines()[2]).fragment
    )["token"][0]

    client.post(
        "/api/v1/auth/resend-activation",
        json={"email": "resend-rotate@test.com"},
    )
    second_messages = get_development_mailbox("resend-rotate@test.com")
    assert len(second_messages) == 1
    second_token = parse_qs(
        urlparse(second_messages[0].text_body.splitlines()[2]).fragment
    )["token"][0]
    assert second_token != first_token

    assert _activate(client, first_token).status_code == 400
    assert _activate(client, second_token).status_code == 200
    assert test_db.query(UserCredential).count() == 1


@pytest.mark.parametrize(
    "email,setup",
    [
        ("unknown@test.com", None),
        ("inactive@test.com", "inactive"),
        ("already@test.com", "credential"),
    ],
)
def test_resend_activation_is_generic_for_ineligible(
    client: TestClient, test_db: Session, email, setup
):
    if setup == "inactive":
        test_db.add(
            Profile(
                id=str(uuid.uuid4()),
                email=email,
                full_name="Inactive User",
                role="junior_audit",
                active=False,
            )
        )
        test_db.commit()
    elif setup == "credential":
        _create_user(test_db, email)

    response = client.post(
        "/api/v1/auth/resend-activation",
        json={"email": email},
    )
    assert response.status_code == 202
    assert response.json()["message"] == _GENERIC_AUTH_MESSAGE
    assert get_development_mailbox(email) == []


def test_signup_for_account_with_existing_credentials_returns_generic_response(
    client: TestClient, test_db: Session
):
    _create_user(test_db, "already-has-pw@test.com")

    first = _signup(client, "already-has-pw@test.com")
    second = _signup(client, "ALREADY-HAS-PW@test.com")
    assert first.status_code == second.status_code == 202
    assert first.json() == second.json() == {"message": _GENERIC_AUTH_MESSAGE}
    assert (
        test_db.query(Profile).filter_by(email="already-has-pw@test.com").count()
        == 1
    )
    assert (
        test_db.query(UserCredential)
        .filter_by(email_normalized="already-has-pw@test.com")
        .count()
        == 1
    )


def test_session_persists_across_requests(client: TestClient, test_db: Session):
    _create_user(test_db, "persist@test.com")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "persist@test.com", "password": "Test1234!"},
    )
    assert login.status_code == 200
    assert settings.auth_cookie_name in login.cookies
    assert client.get("/api/v1/auth/me").status_code == 200
    assert client.get("/api/v1/auth/me").json()["email"] == "persist@test.com"
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401


def test_development_mailbox_http_endpoint_returns_queued_messages(
    client: TestClient, test_db: Session, monkeypatch
):
    import ipaddress

    import app.api.v1.auth as auth_routes

    monkeypatch.setattr(
        auth_routes.ipaddress,
        "ip_address",
        lambda host: ipaddress.ip_address("127.0.0.1"),
    )

    assert _signup(client, "mailbox@test.com").status_code == 202

    r = client.get("/api/v1/auth/dev-mailbox?email=mailbox@test.com")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert "subject" in body[0] and "text" in body[0]
    assert "#token=" in body[0]["text"]

    # The development mailbox is consumed (popped) on retrieval
    r = client.get("/api/v1/auth/dev-mailbox?email=mailbox@test.com")
    assert r.status_code == 200
    assert r.json() == []

'''

assert addition not in s
s = s.rstrip() + "\n" + addition
target.write_text(s, encoding="utf-8")
print("appended", len(addition.splitlines()), "lines")