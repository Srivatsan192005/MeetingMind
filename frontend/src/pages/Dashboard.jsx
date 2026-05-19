import React, { useState, useMemo, useEffect } from 'react';
import { generateEmail } from '../api';
import { updateMeeting } from '../api/meetingService';
import ChatPage from './ChatPage';
import ExportPage from './ExportPage';
import { 
    BarChart2, Download, Mail, FileText, CheckCircle, 
    User, Calendar, Zap, Copy, RefreshCw, X, Loader2,
    ChevronDown, ChevronUp, AlertTriangle, DollarSign,
    Star, Info, MessageSquare, Sparkles
} from 'lucide-react';
import './Dashboard.css';

const EMAIL_MODES = [
    {
        id: 'concise',
        label: 'Concise',
        hint: 'Short and direct',
    },
    {
        id: 'formal',
        label: 'Formal',
        hint: 'Polished and executive',
    },
];

const EMAIL_MODE_DETAILS = {
    concise: '2-3 short paragraphs | 120-160 words | direct, minimal fluff',
    formal: '4-5 paragraphs | 190-260 words | polished, structured language',
};

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
    const [selectedMode, setSelectedMode] = useState(null);
    const [drafts, setDrafts] = useState({});
    const [loadingModes, setLoadingModes] = useState({});
    const [error, setError] = useState('');

    const requestDraft = async (mode) => {
        if (!mode) return;
        setLoadingModes(prev => ({ ...prev, [mode]: true }));
        setError('');
        try {
            const data = await generateEmail({
                title: meeting.title,
                raw: meeting.raw,
                summary: meeting.result?.summary || '',
                action_items: meeting.result?.action_items || [],
                decisions: meeting.result?.decisions || [],
                mode,
            });
            if (!data.email) {
                throw new Error('No email draft was returned by the backend.');
            }
            setDrafts(prev => ({ ...prev, [mode]: data.email }));
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Failed to generate email. Please try again.');
        } finally {
            setLoadingModes(prev => ({ ...prev, [mode]: false }));
        }
    };

    const activeMode = selectedMode ? EMAIL_MODES.find((mode) => mode.id === selectedMode) : null;
    const activeEmail = selectedMode ? (drafts[selectedMode] || '') : '';
    const activeLoading = !!selectedMode && !!loadingModes[selectedMode] && !activeEmail;
    const hasDraft = !!selectedMode && !!drafts[selectedMode];

    const copyEmail = async () => {
        if (activeEmail) {
            await navigator.clipboard.writeText(activeEmail);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-email">
                <div className="modal-header">
                    <div>
                        <h3>Follow-up Email Draft</h3>
                        <p className="modal-kicker">Select a mode, then generate a draft to compare styles.</p>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="modal-body">
                    {error ? (
                        <div className="error-banner" style={{ margin: 0 }}>
                            {error}
                        </div>
                    ) : (
                        <>
                            <div className="tone-tabs">
                                {EMAIL_MODES.map((mode) => (
                                    <button
                                        key={mode.id}
                                        className={`tone-pill ${selectedMode === mode.id ? 'active' : ''}`}
                                        onClick={() => setSelectedMode(mode.id)}
                                    >
                                        <span>{mode.label}</span>
                                        <small>{mode.hint}</small>
                                    </button>
                                ))}
                            </div>
                            <div className="mode-detail">
                                {selectedMode ? EMAIL_MODE_DETAILS[selectedMode] : 'Choose a mode to start.'}
                            </div>

                            <div className="email-preview-shell">
                                {activeMode && (
                                    <div className="email-preview-header">
                                        <div>
                                            <div className="email-tone-label">{activeMode.label} draft</div>
                                            <div className="email-tone-hint">{activeMode.hint}</div>
                                        </div>
                                        <button
                                            className="btn-secondary btn-small"
                                            onClick={() => requestDraft(selectedMode)}
                                            disabled={!selectedMode || activeLoading}
                                        >
                                            <RefreshCw size={14} /> {hasDraft ? 'Regenerate' : 'Generate'}
                                        </button>
                                    </div>
                                )}

                                {!activeMode && (
                                    <div className="email-placeholder">Select a mode to generate a draft.</div>
                                )}

                                {activeMode && activeLoading && (
                                    <div className="modal-loading">
                                        <Loader2 className="spinner-lucide text-primary" size={32} />
                                        <span>Writing the {activeMode.label.toLowerCase()} version…</span>
                                    </div>
                                )}

                                {activeMode && !activeLoading && activeEmail && (
                                    <pre className="email-content email-content-compact">{activeEmail}</pre>
                                )}

                                {activeMode && !activeLoading && !activeEmail && (
                                    <div className="email-placeholder">Click Generate to create the {activeMode.label.toLowerCase()} draft.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn-secondary" onClick={copyEmail} disabled={!activeEmail}>
                        <Copy size={16} /> Copy
                    </button>
                    <button className="btn-primary" onClick={() => requestDraft(selectedMode)} disabled={!selectedMode || activeLoading}>
                        <RefreshCw size={16} /> {hasDraft ? 'Regenerate current mode' : 'Generate current mode'}
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
            {lines.map((line) => (
                <div key={line.id} className={`timeline-item ${line.type}`}>
                    {line.type === 'dialogue' ? (
                        <>
                            <div className="timeline-rail">
                                <div className="timeline-avatar" style={{ backgroundColor: line.color }}>
                                    {line.initials}
                                </div>
                                <div className="timeline-connector" />
                            </div>
                            <div className="timeline-content">
                                <div className="timeline-card">
                                    <div className="timeline-header">
                                        <span className="timeline-speaker" style={{ color: line.color }}>
                                            {line.speaker}
                                        </span>
                                        {line.timestamp && <span className="timeline-time">{line.timestamp}</span>}
                                    </div>
                                    <div className="timeline-bubble">{line.text}</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="timeline-rail">
                                <div className="timeline-dot-small"></div>
                            </div>
                            <div className="timeline-content timeline-note">
                                <div className="timeline-note-card">{line.text}</div>
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ meetings = [], meeting, onMeetingUpdated, onOpenMeeting }) {
    const [emailOpen, setEmailOpen] = useState(false);
    const [view, setView] = useState('overview');

    useEffect(() => {
        setView('overview');
    }, [meeting?.id]);

    const dashboardStats = useMemo(() => {
        const totalMeetings = meetings.length;
        const actionItems = meetings.reduce((sum, item) => sum + ((item.result?.action_items || []).length), 0);
        const decisions = meetings.reduce((sum, item) => sum + ((item.result?.decisions || item.result?.summary?.key_decisions || []).length), 0);
        const completed = meetings.reduce((sum, item) => sum + ((item.result?.completed_action_items || []).length), 0);
        const taggedMeetings = meetings.filter(item => (item.tags || []).length > 0).length;
        return { totalMeetings, actionItems, decisions, completed, taggedMeetings };
    }, [meetings]);

    const overviewData = useMemo(() => {
        const tagCounts = meetings.reduce((acc, item) => {
            (item.tags || []).forEach((tag) => {
                const normalized = String(tag).toLowerCase();
                acc[normalized] = (acc[normalized] || 0) + 1;
            });
            return acc;
        }, {});

        const actionFocus = meetings.flatMap((item) => {
            const actions = item.result?.action_items || [];
            return actions.map((action) => ({
                meetingId: item.id,
                meetingTitle: item.title,
                text: action.description || action.task || '',
                assignee: action.assignee || action.owner || null,
                deadline: action.deadline || null,
            }));
        }).filter((item) => item.text);

        const decisionTimeline = meetings.flatMap((item) => {
            const decisionList = item.result?.decisions || item.result?.summary?.key_decisions || [];
            return decisionList.map((decision) => ({
                meetingId: item.id,
                meetingTitle: item.title,
                text: decision,
                when: item.meeting_date || item.created_at || null,
            }));
        });

        return {
            tagCounts,
            actionFocus,
            decisionTimeline,
        };
    }, [meetings]);

    const DashboardOverview = () => (
        <div className="overview-panel">
            <div className="overview-title-row">
                <div>
                    <div className="overview-kicker">Workspace overview</div>
                    <h2>{dashboardStats.totalMeetings} meetings analyzed</h2>
                    <p>AI insights, action focus, and decision timeline from all meetings in one place.</p>
                </div>
            </div>

            <div className="overview-grid overview-grid-wide">
                <div className="overview-panel-card ai-insights-card">
                    <div className="overview-section-head">
                        <h3>AI Insights</h3>
                        <span>Workspace summary</span>
                    </div>
                    <div className="insight-grid">
                        <div className="insight-card insight-blue">
                            <div className="insight-icon-ring insight-ring-blue">
                                <BarChart2 size={18} />
                            </div>
                            <div className="insight-meta">
                                <strong>{dashboardStats.taggedMeetings}</strong>
                                <span>Tagged Meetings</span>
                            </div>
                            <div className="insight-bar">
                                <div className="insight-bar-fill tone-blue" style={{ width: `${dashboardStats.totalMeetings > 0 ? Math.min(100, Math.round((dashboardStats.taggedMeetings / dashboardStats.totalMeetings) * 100)) : 0}%` }} />
                            </div>
                        </div>
                        <div className="insight-card insight-green">
                            <div className="insight-icon-ring insight-ring-green">
                                <CheckCircle size={18} />
                            </div>
                            <div className="insight-meta">
                                <strong>{dashboardStats.completed}</strong>
                                <span>Completed Tasks</span>
                            </div>
                            <div className="insight-bar">
                                <div className="insight-bar-fill tone-green" style={{ width: `${dashboardStats.actionItems > 0 ? Math.min(100, Math.round((dashboardStats.completed / dashboardStats.actionItems) * 100)) : 0}%` }} />
                            </div>
                        </div>
                        <div className="insight-card insight-purple">
                            <div className="insight-icon-ring insight-ring-purple">
                                <Zap size={18} />
                            </div>
                            <div className="insight-meta">
                                <strong>{Math.max(0, dashboardStats.actionItems - dashboardStats.completed)}</strong>
                                <span>Open Tasks</span>
                            </div>
                            <div className="insight-bar">
                                <div className="insight-bar-fill tone-purple" style={{ width: `${dashboardStats.actionItems > 0 ? Math.min(100, Math.round(((dashboardStats.actionItems - dashboardStats.completed) / dashboardStats.actionItems) * 100)) : 0}%` }} />
                            </div>
                        </div>
                        <div className="insight-card insight-amber">
                            <div className="insight-icon-ring insight-ring-amber">
                                <Star size={18} />
                            </div>
                            <div className="insight-meta">
                                <strong>{dashboardStats.decisions}</strong>
                                <span>Decisions Captured</span>
                            </div>
                            <div className="insight-bar">
                                <div className="insight-bar-fill tone-amber" style={{ width: `${Math.min(100, dashboardStats.decisions * 10)}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overview-panel-card">
                    <div className="overview-section-head">
                        <h3>Action focus</h3>
                        <span>Open items across meetings</span>
                    </div>
                    <div className="focus-list">
                        {overviewData.actionFocus.slice(0, 5).map((item, idx) => (
                            <button key={`${item.meetingId}-${idx}`} className="focus-item" onClick={() => onOpenMeeting?.(meetings.find(m => m.id === item.meetingId) || null)}>
                                <div>
                                    <strong>{item.text}</strong>
                                    <p>{item.meetingTitle}</p>
                                </div>
                                <span>{item.assignee || 'Unassigned'}</span>
                            </button>
                        ))}
                        {overviewData.actionFocus.length === 0 && <div className="empty-mini">No action items yet.</div>}
                    </div>
                </div>

                <div className="overview-panel-card overview-panel-card-wide">
                    <div className="overview-section-head">
                        <h3>Decision timeline</h3>
                        <span>Latest decisions</span>
                    </div>
                    <div className="timeline-summary-list">
                        {overviewData.decisionTimeline.slice(0, 6).map((item, idx) => (
                            <div key={`${item.meetingId}-${idx}`} className="timeline-summary-item">
                                <div className="timeline-summary-dot" />
                                <div>
                                    <strong>{item.text}</strong>
                                    <p>{item.meetingTitle}</p>
                                </div>
                            </div>
                        ))}
                        {overviewData.decisionTimeline.length === 0 && <div className="empty-mini">No decisions recorded yet.</div>}
                    </div>
                </div>
            </div>
        </div>
    );

    if (!meeting) {
        return <DashboardOverview />;
    }

    const { result, raw } = meeting;
    const summaryText = typeof result.summary === 'string'
        ? result.summary
        : result.summary?.overview || '';
    const actionItems = (result.action_items || []).map((item) => ({
        description: item.description || item.task || '',
        assignee: item.assignee || item.owner || null,
        deadline: item.deadline || null,
        completed: !!item.completed,
    }));
    const pendingActionItems = actionItems.filter((item) => !item.completed);
    const decisions = (result.decisions && result.decisions.length > 0)
        ? result.decisions
        : (result.summary?.key_decisions || []);
    const toggleTask = async (i) => {
        const item = pendingActionItems[i];
        if (!item) return;

        const updatedResult = {
            ...result,
            action_items: pendingActionItems.filter((_, index) => index !== i),
            completed_action_items: [...(result.completed_action_items || []), { ...item, completed_at: new Date().toISOString() }],
        };
        const updatedMeeting = {
            ...meeting,
            result: updatedResult,
            full_meeting_json: {
                ...(meeting.full_meeting_json || meeting),
                result: updatedResult,
            },
        };

        try {
            if (meeting.id) {
                const { data, error } = await updateMeeting(meeting.id, {
                    ...updatedMeeting,
                    title: updatedMeeting.title,
                    raw: updatedMeeting.raw,
                    tags: updatedMeeting.tags || [],
                });
                if (error) throw error;

                const savedRow = data?.[0] ? {
                    ...updatedMeeting,
                    id: data[0].id,
                    supabaseId: data[0].id,
                } : updatedMeeting;
                onMeetingUpdated?.(savedRow);
            } else {
                onMeetingUpdated?.(updatedMeeting);
            }
        } catch (error) {
            console.error('Failed to persist action item completion:', error);
        }
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
                        {actionItems.length} action items · {decisions.length} decisions
                    </p>
                </div>
                <div className="dash-actions">
                    <div className="dash-tabs">
                        <button className={`dash-tab ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
                        <button className={`dash-tab ${view === 'chat' ? 'active' : ''}`} onClick={() => setView('chat')}>Chat</button>
                        <button className={`dash-tab ${view === 'export' ? 'active' : ''}`} onClick={() => setView('export')}>Export</button>
                    </div>
                    <button className="btn-secondary" onClick={downloadJson}>
                        <Download size={16} /> JSON
                    </button>
                    <button className="btn-primary" onClick={() => setEmailOpen(true)}>
                        <Mail size={16} /> Draft follow-up email
                    </button>
                </div>
            </div>

            {view === 'overview' && (
                <>
                    <HighlightCards highlights={result.highlights} />
                    <div className="accordions-grid">
                        <Accordion title="Summary" icon={FileText} iconClass="card-icon-blue" defaultOpen={true}>
                            <p className="card-text">{summaryText}</p>
                        </Accordion>

                        <Accordion title="Action Items" icon={CheckCircle} iconClass="card-icon-green" count={actionItems.length} defaultOpen={true}>
                            <div className="action-list">
                                {pendingActionItems.length > 0 ? pendingActionItems.map((a, i) => (
                                    <div key={`${a.description}-${i}`} className="action-item">
                                        <div className="action-row">
                                            <button className="check-box" onClick={() => toggleTask(i)} title="Mark complete">
                                                <CheckCircle size={14} color="#64748b" strokeWidth={2.5} />
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
                                )) : (
                                    <div className="action-empty">
                                        <CheckCircle size={18} />
                                        <div>
                                            <strong>No open action items.</strong>
                                            <p>Completed items disappear here automatically after you check them off.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Accordion>

                        <Accordion title="Decisions" icon={Zap} iconClass="card-icon-purple" count={decisions.length}>
                            <div className="decision-list">
                                {decisions.map((d, i) => (
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
                </>
            )}

            {view === 'chat' && <ChatPage meeting={meeting} />}
            {view === 'export' && <ExportPage meeting={meeting} />}
        </div>
    );
}