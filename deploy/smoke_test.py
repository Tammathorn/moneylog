"""MoneyLog read-only smoke test of a live URL (run by deploy.yml after a deploy).

    python3 deploy/smoke_test.py SERVICE_URL [EXPECTED_COMMIT]

Checks: /api/health, /api/ready (DB connected), / serves the SPA, /api/version
(matches EXPECTED_COMMIT when given), and an anonymous /api/accounts is refused
with 401. Optional sign-in check when BOTH SMOKE_EMAIL and SMOKE_PASSWORD are
set (a demo USER, never the administrator); it signs out at the end. Standard
library only; credentials are never printed.
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request

RETRIES, WAIT = 5, 3


def make_opener():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(opener, base, path, data=None):
    """Return (status, body bytes). HTTP errors are returned, not raised."""
    headers = {"Origin": base}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(base + path, headers=headers, data=json.dumps(data).encode() if data is not None else None)
    try:
        with opener.open(req, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def expect(opener, base, path, ok):
    for attempt in range(RETRIES):
        try:
            status, body = call(opener, base, path)
            if ok(status, body):
                print("PASS " + path)
                return
        except (urllib.error.URLError, TimeoutError, ValueError):
            pass
        if attempt < RETRIES - 1:
            time.sleep(WAIT)
    raise RuntimeError("Smoke check failed: " + path)


def j(body):
    return json.loads(body)


def check(base, expected_commit=None, opener=None):
    opener = opener or make_opener()
    expect(opener, base, "/api/health", lambda s, b: s == 200 and j(b).get("status") == "ok")
    expect(opener, base, "/api/ready", lambda s, b: s == 200 and j(b).get("db") == "connected")
    expect(opener, base, "/", lambda s, b: s == 200 and b"<html" in b.lower())
    expect(opener, base, "/api/version",
           lambda s, b: s == 200 and (not expected_commit or j(b).get("commit") == expected_commit))
    expect(opener, base, "/api/accounts", lambda s, b: s == 401)

    email, password = os.getenv("SMOKE_EMAIL"), os.getenv("SMOKE_PASSWORD")
    if bool(email) != bool(password):
        raise RuntimeError("Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.")
    if not email:
        print("SKIP sign-in: optional smoke credentials not configured")
        return
    signed_in = False
    try:
        status, body = call(opener, base, "/api/auth/login", {"email": email, "password": password})
        if status != 200 or j(body)["user"]["role"] != "USER":
            raise RuntimeError("Sign-in smoke check failed")
        signed_in = True
        status, _ = call(opener, base, "/api/accounts")
        if status != 200:
            raise RuntimeError("Signed-in /api/accounts failed")
        print("PASS sign-in and /api/accounts")
    finally:
        if signed_in:
            call(opener, base, "/api/auth/logout", {})
            print("PASS sign-out")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        sys.exit("Usage: python3 deploy/smoke_test.py SERVICE_URL [EXPECTED_COMMIT]")
    check(sys.argv[1].rstrip("/"), sys.argv[2] if len(sys.argv) == 3 else None)
