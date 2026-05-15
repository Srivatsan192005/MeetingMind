from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
import os
import json
import re

load_dotenv()

app = Flask(__name__)
CORS(app)

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
MODEL = "gemini-2.5-flash"

# ── In-memory meeting store (replace with DB for production) ──────────────────
meetings = []


# ── Helper: call Gemini ──────────────────────────────────────────────────────
def call_gemini(system: str, user: str, max_tokens: int = 1500, is_json: bool = False) -> str:
    if not api_key:
        raise RuntimeError(
            "No API key found. Set GOOGLE_API_KEY or GEMINI_API_KEY in your environment or .env file."
        )
        
    config = {"max_output_tokens": max_tokens}
    if is_json:
        config["response_mime_type"] = "application/json"
        
    model = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=system,
        generation_config=config
    )
    response = model.generate_content(user)
    return response.text


# ── Routes ────────────────────────────────────────────────────────────────────


@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "ok", "message": "MeetingMind backend is running", "api": "/api/health"})


@app.route("/api", methods=["GET"])
def api_root():
    return jsonify({"status": "ok", "message": "Use /api/health, /api/process, /api/email, /api/chat, or /api/search"})

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL})


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
  "highlights": [
    {
      "type": "Must be one of: critical, financial, positive, risk, info",
      "text": "Short, punchy highlight (e.g. 'Critical deadline detected: July 15')"
    }
  ],
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

HIGHLIGHT RULES:
- Identify 2-4 key moments, risks, deadlines, or approvals.
- Use 'critical' for hard deadlines or blockers.
- Use 'financial' for budget, cost, or revenue mentions.
- Use 'positive' for praise or milestones achieved.
- Use 'risk' for potential issues or warnings.
- Use 'info' for other major announcements.

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
        raw = call_gemini(system_prompt, f"Analyze this meeting:\n\n{notes}", is_json=True)
        # Strip possible markdown fences
        clean = raw.replace("```json", "").replace("```", "").strip()
        # Remove trailing commas before parsing
        clean = re.sub(r',\s*([\]}])', r'\1', clean)
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


@app.route("/api/email", methods=["POST"])
def generate_email():
    """
    Generate a follow-up email from a meeting result.
    Body: { "meeting_id": 0 }  OR  { "title": "...", "summary": "...", "action_items": [...], "decisions": [...] }
    """
    data = request.get_json()

    # Accept either a meeting_id reference or inline data
    if "meeting_id" in data:
        mid = data["meeting_id"]
        if mid >= len(meetings):
            return jsonify({"error": "Meeting not found"}), 404
        r = meetings[mid]["result"]
        title = meetings[mid]["title"]
    else:
        r = data
        title = data.get("title", "Meeting")

    action_lines = "\n".join(
        f"• {a['description']}"
        + (f" ({a['assignee']})" if a.get("assignee") else "")
        + (f" — due {a['deadline']}" if a.get("deadline") else "")
        for a in r.get("action_items", [])
    )
    decision_lines = "\n".join(f"• {d}" for d in r.get("decisions", []))

    prompt = f"""Write a professional follow-up email for this meeting.

Meeting: {title}
Summary: {r.get('summary', '')}

Action Items:
{action_lines}

Key Decisions:
{decision_lines}

Write a friendly but professional follow-up email. Include:
- A brief intro referencing the meeting
- A summary of key decisions
- Numbered list of action items with owners and deadlines
- A professional closing

CRITICAL RULES FOR FORMATTING:
- Do NOT use any markdown formatting, no asterisks, no hash symbols.
- Output purely plain text.
- Use standard numbered lists like "1. ", "2. ", "3. " (no bullet symbols).
- Format as a ready-to-send email with Subject line, greeting, body paragraphs, and sign-off.
- Use [Your Name] as the sender. Output ONLY the email text, nothing else."""

    try:
        email_text = call_gemini("You are a professional business writer.", prompt, max_tokens=800)
        return jsonify({"email": email_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Chat about a meeting.
    Body: { "meeting_id": 0, "messages": [{"role": "user", "content": "..."}] }
    """
    data = request.get_json()
    mid = data.get("meeting_id")
    messages = data.get("messages", [])

    if mid is None or mid >= len(meetings):
        return jsonify({"error": "Meeting not found"}), 404
    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    m = meetings[mid]
    r = m["result"]

    system = f"""You are a meeting assistant. Answer questions about the following meeting concisely and helpfully.

Meeting Title: {m['title']}
Summary: {r.get('summary', '')}
Action Items: {json.dumps(r.get('action_items', []))}
Decisions: {json.dumps(r.get('decisions', []))}
Raw transcript (excerpt): {m['raw'][:1500]}

If asked about something not in the meeting data, say so clearly. Keep answers brief and factual."""

    try:
        model = genai.GenerativeModel(
            model_name=MODEL,
            system_instruction=system,
            generation_config={"max_output_tokens": 600}
        )
        response = model.generate_content(messages[-1]["content"])
        reply = response.text
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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


import sys
import threading
import subprocess
import atexit

def start_frontend():
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
    print("Starting frontend server...", file=sys.stderr)
    process = subprocess.Popen("npm run dev", cwd=frontend_path, shell=True)
    
    def cleanup():
        print("Stopping frontend server...", file=sys.stderr)
        process.terminate()
        
    atexit.register(cleanup)

if __name__ == "__main__":
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        threading.Thread(target=start_frontend, daemon=True).start()
    app.run(debug=True, port=5000)