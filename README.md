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

   The frontend API client defaults to `http://127.0.0.1:5000/api` for localhost development. For production or when accessing from other devices on your network (like mobile phones), the app automatically uses relative API paths (`/api`) for better flexibility.

### Mobile & Responsive Design

MeetingMind is fully responsive and optimized for mobile devices:

- **Automatic Layout Adjustment**: The UI adapts seamlessly to different screen sizes (768px, 480px, and smaller).
- **Mobile CSS**: A dedicated `mobile.css` file provides optimized styles for tablets and smartphones.
- **Touch Optimization**: Button sizes and interactive elements are optimized for touch input.
- **Viewport Configuration**: The HTML includes proper viewport meta tags for mobile rendering.

#### Accessing from Mobile Devices

To access the app from a mobile device on your local network:

1. Find your computer's local IP address:
   - **Windows**: Run `ipconfig` in PowerShell and find your IPv4 Address (e.g., `192.168.x.x`)
   - **Mac/Linux**: Run `ifconfig` or `hostname -I`

2. On your mobile device, open a browser and navigate to:

   ```
   http://<your-computer-ip>:5174
   ```

   (or whatever Vite port is assigned to the frontend)

3. The app will automatically detect the backend location and connect properly.

### API Configuration

The frontend can work with different backend configurations:

- **Local Development**: Automatically uses `http://127.0.0.1:5000/api`
- **Same Domain**: Automatically uses relative paths `/api` (works on any domain/IP)
- **Custom Backend**: Set the `VITE_API_BASE_URL` environment variable

To use a custom backend URL, create or update `.env.local` in the `frontend` directory:

```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=https://your-api-domain.com/api
```

Examples:

```env
# Render backend
VITE_API_BASE_URL=https://meetingmind-backend-faua.onrender.com/api

# Custom domain
VITE_API_BASE_URL=https://api.yourdomain.com/api

# Same domain (default for production)
VITE_API_BASE_URL=/api
```

## Deployment

### Vercel (Recommended - Frontend + Serverless Backend)

This project is pre-configured for Vercel with both frontend and backend on the same domain:

1. **Frontend**: Builds to `frontend/dist`
2. **Backend**: Runs as Serverless Functions (`api/index.py`)
3. **API Communication**: Uses relative `/api` path (automatic)

**Deploy to Vercel:**

```bash
vercel deploy
```

The chatbox and all API calls will work automatically because both frontend and backend are on the same domain.

### Separate Deployments (Frontend & Backend on Different Domains)

If deploying frontend and backend separately:

#### Option A: Vercel Frontend + Render Backend

1. **Deploy Backend to Render** (already configured in `render.yaml`):

   ```bash
   # Push to Render from git
   git push render main
   ```

   Get your backend URL: `https://your-app-name.onrender.com`

2. **Deploy Frontend to Vercel/Netlify/other platform**:

   Set environment variable:

   ```bash
   VITE_API_BASE_URL=https://your-app-name.onrender.com/api
   ```

3. **For Vercel specifically**:
   - Go to Project Settings → Environment Variables
   - Add: `VITE_API_BASE_URL=https://your-app-name.onrender.com/api`
   - Redeploy

#### Option B: Both on Render

1. **Update `render.yaml`** to include frontend:

   ```yaml
   services:
     - type: web
       name: meetingmind-frontend
       runtime: node
       buildCommand: cd frontend && npm install && npm run build
       startCommand: npm start

     - type: web
       name: meetingmind-backend
       # ... existing backend config
   ```

2. **Set `VITE_API_BASE_URL=/api`** in frontend build (same domain)

### Environment Variables for Deployment

**Frontend** (set during build):

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
VITE_API_BASE_URL=https://your-backend-url/api
```

**Backend** (Render, Vercel, or other):

```bash
GOOGLE_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key
MISTRAL_API_KEY=your-mistral-key
FLASK_ENV=production
```

### Chatbox & API in Deployment

The chatbox (and all API calls) will work automatically if:

- ✅ Frontend and backend are on the **same domain** (Vercel setup)
- ✅ **`VITE_API_BASE_URL` is properly set** for separate deployments
- ✅ Backend is **publicly accessible** and **CORS is enabled** (already configured in Flask)

**Troubleshooting Chatbox Issues:**

1. Open DevTools → Network tab → check failed API requests
2. Verify `VITE_API_BASE_URL` environment variable is set
3. Ensure backend URL is publicly accessible (test with `curl https://your-backend/api/health`)
4. Check backend logs for CORS errors

LLMs can sometimes hallucinate or incorrectly attribute an action item if the meeting notes are ambiguous (e.g., "We need to fix the backend," but it doesn't state who will do it).

To handle this:

1. **Prompt Engineering**: The prompt should explicitly instruct the LLM to use "Unassigned" if a clear owner is not mentioned in the text.
2. **UI Fallback**: The frontend highlights missing assignees or provides a quick-edit capability so users can manually assign the correct team member.
3. **Contextual Awareness**: Providing the LLM with a list of attendees at the start of the prompt helps it cross-reference and extract names more accurately.

## Deliverables

- `sample_output.json`: Shows the expected output format of the LLM response.
- `README.md`: You are here.
