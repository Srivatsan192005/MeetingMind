import React from 'react';
import { Plus, FolderOpen, FileText } from 'lucide-react';

export default function Sidebar({ meetings, currentMeeting, onSelect, onNew }) {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h3>Meetings</h3>
                <button onClick={onNew} className="new-btn" title="New Meeting">
                    <Plus size={18} />
                </button>
            </div>
            <ul className="meeting-list">
                {meetings.map((m, idx) => (
                    <li 
                        key={m.id || idx}
                        className={currentMeeting?.id === m.id ? 'active' : ''}
                        onClick={() => onSelect(m)}
                    >
                        <FileText size={16} className="text-muted" />
                        <span className="truncate">{m.title || `Meeting ${idx + 1}`}</span>
                    </li>
                ))}
                {meetings.length === 0 && (
                    <div className="no-meetings">
                        <FolderOpen size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                        <p>No meetings yet</p>
                    </div>
                )}
            </ul>
        </aside>
    );
}
