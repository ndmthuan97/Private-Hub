"""
cookie_manager.py — Handles Google cookie lifecycle for GitHub Actions.

Responsibilities:
  1. Parse and check cookie expiry dates (warn if expiring within 7 days)
  2. After a successful NotebookLM session, extract fresh cookies
  3. Automatically update the GOOGLE_COOKIES GitHub Secret via GitHub API
     so every successful run self-refreshes the auth — no manual intervention needed.
"""

import base64
import json
import os
import time
from datetime import datetime, timezone
from typing import Optional


# ─── Cookie expiry check ──────────────────────────────────────────────────────

def check_cookie_expiry(cookies: list[dict], warn_days: int = 7) -> dict:
    """
    Scan cookies for expiry dates.
    Returns a summary with the earliest expiry and a warning flag.
    """
    now_ts = time.time()
    earliest_ts: Optional[float] = None
    expiring_soon: list[str] = []

    for cookie in cookies:
        exp = cookie.get("expirationDate") or cookie.get("expires")
        if not exp or exp <= 0:
            continue  # Session cookie — no fixed expiry
        if earliest_ts is None or exp < earliest_ts:
            earliest_ts = exp
        days_left = (exp - now_ts) / 86400
        if days_left <= warn_days:
            expiring_soon.append(f"{cookie.get('name', 'unknown')} ({days_left:.1f} days)")

    if earliest_ts:
        earliest_dt = datetime.fromtimestamp(earliest_ts, tz=timezone.utc)
        days_remaining = (earliest_ts - now_ts) / 86400
    else:
        earliest_dt = None
        days_remaining = 999  # Session cookies — no expiry

    return {
        "earliest_expiry": earliest_dt.isoformat() if earliest_dt else None,
        "days_remaining": days_remaining,
        "expiring_soon": expiring_soon,
        "needs_warning": len(expiring_soon) > 0,
    }


# ─── Self-refresh: update GitHub Secret via GitHub API ────────────────────────

def refresh_github_secret(new_cookies_json: str) -> bool:
    """
    Update the GOOGLE_COOKIES GitHub Secret with fresh cookies.

    Requirements (set automatically in GitHub Actions):
      - GITHUB_TOKEN env var with secrets: write permission
      - GITHUB_REPOSITORY env var (e.g. "username/private-hub")

    Returns True if update succeeded, False otherwise.
    """
    try:
        import requests
        from nacl import encoding, public  # PyNaCl for encryption

        token = os.environ.get("GITHUB_TOKEN")
        repo  = os.environ.get("GITHUB_REPOSITORY")

        if not token or not repo:
            print("⚠️  GITHUB_TOKEN or GITHUB_REPOSITORY not set — skipping secret refresh.")
            return False

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

        # Step 1: Get the repo's public key (needed for secret encryption)
        key_resp = requests.get(
            f"https://api.github.com/repos/{repo}/actions/secrets/public-key",
            headers=headers,
            timeout=15,
        )
        key_resp.raise_for_status()
        key_data = key_resp.json()

        # Step 2: Encrypt new cookie value with repo public key (GitHub requirement)
        pub_key = public.PublicKey(
            key_data["key"].encode("utf-8"),
            encoding.Base64Encoder(),
        )
        sealed = public.SealedBox(pub_key)
        encrypted_bytes = sealed.encrypt(new_cookies_json.encode("utf-8"))
        encrypted_b64 = base64.b64encode(encrypted_bytes).decode("utf-8")

        # Step 3: PUT updated secret
        put_resp = requests.put(
            f"https://api.github.com/repos/{repo}/actions/secrets/GOOGLE_COOKIES",
            headers=headers,
            json={"encrypted_value": encrypted_b64, "key_id": key_data["key_id"]},
            timeout=15,
        )
        put_resp.raise_for_status()

        print("🔄 GitHub Secret 'GOOGLE_COOKIES' updated with fresh cookies.")
        return True

    except ImportError:
        print("⚠️  PyNaCl not installed — cannot auto-refresh cookies. Add 'PyNaCl' to requirements.txt.")
        return False
    except Exception as exc:
        print(f"⚠️  Failed to refresh GitHub Secret: {exc}")
        return False


# ─── Telegram notification ────────────────────────────────────────────────────

def send_telegram_alert(message: str) -> None:
    """
    Send a Telegram message if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.
    Optional — workflow continues even if this fails.
    """
    try:
        import requests

        token   = os.environ.get("TELEGRAM_BOT_TOKEN")
        chat_id = os.environ.get("TELEGRAM_CHAT_ID")

        if not token or not chat_id:
            return  # Telegram not configured — silently skip

        requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"},
            timeout=10,
        )
    except Exception:
        pass  # Never let notification failure break the main flow


# ─── Extract fresh cookies from notebooklm-py session ────────────────────────

def extract_fresh_cookies(client) -> Optional[str]:
    """
    After a successful notebooklm-py session, extract updated cookies.
    Returns JSON string of fresh cookies, or None if extraction fails.
    """
    try:
        # notebooklm-py exposes cookies via client.cookies or client.session.cookies
        if hasattr(client, "cookies"):
            cookies = client.cookies
        elif hasattr(client, "session") and hasattr(client.session, "cookies"):
            cookies = list(client.session.cookies)
        else:
            return None

        if isinstance(cookies, list):
            return json.dumps(cookies)
        # Requests CookieJar → convert to list of dicts
        cookie_list = [
            {
                "name": c.name,
                "value": c.value,
                "domain": c.domain,
                "path": c.path,
                "expirationDate": c.expires,
                "secure": bool(c.secure),
            }
            for c in cookies
        ]
        return json.dumps(cookie_list)
    except Exception:
        return None
