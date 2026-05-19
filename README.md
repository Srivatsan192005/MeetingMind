# MeetingMind - AI-Powered Meeting & Workflow Assistant

MeetingMind helps teams process meeting notes or transcripts. Users can upload or paste content, and the system uses an LLM (Gemini) to generate a summary, extract action items, identify decisions, and draft a follow-up email.

## Features

- **Input Interface**: Paste text or upload `.txt`/`.vtt` files.
- **LLM Processing**: Generates structured JSON output with summary, action items, and decisions.
- **Dashboard**: Clearly displays the processed results.
- **Follow-up Email**: One-click generation of professional follow-up emails based on meeting insights.
- **Bonus Features**:
  - Chat with the meeting data after processing.
  - Export results as Markdown.
  - Simple local state for meeting history.

## Tech Stack

- **Backend**: Flask (Python) + Gemini API
- **Frontend**: React (Vite/Vanilla)

## Setup Instructions

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   Copy `.env.example` to `.env` and add your Gemini API key.
   ```bash
   cp .env.example .env
   ```
   The backend accepts either `GOOGLE_API_KEY` or `GEMINI_API_KEY`.
5. Run the Flask server:
   ```bash
   python app.py
   ```
   The backend will start on `http://127.0.0.1:5000`.

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:

   ```bash
   npm run dev
   ```

   Alternatively, if you're not using a package manager like npm, you can use Vite or a simple HTTP server to serve the React files if they are compiled.

   The frontend API client defaults to `http://127.0.0.1:5000/api`. If your backend runs on a different host or port, set `VITE_API_BASE_URL` to that backend URL.

## Note on Handling Incorrect Assignee Extraction

LLMs can sometimes hallucinate or incorrectly attribute an action item if the meeting notes are ambiguous (e.g., "We need to fix the backend," but it doesn't state who will do it).

To handle this:

1. **Prompt Engineering**: The prompt should explicitly instruct the LLM to use "Unassigned" if a clear owner is not mentioned in the text.
2. **UI Fallback**: The frontend highlights missing assignees or provides a quick-edit capability so users can manually assign the correct team member.
3. **Contextual Awareness**: Providing the LLM with a list of attendees at the start of the prompt helps it cross-reference and extract names more accurately.

## Deliverables

- `sample_output.json`: Shows the expected output format of the LLM response.
- `README.md`: You are here.
