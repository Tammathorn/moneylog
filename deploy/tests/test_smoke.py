"""Offline tests for deploy/smoke_test.py (no network)."""
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import smoke_test  # noqa: E402

SHA = "a" * 40
GOOD = {
    "/api/health": (200, {"status": "ok"}),
    "/api/ready": (200, {"status": "ok", "db": "connected"}),
    "/": (200, "<!doctype html><html></html>"),
    "/api/version": (200, {"service": "moneylog", "commit": SHA}),
    "/api/accounts": (401, {"error": {"code": "AUTH_REQUIRED"}}),
}


def fake(routes):
    def call(_opener, _base, path, data=None):
        status, body = routes[path]
        return status, (body if isinstance(body, str) else json.dumps(body)).encode()
    return call


class SmokeTest(unittest.TestCase):
    def setUp(self):
        self.env = mock.patch.dict(os.environ, {}, clear=False)
        self.env.start()
        os.environ.pop("SMOKE_EMAIL", None)
        os.environ.pop("SMOKE_PASSWORD", None)
        smoke_test.WAIT = 0

    def tearDown(self):
        self.env.stop()

    def test_passes_on_healthy_service_with_matching_commit(self):
        with mock.patch.object(smoke_test, "call", fake(GOOD)):
            smoke_test.check("https://x", SHA, opener=object())

    def test_fails_when_running_commit_differs(self):
        with mock.patch.object(smoke_test, "call", fake(GOOD)):
            with self.assertRaisesRegex(RuntimeError, "/api/version"):
                smoke_test.check("https://x", "b" * 40, opener=object())

    def test_fails_when_database_not_connected(self):
        routes = dict(GOOD, **{"/api/ready": (503, {"db": "disconnected"})})
        with mock.patch.object(smoke_test, "call", fake(routes)):
            with self.assertRaisesRegex(RuntimeError, "/api/ready"):
                smoke_test.check("https://x", opener=object())

    def test_fails_when_protected_route_is_open(self):
        routes = dict(GOOD, **{"/api/accounts": (200, {"accounts": []})})
        with mock.patch.object(smoke_test, "call", fake(routes)):
            with self.assertRaisesRegex(RuntimeError, "/api/accounts"):
                smoke_test.check("https://x", opener=object())

    def test_requires_both_smoke_credentials(self):
        os.environ["SMOKE_EMAIL"] = "alice@moneylog.test"
        with mock.patch.object(smoke_test, "call", fake(GOOD)):
            with self.assertRaisesRegex(RuntimeError, "both"):
                smoke_test.check("https://x", opener=object())

    def test_sign_in_then_sign_out(self):
        os.environ.update(SMOKE_EMAIL="alice@moneylog.test", SMOKE_PASSWORD="x" * 12)
        calls = []
        routes = dict(GOOD)
        base = fake(routes)

        def call(o, b, path, data=None):
            calls.append(path)
            if path == "/api/auth/login":
                return 200, json.dumps({"user": {"role": "USER"}}).encode()
            if path == "/api/auth/logout":
                return 204, b""
            if path == "/api/accounts" and "/api/auth/login" in calls:
                return 200, b'{"accounts": []}'
            return base(o, b, path, data)

        with mock.patch.object(smoke_test, "call", call):
            smoke_test.check("https://x", opener=object())
        self.assertEqual(calls[-1], "/api/auth/logout")


if __name__ == "__main__":
    unittest.main()
