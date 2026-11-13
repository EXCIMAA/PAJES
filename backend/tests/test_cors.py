from fastapi.testclient import TestClient

from app.main import api_app, app


def test_unhandled_errors_keep_cors_headers():
    def fail():
        raise RuntimeError("test-only failure")

    path = "/__test_cors_failure"
    api_app.add_api_route(path, fail, methods=["GET"])
    route = api_app.router.routes[-1]
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get(
                path,
                headers={"Origin": "http://127.0.0.1:5174"},
            )
    finally:
        api_app.router.routes.remove(route)

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5174"
