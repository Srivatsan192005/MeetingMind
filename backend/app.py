from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import re
import urllib.error
import urllib.request
import subprocess
import threading

load_dotenv()

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")


def _normalize_gemini_model(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        return ""
    return cleaned if cleaned.startswith("models/") else f"models/{cleaned}"


def _parse_model_spec(spec: str) -> dict:
    raw = (spec or "").strip()
    if not raw:
        return {}
    if ":" not in raw:
        return {"provider": "gemini", "model": _normalize_gemini_model(raw)}

    provider, model = raw.split(":", 1)
    provider = provider.strip().lower()
    model = model.strip()
    if provider == "gemini":
        model = _normalize_gemini_model(model)
    return {"provider": provider, "model": model}


def _load_model_pool() -> list:
    env_list = os.getenv("AI_MODEL_POOL", "").strip()
    if env_list:
        entries = [_parse_model_spec(item) for item in env_list.split(",")]
    else:
        entries = [
            {"provider": "openai", "model": "gpt-4.1-mini"},
            {"provider": "groq", "model": "llama-3.1-70b-versatile"},
            {"provider": "gemini", "model": _normalize_gemini_model(os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash"))},
            {"provider": "mistral", "model": "mistral-large-latest"},
        ]

    deduped = []
    seen = set()
    for entry in entries:
        provider = (entry.get("provider") or "").strip().lower()
        model = (entry.get("model") or "").strip()
        if not provider or not model:
            continue
        key = f"{provider}:{model}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append({"provider": provider, "model": model})

    if len(deduped) > 4:
        deduped = deduped[:4]

    if not deduped:
        deduped = [{"provider": "gemini", "model": _normalize_gemini_model("models/gemini-2.5-flash")}]

    return deduped


MODEL_POOL = _load_model_pool()
LAST_SUCCESS = {"provider": MODEL_POOL[0]["provider"], "model": MODEL_POOL[0]["model"]}

# ── In-memory meeting store (replace with DB for production) ──────────────────
meetings = []


# ── Helper: call LLMs with fallback ──────────────────────────────────────────
def _call_gemini(system: str, user: str, model: str, max_tokens: int, is_json: bool) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY/GOOGLE_API_KEY.")

    payload = {
        "systemInstruction": {
            "parts": [{"text": system}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user}],
            }
        ],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
        },
    }

    if is_json:
        payload["generationConfig"]["responseMimeType"] = "application/json"

    url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={GEMINI_API_KEY}"
    request_data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=request_data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini HTTP {e.code}: {error_body}") from e

    candidates = response_data.get("candidates", [])
    if not candidates:
        raise RuntimeError(f"Gemini returned no candidates: {response_data}")

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError(f"Gemini returned empty text: {response_data}")
    return text


def _call_openai(system: str, user: str, model: str, max_tokens: int, is_json: bool) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("Missing OPENAI_API_KEY.")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
    }
    if is_json:
        payload["response_format"] = {"type": "json_object"}

    request_data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=request_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPENAI_API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI HTTP {e.code}: {error_body}") from e

    choices = response_data.get("choices", [])
    if not choices:
        raise RuntimeError(f"OpenAI returned no choices: {response_data}")

    content = choices[0].get("message", {}).get("content", "")
    if not content:
        raise RuntimeError(f"OpenAI returned empty text: {response_data}")
    return content.strip()


def _call_groq(system: str, user: str, model: str, max_tokens: int, is_json: bool) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("Missing GROQ_API_KEY.")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
    }
    if is_json:
        payload["response_format"] = {"type": "json_object"}

    request_data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=request_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Groq HTTP {e.code}: {error_body}") from e

    choices = response_data.get("choices", [])
    if not choices:
        raise RuntimeError(f"Groq returned no choices: {response_data}")

    content = choices[0].get("message", {}).get("content", "")
    if not content:
        raise RuntimeError(f"Groq returned empty text: {response_data}")
    return content.strip()


def _call_mistral(system: str, user: str, model: str, max_tokens: int, is_json: bool) -> str:
    if not MISTRAL_API_KEY:
        raise RuntimeError("Missing MISTRAL_API_KEY.")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
    }

    request_data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        "https://api.mistral.ai/v1/chat/completions",
        data=request_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MISTRAL_API_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Mistral HTTP {e.code}: {error_body}") from e

    choices = response_data.get("choices", [])
    if not choices:
        raise RuntimeError(f"Mistral returned no choices: {response_data}")

    content = choices[0].get("message", {}).get("content", "")
    if not content:
        raise RuntimeError(f"Mistral returned empty text: {response_data}")
    return content.strip()


def call_llm(system: str, user: str, max_tokens: int = 1500, is_json: bool = False) -> str:
    errors = []
    for entry in MODEL_POOL:
        provider = entry["provider"]
        model = entry["model"]
        try:
            if provider == "gemini":
                text = _call_gemini(system, user, model, max_tokens, is_json)
            elif provider == "openai":
                text = _call_openai(system, user, model, max_tokens, is_json)
            elif provider == "groq":
                text = _call_groq(system, user, model, max_tokens, is_json)
            elif provider == "mistral":
                text = _call_mistral(system, user, model, max_tokens, is_json)
            else:
                errors.append(f"{provider}:{model} -> unsupported provider")
                continue

            global LAST_SUCCESS
            LAST_SUCCESS = {"provider": provider, "model": model}
            return text
        except Exception as e:
            errors.append(f"{provider}:{model} -> {str(e)}")

    raise RuntimeError("All models failed. " + " | ".join(errors))


BLOCKED_EMAIL_PATTERNS = [
    r"```",
    r"\bas an ai\b",
    r"\bhere(?:'s| is) (?:the )?email\b",
    r"\bsubject line:\b",
    r"\bemail body:\b",
    r"\bhi this and this\b",
    r"\[(?:your name|insert name|recipient name|date|company)\]",
]

EMAIL_TARGETS = {
    "concise": (120, 160),
    "formal": (190, 260),
}


def _has_blocked_email_content(text: str) -> bool:
    lowered = text.lower()
    return any(re.search(pattern, lowered, flags=re.IGNORECASE) for pattern in BLOCKED_EMAIL_PATTERNS)


def _sanitize_email_text(text: str) -> str:
    cleaned = text.replace("```", "")
    lines = cleaned.splitlines()
    filtered = []

    for line in lines:
        if re.search(r"\bhere(?:'s| is) (?:the )?email\b", line, flags=re.IGNORECASE):
            continue
        if re.search(r"\bsubject line:\b", line, flags=re.IGNORECASE):
            continue
        if re.search(r"\bemail body:\b", line, flags=re.IGNORECASE):
            continue
        filtered.append(line)

    cleaned = "\n".join(filtered)
    cleaned = re.sub(r"\[(?:your name|insert name|recipient name|date|company)\]", "Your Name", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


def _email_word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text))


def _is_email_incomplete(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return True

    # Require a clear professional closing + signature.
    has_professional_close = bool(
        re.search(r"(best regards|kind regards|sincerely|regards),?\s*\n\s*your name\s*$", stripped, flags=re.IGNORECASE)
    )

    # Guard against abrupt truncation when the output ends mid-thought.
    ends_cleanly = stripped.endswith("Your Name") or bool(re.search(r"[.!?]\s*$", stripped))

    return (not has_professional_close) or (not ends_cleanly)


def _needs_email_rewrite(text: str, min_words: int, max_words: int) -> bool:
    wc = _email_word_count(text)
    return wc < min_words or wc > max_words or _is_email_incomplete(text)


def _build_fallback_email(subject: str, title: str, summary_text: str, action_items: list, decisions: list) -> str:
    summary_clean = (summary_text or "We reviewed progress, aligned on priorities, and confirmed next steps.").strip()
    if not summary_clean.endswith((".", "!", "?")):
        summary_clean += "."

    decisions_text = ""
    if decisions:
        first_two = decisions[:2]
        decisions_text = " ".join(d.strip().rstrip(".") + "." for d in first_two if isinstance(d, str) and d.strip())

    numbered_actions = []
    for idx, item in enumerate(action_items[:4], start=1):
        if not isinstance(item, dict):
            continue
        desc = (item.get("description") or "Follow up on assigned tasks").strip()
        assignee = (item.get("assignee") or "Owner").strip() if item.get("assignee") else "Owner"
        deadline = (item.get("deadline") or "next reporting cycle").strip() if item.get("deadline") else "next reporting cycle"
        numbered_actions.append(f"{idx}. {assignee} will {desc.lower()} by {deadline}.")

    if not numbered_actions:
        numbered_actions = [
            "1. Team leads will confirm ownership and timelines for all open items by the next reporting cycle.",
            "2. The project manager will circulate status updates and escalate any blockers early.",
            "3. Stakeholders will review progress and provide feedback before the next check-in.",
        ]

    body = (
        f"Subject: {subject}\n\n"
        "Hello everyone,\n\n"
        f"Thank you for your time in today\'s meeting on {title}. {summary_clean}"
        f" {decisions_text}".strip()
        + "\n\n"
        "To keep execution on track, please follow the action items below:\n"
        + "\n".join(numbered_actions)
        + "\n\n"
        "Please flag any corrections or dependencies by end of day, and we will incorporate them in the next update. "
        "If there are no changes, we will proceed with this plan and track completion against the agreed timeline.\n\n"
        "Kind regards,\n"
        "Your Name"
    )

    return _sanitize_email_text(body)


# ── Routes ────────────────────────────────────────────────────────────────────


@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "ok", "message": "MeetingMind backend is running", "api": "/api/health"})


@app.route("/api", methods=["GET"])
def api_root():
    return jsonify({"status": "ok", "message": "Use /api/health, /api/process, /api/email, /api/chat, or /api/search"})

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": f"{LAST_SUCCESS['provider']}:{LAST_SUCCESS['model']}",
        "models": [f"{m['provider']}:{m['model']}" for m in MODEL_POOL],
    })


@app.route("/api/process", methods=["POST"])
def process_meeting():
    """
    Process raw meeting notes → structured JSON.
    Body: { "notes": "..." }
    """
    data = request.get_json()
    notes = data.get("notes", "").strip()
    if not notes:
        return jsonify({"error": "No meeting notes provided"}), 400

    system_prompt = """You are an expert meeting analyst. Extract structured information from meeting notes or transcripts.

Return ONLY valid JSON (no markdown, no extra text) with this exact structure:
{
  "title": "Short descriptive title for the meeting (5-8 words max)",
  "summary": "3-4 sentence overview covering the main purpose, key topics discussed, and outcomes",
  "action_items": [
    {
      "description": "Clear, specific task description",
      "assignee": "Person's name if clearly mentioned, else null",
      "deadline": "Specific date or relative term if mentioned, else null"
    }
  ],
  "decisions": [
    "One concise sentence per key decision made"
  ]
}

ASSIGNEE EXTRACTION RULES:
- If someone says "I will" or "I'll", use that person's name from context.
- If "we agreed" or "the team will", set assignee to null.
- Only extract names explicitly linked to the task — never guess.
- If the same task is mentioned twice with different assignees, use the most recent/specific one.

DECISION RULES:
- Only include real decisions (choices made, things approved/rejected).
- Do NOT include action items or discussion points as decisions.
- State decisions as facts: "X was approved", "The team decided to..."
"""

    try:
        raw = call_llm(system_prompt, f"Analyze this meeting:\n\n{notes}", max_tokens=4000, is_json=True)
        # Strip possible markdown fences
        clean = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)
    except json.JSONDecodeError as e:
        return jsonify({"error": f"Failed to parse LLM output: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Store meeting
    meeting_id = len(meetings)
    meeting = {
        "id": meeting_id,
        "title": result.get("title", "Untitled Meeting"),
        "raw": notes,
        "result": result,
    }
    meetings.append(meeting)

    return jsonify({"meeting_id": meeting_id, **result})


@app.route("/api/meetings", methods=["GET"])
def list_meetings():
    """Return all stored meetings (without raw transcript for brevity)."""
    return jsonify([
        {"id": m["id"], "title": m["title"],
         "action_count": len(m["result"].get("action_items", []))}
        for m in meetings
    ])


@app.route("/api/meetings/<int:meeting_id>", methods=["GET"])
def get_meeting(meeting_id):
    if meeting_id >= len(meetings):
        return jsonify({"error": "Meeting not found"}), 404
    return jsonify(meetings[meeting_id])


@app.route("/api/meetings/<int:meeting_id>", methods=["PUT"])
def update_meeting(meeting_id):
    data = request.get_json(silent=True) or {}

    if meeting_id < 0 or meeting_id >= len(meetings):
        return jsonify({"error": "Meeting not found"}), 404

    current = meetings[meeting_id]
    updated = {
        **current,
        "title": data.get("title", current.get("title", "Untitled Meeting")),
        "raw": data.get("raw", current.get("raw", "")),
        "result": data.get("result", current.get("result", {})),
        "full_meeting_json": data.get("full_meeting_json", data or current.get("full_meeting_json", {})),
    }
    meetings[meeting_id] = updated
    return jsonify(updated)


@app.route("/api/email", methods=["POST"])
def generate_email():
    """
    Generate a follow-up email from a meeting result.
    Body: { "meeting_id": 0 }  OR  { "title": "...", "summary": "...", "action_items": [...], "decisions": [...] }
    """
    data = request.get_json(silent=True) or {}

    # Accept either a meeting_id reference or inline data
    if "meeting_id" in data:
        try:
            mid = int(data["meeting_id"])
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid meeting_id"}), 400

        if mid < 0 or mid >= len(meetings):
            return jsonify({"error": "Meeting not found"}), 404
        m = meetings[mid]
        r = m["result"]
        title = m["title"]
        transcript_excerpt = m.get("raw", "")[:1200]
    else:
        if not isinstance(data, dict) or not data:
            return jsonify({"error": "No meeting data provided"}), 400
        r = data
        title = data.get("title", "Meeting")
        transcript_excerpt = data.get("raw", "")[:1200] if isinstance(data.get("raw", ""), str) else ""

    summary_value = r.get("summary", "")
    summary_text = summary_value.get("overview", "") if isinstance(summary_value, dict) else summary_value
    key_points = []
    if isinstance(summary_value, dict):
        key_points = summary_value.get("key_points", []) or []

    action_items_data = r.get("action_items", []) if isinstance(r.get("action_items", []), list) else []
    decisions_data = r.get("decisions", []) if isinstance(r.get("decisions", []), list) else []

    action_lines = "\n".join(
        f"• {a.get('description', 'Follow up on assigned tasks')}"
        + (f" ({a['assignee']})" if a.get("assignee") else "")
        + (f" — due {a['deadline']}" if a.get("deadline") else "")
        for a in action_items_data
        if isinstance(a, dict)
    )
    decision_lines = "\n".join(f"• {d}" for d in decisions_data)
    subject = f"Follow-up: {title}"

    mode = (data.get('mode') or data.get('tone') or '').strip().lower() or 'concise'
    if mode not in EMAIL_TARGETS:
        mode = 'concise'

    mode_instructions = {
        'concise': 'Use a concise, executive tone: short paragraphs, direct language, and focus on essentials.',
        'formal': 'Use a formal, highly professional tone: full salutations, formal closings, and polished language.'
    }

    paragraph_guidance = (
        "Write 2-3 short paragraphs with tight sentences." if mode == "concise"
        else "Write 4-5 paragraphs with complete, formal sentences."
    )

    min_words, max_words = EMAIL_TARGETS[mode]

    prompt = f"""Write a polished, ready-to-send business email for the meeting below.
Mode: {mode}. {mode_instructions.get(mode, mode_instructions['concise'])}

Meeting: {title}
Summary: {summary_text}

Key Points:
{chr(10).join(f'- {point}' for point in key_points) if key_points else '- None provided'}

Action Items:
{action_lines}

Key Decisions:
{decision_lines}

Transcript excerpt:
{transcript_excerpt}

Write an actual email, not notes.

Hard requirements:
- Start with exactly one subject line in this format: "Subject: {subject}"
- Use a professional greeting such as "Dear team," or "Hello everyone,"
- {paragraph_guidance}
- Summarize the meeting outcome and decisions in natural language
- Include a short numbered action-item section inside the email body
- Add a brief closing paragraph that thanks the recipients and confirms next steps
- End with a professional closing such as "Best regards," or "Kind regards,"
- Sign the email as "Your Name"
- Do not use a casual opening like "Hi this and this"
- Do not output bullet-point notes, metadata, markdown fences, or commentary outside the email
- Target {min_words}-{max_words} words (not too short, not too long)
- Ensure the email is complete and not cut off mid-sentence

If the meeting has action items, keep the tone aligned with the selected mode. Output ONLY the final email text, nothing else."""

    try:
        # Adjust max tokens slightly for concise vs formal
        max_tokens = 900 if mode == 'concise' else 1400
        email_text = call_llm("You are a professional business writer.", prompt, max_tokens=max_tokens)
        email_text = _sanitize_email_text(email_text.strip())
        if not email_text.lower().startswith("subject:"):
            email_text = f"Subject: {subject}\n\n{email_text}"

        if _needs_email_rewrite(email_text, min_words, max_words):
            expansion_prompt = f"""Rewrite the following email so it is complete, professional, and medium length.

Original email:
{email_text}

Requirements:
- Keep it professional and natural
- Keep the original facts, decisions, and action items
- Keep exactly one subject line at the top
- Keep a professional greeting
- Keep a numbered action-item section
- End with "Best regards," or "Kind regards," followed by "Your Name"
- Target {min_words}-{max_words} words
- Ensure no abrupt ending or cut-off sentence
- Keep the numbered action items
- Do not add any new facts
- Output only the revised email text"""
            expanded_email = call_llm("You are a professional business writer.", expansion_prompt, max_tokens=1600)
            expanded_email = _sanitize_email_text(expanded_email.strip())
            if not expanded_email.lower().startswith("subject:"):
                expanded_email = f"Subject: {subject}\n\n{expanded_email}"
            email_text = expanded_email

        if _has_blocked_email_content(email_text):
            cleanup_prompt = f"""Rewrite the email below so it is clean and ready to send.

Rules:
- Keep all factual content and action items
- Keep exactly one subject line at the top
- Do not include markdown fences
- Do not include placeholders like [Your Name], [Insert Name], [Date], or [Company]
- Do not include metadata labels like "Subject line:" or "Email body:"
- Do not include prefaces like "Here is the email"
- Use a professional greeting and close with "Your Name"

Email:
{email_text}
"""
            cleaned_email = call_llm("You are a professional business writer.", cleanup_prompt, max_tokens=1400)
            email_text = _sanitize_email_text(cleaned_email.strip())
            if not email_text.lower().startswith("subject:"):
                email_text = f"Subject: {subject}\n\n{email_text}"

        if _needs_email_rewrite(email_text, min_words, max_words):
            final_pass_prompt = f"""Produce a final polished follow-up email from this draft.

Draft:
{email_text}

Requirements:
- Keep all facts unchanged
- Keep one subject line at top
- Keep a professional greeting and closing
- End with "Best regards," or "Kind regards," then "Your Name"
- Length must be between {min_words} and {max_words} words
- Ensure complete, not truncated
- Output only the final email text"""
            final_email = call_llm("You are a professional business writer.", final_pass_prompt, max_tokens=1600)
            email_text = _sanitize_email_text(final_email.strip())
            if not email_text.lower().startswith("subject:"):
                email_text = f"Subject: {subject}\n\n{email_text}"

        if _needs_email_rewrite(email_text, min_words, max_words):
            email_text = _build_fallback_email(
                subject=subject,
                title=title,
                summary_text=summary_text,
                action_items=action_items_data,
                decisions=decisions_data,
            )

        return jsonify({"email": email_text})
    except Exception as e:
        # Graceful fallback when Gemini is unavailable/rate-limited.
        fallback_email = _build_fallback_email(
            subject=subject,
            title=title,
            summary_text=summary_text,
            action_items=action_items_data,
            decisions=decisions_data,
        )
        return jsonify({
            "email": fallback_email,
            "fallback": True,
            "warning": str(e),
        })


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Chat about a meeting.
    Body: { "meeting_id": 0, "messages": [...] }  OR  { "title": "...", "summary": "...", ... "messages": [...] }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No request body"}), 400

        messages = data.get("messages", [])

        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        # Try to get meeting by ID from in-memory store
        mid = data.get("meeting_id")
        if mid is not None:
            if isinstance(mid, int) and 0 <= mid < len(meetings):
                m = meetings[mid]
                r = m["result"]
                title = m["title"]
                transcript = m.get("raw", "")[:1500]
            else:
                return jsonify({"error": f"Meeting not found (id={mid}, total={len(meetings)})"}), 404
        else:
            # Use inline meeting data (for Supabase or client-stored meetings)
            title = data.get("title", "Meeting")
            summary = data.get("summary", "")
            action_items = data.get("action_items", [])
            decisions = data.get("decisions", [])
            transcript = data.get("raw", "")[:1500] if isinstance(data.get("raw", ""), str) else ""

            # Construct result object
            r = {
                "summary": summary,
                "action_items": action_items,
                "decisions": decisions,
            }

        system = f"""You are a meeting assistant. Answer questions about the following meeting concisely and helpfully.

Meeting Title: {title}
Summary: {r.get('summary', '')}
Action Items: {json.dumps(r.get('action_items', []))}
Decisions: {json.dumps(r.get('decisions', []))}
Raw transcript (excerpt): {transcript}

If asked about something not in the meeting data, say so clearly. Keep answers brief and factual."""

        reply = call_llm(system, messages[-1]["content"], max_tokens=600)
        return jsonify({"reply": reply})
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Chat error: {str(e)}\n{error_trace}")
        return jsonify({"error": str(e), "trace": error_trace}), 500


@app.route("/api/search", methods=["GET"])
def search_meetings():
    """Simple keyword search across stored meetings."""
    query = request.args.get("q", "").lower()
    if not query:
        return jsonify(meetings)

    results = []
    for m in meetings:
        text = (m["title"] + " " + m["result"].get("summary", "") + " " + m["raw"]).lower()
        if query in text:
            results.append({
                "id": m["id"],
                "title": m["title"],
                "action_count": len(m["result"].get("action_items", [])),
            })
    return jsonify(results)


if __name__ == "__main__":
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        def start_frontend():
            frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
            print("Starting frontend server...")
            subprocess.Popen("npm run dev", cwd=frontend_path, shell=True)

        threading.Thread(target=start_frontend, daemon=True).start()

    print("Backend: http://127.0.0.1:5000")
    print("Frontend: http://localhost:5174 (or next available Vite port)")
    app.run(debug=True, port=5000)