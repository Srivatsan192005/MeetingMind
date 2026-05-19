import React, { useRef, useState } from 'react';
import mammoth from 'mammoth/mammoth.browser';
import { processMeeting } from '../api';
import { ClipboardPaste, UploadCloud, FileText, Zap, Loader2, Play, Sparkles } from 'lucide-react';
import './InputPage.css';

const SAMPLE_OPTIONS = [
    {
        id: 'kickoff',
        label: 'Project kickoff',
    hint: 'Roadmap, deadlines, ownership, and open items',
        text: `Project Kickoff Meeting – MindFlow App
    Date: May 14, 2026 | Attendees: Priya (PM), Alex (Dev Lead), Sam (Designer), Jordan (QA), Mei (Ops)

    We reviewed the rollout plan for the MindFlow productivity app and aligned on the work needed before launch. Priya opened with a reminder that the release date has moved from June 30 to July 15, and asked everyone to flag dependencies early so the timeline stays realistic.

    Key discussion points:
    - Alex confirmed the backend API milestone is still June 5, but he needs extra support from DevOps to finish deployment automation and confirm environment variables for staging.
    - Sam said the onboarding redesign is nearly complete, and the team agreed the first-time user flow should be simplified to reduce drop-off during account setup.
    - Jordan shared the draft test plan, including smoke tests for login, reminders, sync conflicts, and feature toggles, and asked the team to review edge cases before Friday.
    - Mei asked for a deployment checklist so release approval can move faster once the final build is ready.
    - The team agreed to ship Focus Timer, Habit Tracker, and Daily Journal in v1, while Social Sharing and analytics exports will be deferred to a later release.
    - Priya emphasized that weekly progress updates should include blockers, owners, and expected resolution dates so management can track risk.

    Open items:
    - Alex will coordinate with DevOps to finalize CI/CD steps by May 28 and report back on any environment blockers.
    - Sam will share the final onboarding screens and design tokens by May 25 so implementation can begin without waiting for follow-up changes.
    - Jordan will send the updated test plan to the team by May 19 and add acceptance criteria for the highest-risk flows.
    - Priya will schedule weekly syncs every Tuesday at 2 PM and prepare a short status summary for leadership.
    - Mei will draft the release checklist and confirm what documentation is required for launch approval.
    - Alex will interview two backend contractor candidates by May 20 and share a recommendation.

    The next meeting is scheduled for May 21, 2026, and the team agreed to use that session to clear the remaining launch blockers.`
    },
    {
        id: 'client-review',
        label: 'Client review',
        hint: 'Pilot feedback, product changes, and rollout follow-up',
        text: `Client Review Meeting – Northstar Retail
    Date: May 16, 2026 | Attendees: Maya (Account Manager), Luis (Product), Helen (Client), Omar (Implementation), Sarah (Training)

    The group reviewed the Northstar dashboard pilot and talked through what the client wants before expanding the rollout to more stores. Helen said the dashboard is useful, but store managers are still taking too long to find the right filters and understand what changed from the old reporting process.

    Key discussion points:
    - Omar walked through the current filter layout and agreed to add saved views for region, product line, and daily sales range so managers can get to the same report faster.
    - Luis said the onboarding flow is too long for first-time users and will trim the walkthrough to focus on the three actions managers use most often.
    - Sarah requested a simple training script plus a short FAQ for store supervisors who will be helping their teams during go-live week.
    - Helen asked for clearer labels on export, comparison, and alert settings, because the pilot users did not always understand the difference between the options.
    - Maya said the rollout timeline will be updated so the East Coast stores can be trained in waves instead of all at once.
    - The team agreed that the client-facing summary should highlight gains, open issues, and the next decision point for the executive steering meeting.

    Open items:
    - Omar will share a revised UI mockup by May 21 with the updated filters and labels.
    - Luis will provide the simplified training script and FAQ by May 22.
    - Sarah will draft a 10-minute onboarding outline for store supervisors and send it to Maya for review.
    - Maya will confirm executive attendees and distribute the summary deck by May 23.
    - Helen will send any final feedback from the pilot store managers before the next check-in.

    The next client check-in is scheduled for May 24, 2026, and the team will use that meeting to review the revised prototype and training plan.`
    },
    {
        id: 'hiring-panel',
        label: 'Hiring panel',
        hint: 'Interview notes, concerns, and hiring recommendation',
        text: `Hiring Panel Meeting – Senior Backend Engineer
    Date: May 17, 2026 | Attendees: Rina (Engineering Manager), Tom (Staff Engineer), Priya (Recruiter), Ben (Security), Kelsey (Platform)

    The panel reviewed the final round interview for the Senior Backend Engineer role and compared the candidate’s strengths against the team’s current needs. The discussion focused on system design, performance tuning, security ownership, and the ability to work with platform tooling in a fast-moving environment.

    Key discussion points:
    - Tom said the candidate performed well in the API scaling exercise and gave clear answers when describing caching, queues, and graceful degradation.
    - Ben noted that the candidate understood authentication basics but needed a stronger answer on rate limiting, secret rotation, and what to do during a security incident.
    - Kelsey was encouraged by the candidate’s distributed systems experience and believed the person could contribute quickly with some onboarding support.
    - Rina pointed out that the team needs someone who can own backend services end to end, communicate tradeoffs clearly, and improve observability over time.
    - Priya confirmed the references were positive and that compensation expectations were still within range for the role.
    - The panel discussed whether the candidate’s weaker cost-optimization answers were a major concern or something that could be coached after hire.

    Open items:
    - Ben will send a security scorecard and flag any final concerns by end of day.
    - Rina will draft the hiring recommendation and include a clear yes/no rationale for leadership.
    - Priya will prepare the offer packet so the team can move quickly if the panel approves the hire.
    - Kelsey will document any platform onboarding gaps that should be covered in the first 30 days.

    The hiring decision is expected by May 20, 2026, after the panel reviews the written feedback and reference summary.`
    },
    {
        id: 'project-retro',
        label: 'Project retro',
        hint: 'Process feedback, blockers, and team action items',
        text: `Sprint Retrospective – Workflow Automation Project
    Date: May 18, 2026 | Attendees: Aisha (PM), Devin (Backend), Noor (Frontend), Chris (QA), Erin (Design)

    The team reviewed the last two sprints and agreed delivery speed improved, but there were still avoidable delays between backend handoffs, design review, and QA validation. The goal of the retro was to identify which process changes are worth keeping and which blockers still slow the team down.

    Key discussion points:
    - Devin said API changes were documented too late, which made it harder for QA to validate final behavior without rechecking assumptions.
    - Noor asked for earlier feedback on UI edge cases, especially states related to empty results, slow network responses, and error handling.
    - Chris suggested creating a shared checklist for high-risk features before code freeze so testers can start with the same expectations every time.
    - Erin noted that design sign-off should happen earlier for anything that changes the user flow, because late visual edits create rework.
    - Aisha proposed a shorter mid-sprint review so blockers can be caught before the sprint is nearly complete.
    - The team agreed that the current process works for small tasks, but larger stories need stricter ownership and faster communication.

    Open items:
    - Devin will update API notes in the team wiki before the next sprint planning session.
    - Noor will add a preview checklist for UI changes and edge-case states.
    - Chris will draft a reusable QA checklist template for regression-heavy work.
    - Aisha will add a 20-minute mid-sprint checkpoint to the calendar.
    - Erin will review whether a lightweight design approval step should be added for larger changes.

    The team agreed to revisit the process changes in the next retro and evaluate whether the new checklist actually reduces QA back-and-forth.`
    }
];

export default function InputPage({ onProcessed }) {
    const [tab, setTab] = useState('paste');
    const [notes, setNotes] = useState('');
    const [sampleId, setSampleId] = useState(SAMPLE_OPTIONS[0].id);
    const [loadingSampleId, setLoadingSampleId] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const loadSample = (sampleIdToLoad) => {
        setSampleId(sampleIdToLoad);
        setLoadingSampleId(sampleIdToLoad);

        const selectedSample = SAMPLE_OPTIONS.find(option => option.id === sampleIdToLoad) || SAMPLE_OPTIONS[0];

        window.setTimeout(() => {
            setNotes(selectedSample.text);
            setTab('paste');
            setLoadingSampleId('');
        }, 180);
    };

    const readFileAsText = async (file) => {
        const extension = file.name.split('.').pop().toLowerCase();

        if (extension === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        }

        return file.text();
    };

    const handleFile = async (file) => {
        if (!file) return;
        setFileName(file.name);

        try {
            const text = await readFileAsText(file);
            setNotes(text);
            setTab('paste');
            setError('');
        } catch (err) {
            setError('Could not read that file. Use .txt, .vtt, or .docx.');
        }
    };

    const handleFileInputChange = async (e) => {
        const file = e.target.files[0];
        await handleFile(file);
        e.target.value = '';
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        await handleFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleProcess = async () => {
        if (!notes.trim()) return;
        setLoading(true);
        setError('');
        try {
            const result = await processMeeting(notes);
            onProcessed({
                id: result.meeting_id,
                title: result.title,
                raw: notes,
                result,
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Processing failed. Is the Flask server running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="input-page">
            <div className="input-hero">
                <h2>Analyze your <span className="gradient-text">meeting notes</span></h2>
                <p>Paste or upload your transcript — get summaries, action items, decisions, and a follow-up email.</p>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="input-card">
                <div className="input-tabs">
                    <button
                        className={`input-tab ${tab === 'paste' ? 'active' : ''}`}
                        onClick={() => setTab('paste')}
                    >
                        <ClipboardPaste size={16} />
                        Paste notes
                    </button>
                    <button
                        className={`input-tab ${tab === 'upload' ? 'active' : ''}`}
                        onClick={() => setTab('upload')}
                    >
                        <UploadCloud size={16} />
                        Upload file
                    </button>
                </div>

                {tab === 'paste' ? (
                    <textarea
                        className="notes-input"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Paste your meeting notes, transcript, or minutes here…"
                    />
                ) : (
                    <div
                        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        <div className="upload-icon">
                            <FileText size={48} strokeWidth={1.5} color="var(--primary)" />
                        </div>
                        <p>Click or drop to upload a <strong>.txt</strong>, <strong>.vtt</strong>, or <strong>.docx</strong> file</p>
                        <span>Plain text, WebVTT transcript, or Word document</span>
                        {fileName && <div className="file-name">
                            <FileText size={14} /> {fileName}
                        </div>}
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".txt,.vtt,.docx"
                            onChange={handleFileInputChange}
                            style={{ display: 'none' }}
                        />
                    </div>
                )}

                <div className="input-footer">
                    <div className="footer-left">
                        <span className="char-count">{notes.length} chars</span>
                    </div>
                    <button
                        className="process-btn"
                        onClick={handleProcess}
                        disabled={!notes.trim() || loading}
                    >
                        {loading ? (
                            <><Loader2 className="spinner-lucide" size={18} /> Analyzing…</>
                        ) : (
                            <><Zap size={18} fill="currentColor" /> Analyze meeting</>
                        )}
                    </button>
                </div>
            </div>

            <div className="sample-gallery">
                <div className="sample-gallery-header">
                    <div>
                        <h3>Try a sample meeting</h3>
                        <p>Choose a larger preset to preload a realistic transcript into the editor.</p>
                    </div>
                    <div className="sample-gallery-badge">
                        <Sparkles size={14} /> Ready to analyze
                    </div>
                </div>
                <div className="sample-grid">
                    {SAMPLE_OPTIONS.map(sample => {
                        const isActive = sampleId === sample.id;
                        const isLoading = loadingSampleId === sample.id;

                        return (
                            <button
                                key={sample.id}
                                type="button"
                                className={`sample-card ${isActive ? 'active' : ''}`}
                                onClick={() => loadSample(sample.id)}
                                disabled={Boolean(loadingSampleId) && !isLoading}
                            >
                                <div className="sample-card-top">
                                    <div>
                                        <h4>{sample.label}</h4>
                                        <p>{sample.hint}</p>
                                    </div>
                                    <span className="sample-pill">{sample.text.length} chars</span>
                                </div>
                                <div className="sample-card-footer">
                                    <span>{isLoading ? 'Loading sample…' : 'Click to load into editor'}</span>
                                    {isLoading ? <Loader2 size={16} className="spinner-lucide" /> : <Play size={16} />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}