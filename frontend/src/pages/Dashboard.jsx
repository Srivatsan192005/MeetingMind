import React, { useState, useMemo } from 'react';
import { generateEmail } from '../api';
import { 
    BarChart2, Download, Mail, FileText, CheckCircle, 
    User, Calendar, Zap, Copy, RefreshCw, X, Loader2,
    ChevronDown, ChevronUp, AlertTriangle, DollarSign,
    Star, Info, Clock, MessageSquare
} from 'lucide-react';
import './Dashboard.css';

// ── Accordion Component ───────────────────────────────────────────────────────
function Accordion({ title, icon: Icon, iconClass, count, defaultOpen = false, children }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className={`accordion ${isOpen ? 'open' : ''}`}>
            <div className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
                <div className="accordion-header-left">
                    <div className={`card-icon ${iconClass}`}>
                        <Icon size={20} />
                    </div>
                    <h3>{title} {count !== undefined && <span className="card-count">({count})</span>}</h3>
                </div>
                <button className="accordion-toggle">
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>
            {isOpen && <div className="accordion-body">{children}</div>}
        </div>
    );
}

// ── Email Modal ───────────────────────────────────────────────────────────────
function EmailModal({ meeting, onClose }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchEmail = async () => {
        setLoading(true);
        try {
            const data = await generateEmail(meeting.id);
            setEmail(data.email);
        } catch {
            setEmail('Failed to generate email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => { fetchEmail(); }, []);

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <h3>Follow-up Email Draft</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <div className="modal-loading">
                            <Loader2 className="spinner-lucide text-primary" size={32} />
                            <span>Drafting your email…</span>
                        </div>
                    ) : (
                        <pre className="email-content">{email}</pre>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(email)}>
                        <Copy size={16} /> Copy
                    </button>
                    <button className="btn-primary" onClick={fetchEmail}>
                        <RefreshCw size={16} /> Regenerate
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Highlight Cards ───────────────────────────────────────────────────────────
function HighlightCards({ highlights }) {
    if (!highlights || highlights.length === 0) return null;

    const getIconInfo = (type) => {
        switch(type) {
            case 'critical': return { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' };
            case 'financial': return { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' };
            case 'positive': return { icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' };
            case 'risk': return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' };
            default: return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' };
        }
    };

    return (
        <div className="highlights-container">
            {highlights.map((h, i) => {
                const { icon: Icon, color, bg } = getIconInfo(h.type);
                return (
                    <div key={i} className={`highlight-card ${bg}`}>
                        <div className={`highlight-icon ${color}`}>
                            <Icon size={18} />
                        </div>
                        <div className="highlight-text">{h.text}</div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Transcript Viewer (Timeline) ──────────────────────────────────────────────
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function TranscriptViewer({ raw }) {
    const lines = useMemo(() => {
        if (!raw) return [];
        const speakerColors = {};
        let colorIdx = 0;

        return raw.split('\n').filter(line => line.trim().length > 0).map((line, i) => {
            // Match optional timestamp, speaker, and text. Example: "[00:15] Priya: Hello"
            const match = line.match(/^(?:\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+)?([^:]+):\s*(.*)$/);
            if (match) {
                const timestamp = match[1];
                const speaker = match[2].trim();
                const text = match[3].trim();
                
                if (!speakerColors[speaker]) {
                    speakerColors[speaker] = PALETTE[colorIdx % PALETTE.length];
                    colorIdx++;
                }
                
                return { 
                    id: i, 
                    type: 'dialogue', 
                    timestamp, 
                    speaker, 
                    text, 
                    color: speakerColors[speaker],
                    initials: getInitials(speaker)
                };
            }
            return { id: i, type: 'note', text: line.trim() };
        });
    }, [raw]);

    return (
        <div className="timeline-container">
            <div className="timeline-line"></div>
            {lines.map((line) => (
                <div key={line.id} className={`timeline-item ${line.type}`}>
                    {line.type === 'dialogue' ? (
                        <>
                            <div className="timeline-avatar" style={{ backgroundColor: line.color }}>
                                {line.initials}
                            </div>
                            <div className="timeline-content">
                                <div className="timeline-header">
                                    <span className="timeline-speaker" style={{ color: line.color }}>
                                        {line.speaker}
                                    </span>
                                    {line.timestamp && <span className="timeline-time">{line.timestamp}</span>}
                                </div>
                                <div className="timeline-bubble">{line.text}</div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="timeline-dot-small"></div>
                            <div className="timeline-content timeline-note">{line.text}</div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ meeting }) {
    const [doneTasks, setDoneTasks] = useState(new Set());
    const [emailOpen, setEmailOpen] = useState(false);

    if (!meeting) {
        return (
            <div className="empty-state">
                <div className="empty-icon">
                    <BarChart2 size={48} strokeWidth={1.5} />
                </div>
                <h3>No meeting selected</h3>
                <p>Process a meeting to see its dashboard.</p>
            </div>
        );
    }

    const { result, raw } = meeting;
    const toggleTask = (i) => {
        setDoneTasks(prev => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };

    const downloadJson = () => {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = meeting.title.replace(/\s+/g, '_') + '.json';
        a.click();
    };

    return (
        <div className="dashboard">
            {emailOpen && <EmailModal meeting={meeting} onClose={() => setEmailOpen(false)} />}

            <div className="dash-header">
                <div>
                    <h2>{meeting.title}</h2>
                    <p className="dash-subtitle">
                        {result.action_items?.length || 0} action items · {result.decisions?.length || 0} decisions
                    </p>
                </div>
                <div className="dash-actions">
                    <button className="btn-secondary" onClick={downloadJson}>
                        <Download size={16} /> JSON
                    </button>
                    <button className="btn-primary" onClick={() => setEmailOpen(true)}>
                        <Mail size={16} /> Draft follow-up email
                    </button>
                </div>
            </div>

            <HighlightCards highlights={result.highlights} />

            <div className="accordions-grid">
                <Accordion title="Summary" icon={FileText} iconClass="card-icon-blue" defaultOpen={true}>
                    <p className="card-text">{result.summary}</p>
                </Accordion>

                <Accordion title="Action Items" icon={CheckCircle} iconClass="card-icon-green" count={result.action_items?.length || 0} defaultOpen={true}>
                    <div className="action-list">
                        {(result.action_items || []).map((a, i) => (
                            <div key={i} className={`action-item ${doneTasks.has(i) ? 'done' : ''}`}>
                                <div className="action-row">
                                    <button className="check-box" onClick={() => toggleTask(i)}>
                                        {doneTasks.has(i) && <CheckCircle size={14} color="#fff" strokeWidth={3} />}
                                    </button>
                                    <span className="action-desc">{a.description}</span>
                                </div>
                                <div className="action-badges">
                                    {a.assignee ? (
                                        <span className="badge badge-blue">
                                            <User size={12} /> {a.assignee}
                                        </span>
                                    ) : (
                                        <span className="badge badge-gray">Unassigned</span>
                                    )}
                                    {a.deadline && (
                                        <span className="badge badge-amber">
                                            <Calendar size={12} /> {a.deadline}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Accordion>

                <Accordion title="Decisions" icon={Zap} iconClass="card-icon-purple" count={result.decisions?.length || 0}>
                    <div className="decision-list">
                        {(result.decisions || []).map((d, i) => (
                            <div key={i} className="decision-item">
                                <div className="decision-dot" />
                                <p>{d}</p>
                            </div>
                        ))}
                    </div>
                </Accordion>

                <Accordion title="Timeline / Transcript" icon={MessageSquare} iconClass="card-icon-gray">
                    <TranscriptViewer raw={raw} />
                </Accordion>
            </div>
        </div>
    );
}