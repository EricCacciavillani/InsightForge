"""
Utility helpers: slugify, JSON safe load, arbiter feedback summary, notifications.
"""

import os
import re
import json
from typing import Any, Dict, List, Optional

import requests

from .config import NOTIFY_WEBHOOK_ENV


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower()
    return slug[:80] if len(slug) > 80 else slug


def safe_json_load(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_text": text, "parse_error": True}


def summarize_arbiter_feedback(feedback: Optional[Dict[str, Any]]) -> str:
    if not feedback or "final_judgement" not in feedback:
        return "None (no prior arbiter feedback)."

    lines: List[str] = []
    lines.append(f"Final judgement last cycle: {feedback.get('final_judgement')}")
    rs = feedback.get("reasoning_summary")
    if rs:
        lines.append(f"Reasoning summary: {rs}")

    if feedback.get("constraint_violations_or_risks"):
        lines.append("\nConstraint violations or risks:")
        for r in feedback["constraint_violations_or_risks"]:
            lines.append(f"- {r}")

    if feedback.get("math_concerns"):
        lines.append("\nMath/latency/VRAM concerns:")
        for m in feedback["math_concerns"]:
            lines.append(f"- {m}")

    if feedback.get("priority_issues_to_investigate"):
        lines.append("\nPriority issues to investigate next cycle:")
        for i in feedback["priority_issues_to_investigate"]:
            lines.append(f"- {i}")

    if feedback.get("suggested_changes_to_pipeline"):
        lines.append("\nSuggested changes to the research/debate pipeline:")
        for s in feedback["suggested_changes_to_pipeline"]:
            lines.append(f"- {s}")

    return "\n".join(lines)


def notify_iphone(message: str) -> None:
    """
    Send a push-like notification to iPhone via a webhook URL.

    Set NEURA_NOTIFY_WEBHOOK in your env to a service that triggers a push
    (IFTTT, Pushcut, Pushover, custom Shortcut, etc.)
    """
    url = os.environ.get(NOTIFY_WEBHOOK_ENV)
    if not url:
        print("[Notify] NEURA_NOTIFY_WEBHOOK not set; skipping iPhone notification.")
        return
    try:
        resp = requests.post(url, json={"text": message}, timeout=10)
        print(f"[Notify] Sent notification, status {resp.status_code}")
    except Exception as e:
        print(f"[Notify] Failed to send notification: {e}")
