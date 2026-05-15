import React, { useState } from 'react';
import { processMeeting } from '../api';
import { ClipboardPaste, UploadCloud, FileText, Zap, Loader2, Play } from 'lucide-react';
import './InputPage.css';

const SAMPLE = `Project Kickoff Meeting – MindFlow App
Date: May 14, 2026 | Attendees: Priya (PM), Alex (Dev Lead), Sam (Designer), Jordan (QA)

We discussed the upcoming Q3 launch of the MindFlow productivity app. Priya opened by noting that the original deadline of June 30 has been pushed to July 15 due to resource constraints.

Key discussion points:
- Alex confirmed the backend API will be ready by June 5. He also needs to coordinate with the DevOps team to set up the CI/CD pipeline by May 28.
- Sam will finalize the onboarding screens wireframes by May 22, and share the design system tokens with the dev team by May 25.
- Jordan will begin writing the test plan this Friday (May 16) and send it to Priya for review by May 19.
- The team agreed to adopt Notion for project documentation going forward, replacing the old Confluence setup.
- It was decided that the app will launch with three core features: Focus Timer, Habit Tracker, and Daily Journal. The Social Sharing feature will be deferred to v1.1.

Open items:
- Priya will schedule weekly syncs every Tuesday at 2 PM starting next week.
- Alex needs to interview two backend contractor candidates by May 20 and share a recommendation.
- Budget approval for the contractor is needed from Finance — Priya to follow up.

The next meeting is scheduled for May 21, 2026.`;

export default function InputPage({ onProcessed }) {
    const [tab, setTab] = useState('paste');
    const [notes, setNotes] = useState('');
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setNotes(ev.target.result);
            setTab('paste');
        };
        reader.readAsText(file);
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
                    <div className="upload-zone" onClick={() => document.getElementById('file-input').click()}>
                        <div className="upload-icon">
                            <FileText size={48} strokeWidth={1.5} color="var(--primary)" />
                        </div>
                        <p>Click to upload a <strong>.txt</strong> or <strong>.vtt</strong> file</p>
                        <span>Max 500KB · plain text or WebVTT transcript</span>
                        {fileName && <div className="file-name">
                            <FileText size={14} /> {fileName}
                        </div>}
                        <input
                            type="file"
                            id="file-input"
                            accept=".txt,.vtt"
                            onChange={handleFile}
                            style={{ display: 'none' }}
                        />
                    </div>
                )}

                <div className="input-footer">
                    <div className="footer-left">
                        <span className="char-count">{notes.length} chars</span>
                        <button className="sample-btn" onClick={() => { setNotes(SAMPLE); setTab('paste'); }}>
                            <Play size={14} />
                            Load sample
                        </button>
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
        </div>
    );
}