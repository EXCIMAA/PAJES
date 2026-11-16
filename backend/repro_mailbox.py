import ipaddress
from fastapi.testclient import TestClient
from app.main import create_app
import app.api.v1.auth as auth_routes

auth_routes.ipaddress = ipaddress
# force the route's ipaddress.ip_address to always return loopback
orig = ipaddress.ip_address
auth_routes.ipaddress = __import__("types").SimpleNamespace(
    ip_address=lambda host: orig("127.0.0.1")
)

app = create_app()
with TestClient(app) as c:
    r = c.get("/api/v1/auth/dev-mailbox?email=a@b.com")
    print(r.status_code, r.text[:500])
