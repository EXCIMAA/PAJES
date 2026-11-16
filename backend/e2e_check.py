"""End-to-end smoke check of auth against the running backend on port 8000."""
import json
import http.cookiejar
import urllib.request
import urllib.error
import re

BASE = "http://127.0.0.1:8000/api/v1"
EMAIL = f"e2e-test-{__import__('uuid').uuid4().hex[:8]}@example.com"
PASSWORD = "E2eTestPass123!"

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request(method, path, body=None, csrf_token=None):
    headers = {}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if csrf_token:
        headers["X-CSRF-Token"] = csrf_token
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with opener.open(req, timeout=10) as r:
            return r.status, dict(r.headers), r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode()


csrf_token = None


def get_csrf():
    global csrf_token
    status, headers, body = request("GET", "/health")
    assert status == 200, body
    csrf_token = headers.get("x-csrf-token") or headers.get("X-CSRF-Token")
    for c in jar:
        if c.name == "pajes_csrf":
            csrf_token = c.value
    print("csrf token:", csrf_token)


print("=== 1. Bootstrap CSRF ===")
get_csrf()

print("=== 2. Signup ===")
status, headers, body = request("POST", "/auth/signup", {
    "email": EMAIL,
    "first_name": "E2e",
    "last_name": "Test",
}, csrf_token)
print(status, body)
assert status == 202, body

print("=== 3. Dev mailbox ===")
status, headers, body = request("GET", f"/auth/dev-mailbox?email={EMAIL}")
print(status, body)
assert status == 200, body
messages = json.loads(body)
assert len(messages) >= 1, "no messages in dev mailbox!"
text_body = messages[0]["text"]
print("mailbox text:", text_body[:500])
m = re.search(r"#token=([^\s\n]+)", text_body)
assert m, "no token fragment in email body"
token = m.group(1)
print("activation token:", token[:20], "...")

print("=== 4. Activate ===")
status, headers, body = request("POST", "/auth/activate", {
    "token": token,
    "password": PASSWORD,
}, csrf_token)
print(status, body)
assert status == 200, body

print("=== 5. Login ===")
status, headers, body = request("POST", "/auth/login", {
    "email": EMAIL,
    "password": PASSWORD,
}, csrf_token)
print(status, body)
assert status == 200, body
session_cookie = any(c.name == "pajes_session" for c in jar)
print("session cookie set:", session_cookie)
assert session_cookie

print("=== 6. /me ===")
status, headers, body = request("GET", "/auth/me", csrf_token=csrf_token)
print(status, body)
assert status == 200, body
profile = json.loads(body)
assert profile["email"] == EMAIL

print("=== 7. Logout ===")
status, headers, body = request("POST", "/auth/logout", {}, csrf_token)
print(status, body)
assert status == 200, body

print("=== 8. /me after logout ===")
status, headers, body = request("GET", "/auth/me", csrf_token=csrf_token)
print(status, body)
assert status == 401, body

print("=== 9. Wrong password ===")
status, headers, body = request("POST", "/auth/login", {
    "email": EMAIL,
    "password": "WrongPassword!",
}, csrf_token)
print(status, body)
assert status == 401, body

print("=== 10. Reuse activation token ===")
status, headers, body = request("POST", "/auth/activate", {
    "token": token,
    "password": PASSWORD,
}, csrf_token)
print(status, body)
assert status == 400, body

print("=== 11. Resend activation (unknown email) -> generic 202 ===")
status, headers, body = request("POST", "/auth/resend-activation", {"email": "nobody-resend@example.com"}, csrf_token)
print(status, body)
assert status == 202

print("=== 12. Resend activation after signup -> 202 + new queued message ===")
EMAIL2 = f"e2e-resend-{__import__('uuid').uuid4().hex[:8]}@example.com"
status, headers, body = request("POST", "/auth/signup", {"email": EMAIL2, "first_name": "Resend", "last_name": "User"}, csrf_token)
assert status == 202, body
status, headers, body = request("GET", f"/auth/dev-mailbox?email={EMAIL2}")
msgs1 = json.loads(body); assert len(msgs1) == 1
token_a = re.search(r"#token=([^\s\n]+)", msgs1[0]["text"]).group(1)
print("first token:", token_a[:12], "...")

status, headers, body = request("POST", "/auth/resend-activation", {"email": EMAIL2}, csrf_token)
assert status == 202, body
status, headers, body = request("GET", f"/auth/dev-mailbox?email={EMAIL2}")
msgs2 = json.loads(body); assert len(msgs2) == 1, f"expected 1 new message, got {len(msgs2)}"
token_b = re.search(r"#token=([^\s\n]+)", msgs2[0]["text"]).group(1)
print("resend token:", token_b[:12], "...")
assert token_b != token_a

print("=== 13. First token invalidated by resend; new token activates ===")
status, headers, body = request("POST", "/auth/activate", {"token": token_a, "password": PASSWORD}, csrf_token)
print("activate with old token:", status, body)
assert status == 400, body
status, headers, body = request("POST", "/auth/activate", {"token": token_b, "password": PASSWORD}, csrf_token)
print("activate with new token:", status, body)
assert status == 200, body

print("=== 14. Login with resend-activated account ===")
status, headers, body = request("POST", "/auth/login", {"email": EMAIL2, "password": PASSWORD}, csrf_token)
print(status, body)
assert status == 200, body
assert any(c.name == "pajes_session" for c in jar)
status, headers, body = request("GET", "/auth/me", csrf_token=csrf_token)
assert status == 200, body
status, headers, body = request("POST", "/auth/logout", {}, csrf_token)
assert status == 200, body

print("\nALL E2E CHECKS PASSED")
