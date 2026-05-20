"""
daily_sync.py — Automated NotebookLM → private-hub pipeline.

Runs daily via GitHub Actions:
  1. Check Google cookie expiry — warn if expiring within 7 days
  2. Authenticate with NotebookLM using saved Google cookies
  3. Query with vocabulary + grammar prompts
  4. POST results to /api/strategy on the deployed website
  5. Auto-refresh GitHub Secret with fresh cookies from the session
"""

import json
import os
import sys
import requests
from datetime import datetime, timezone, timedelta
from pathlib import Path

from cookie_manager import (
    check_cookie_expiry,
    extract_fresh_cookies,
    refresh_github_secret,
    send_telegram_alert,
)


# ─── Config (all from environment variables / GitHub Secrets) ─────────────────

NOTEBOOK_ID   = os.environ["NOTEBOOK_ID"]    # NotebookLM notebook UUID
WEBSITE_URL   = os.environ["WEBSITE_URL"]    # e.g. https://your-app.vercel.app
CRON_SECRET   = os.environ["CRON_SECRET"]    # same value as in .env


# ─── Grammar topics list ──────────────────────────────────────────────────────

TOPICS_FILE = Path(__file__).parent / "grammar_topics.json"

def get_today_grammar_topic() -> str:
    """Cycle through grammar topics by day-of-year so each day gets a unique topic."""
    with open(TOPICS_FILE, encoding="utf-8") as f:
        topics: list[str] = json.load(f)
    day_index = datetime.now().timetuple().tm_yday
    return topics[day_index % len(topics)]


# ─── Prompts ──────────────────────────────────────────────────────────────────

PROMPT_VOCABULARY = (
    "Hôm nay hãy lấy ngẫu nhiên 10 từ mới trong file từ vựng này "
    "(ưu tiên các từ loại Động từ và Danh từ). "
    "Hãy viết cho tôi một đoạn Email công sở (chuẩn Part 7 TOEIC) "
    "bằng 100% tiếng Anh bao gồm 10 từ này. "
    "Phía sau mỗi từ vựng đó, hãy mở ngoặc đơn và ghi nghĩa tiếng Việt của nó "
    "(ví dụ: implement (thực hiện))."
)

def build_grammar_prompt(topic: str) -> str:
    return (
        f"Hãy tóm tắt cho tôi quy tắc cốt lõi nhất của chủ điểm ngữ pháp: '{topic}'. "
        "Dùng ngôn ngữ bình dân, dễ hiểu nhất, tuyệt đối không dùng từ ngữ học thuật giáo điều. "
        "Sau đó, cho tôi 3 câu bài tập trắc nghiệm siêu ngắn để tôi test thử ngay "
        "xem có hiểu lý thuyết chưa nhé."
    )


# ─── NotebookLM query ─────────────────────────────────────────────────────────

def query_notebooklm(prompt: str) -> str:
    """
    Query NotebookLM using the unofficial notebooklm-py library.
    Requires GOOGLE_COOKIES env var (JSON string of browser cookies).
    """
    try:
        # Import here so missing package gives a clear error
        from notebooklm import NotebookLM  # type: ignore

        cookies_json = os.environ.get("GOOGLE_COOKIES", "")
        if not cookies_json:
            raise EnvironmentError(
                "GOOGLE_COOKIES secret is missing. "
                "See automation/SETUP.md for how to export your Google cookies."
            )

        cookies: list[dict] = json.loads(cookies_json)

        client = NotebookLM(cookies=cookies)
        result = client.query(notebook_id=NOTEBOOK_ID, question=prompt)

        # notebooklm-py returns an object; try common attribute names
        if hasattr(result, "answer"):
            return result.answer
        if hasattr(result, "text"):
            return result.text
        return str(result)

    except ImportError:
        # Fallback: use the nlm CLI if the library is not available
        return _query_via_cli(prompt)


def _query_via_cli(prompt: str) -> str:
    """Fallback: call the `nlm` CLI as a subprocess."""
    import subprocess

    proc = subprocess.run(
        ["nlm", "query", NOTEBOOK_ID, prompt],
        capture_output=True,
        text=True,
        timeout=180,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"nlm CLI failed:\n{proc.stderr}")
    return proc.stdout.strip()


# ─── POST to website ──────────────────────────────────────────────────────────

def post_to_website(title: str, content: str) -> dict:
    """Insert a new strategy/content entry into the private-hub website."""
    url = f"{WEBSITE_URL.rstrip('/')}/api/strategy"
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {CRON_SECRET}",
            "Content-Type": "application/json",
        },
        json={"title": title, "type": "markdown", "content": content},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    # Use Vietnam timezone (UTC+7) for date labels
    vn_tz    = timezone(timedelta(hours=7))
    today    = datetime.now(vn_tz)
    date_str = today.strftime("%d/%m/%Y")

    print(f"🚀 Starting daily sync — {date_str}")

    # ── Layer 1: Cookie expiry check ───────────────────────────────────────────
    cookies_json = os.environ.get("GOOGLE_COOKIES", "")
    if cookies_json:
        try:
            cookies_list = json.loads(cookies_json)
            expiry_info  = check_cookie_expiry(cookies_list, warn_days=7)

            if expiry_info["needs_warning"]:
                msg = (
                    f"⚠️ *private-hub Daily Sync*\n"
                    f"Một số Google cookies sắp hết hạn:\n"
                    + "\n".join(f"  • {c}" for c in expiry_info["expiring_soon"])
                    + f"\n\nTruy cập GitHub Secrets để cập nhật `GOOGLE_COOKIES`."
                )
                print(msg)
                send_telegram_alert(msg)
            else:
                days = expiry_info["days_remaining"]
                print(f"✅ Cookies valid — {days:.0f} days remaining.")
        except Exception as e:
            print(f"⚠️  Could not parse cookie expiry: {e}")

    # ── Layer 2: Query NotebookLM ──────────────────────────────────────────────
    nlm_client = None  # Will hold the session for cookie extraction later

    try:
        from notebooklm import NotebookLM  # type: ignore
        if cookies_json:
            nlm_client = NotebookLM(cookies=json.loads(cookies_json))
    except ImportError:
        pass  # Will fall back to CLI in query_notebooklm()
    except Exception as auth_err:
        # Auth failed — notify immediately and abort
        msg = (
            f"❌ *private-hub Daily Sync FAILED*\n"
            f"Ngày: {date_str}\n"
            f"Lỗi xác thực NotebookLM: `{auth_err}`\n\n"
            f"👉 Vào GitHub Secrets → cập nhật `GOOGLE_COOKIES` mới."
        )
        print(f"\n{msg}", file=sys.stderr)
        send_telegram_alert(msg)
        sys.exit(1)

    # ── Vocabulary prompt ──────────────────────────────────────────────────────
    print("\n📚 [1/2] Querying vocabulary...")
    vocab_content = query_notebooklm(PROMPT_VOCABULARY)
    post_to_website(
        title=f"[Từ vựng] {date_str}",
        content=vocab_content,
    )
    print("✅ Vocabulary saved to website.")

    # ── Grammar prompt ─────────────────────────────────────────────────────────
    topic = get_today_grammar_topic()
    print(f"\n📖 [2/2] Querying grammar — topic: '{topic}'...")
    grammar_content = query_notebooklm(build_grammar_prompt(topic))
    post_to_website(
        title=f"[Ngữ pháp] {topic} — {date_str}",
        content=grammar_content,
    )
    print("✅ Grammar saved to website.")

    # ── Layer 3: Auto-refresh GitHub Secret with fresh cookies ─────────────────
    if nlm_client is not None:
        print("\n🔄 Extracting fresh cookies from session...")
        fresh_cookies = extract_fresh_cookies(nlm_client)
        if fresh_cookies:
            refresh_github_secret(fresh_cookies)
        else:
            print("ℹ️  Could not extract fresh cookies — skipping secret refresh.")

    print("\n🎉 Daily sync completed successfully.")



if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\n❌ Sync failed: {exc}", file=sys.stderr)
        sys.exit(1)
