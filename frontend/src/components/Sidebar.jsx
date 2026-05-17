import React, { useEffect, useState, useMemo } from 'react';
import { Plus, FolderOpen, FileText, Search, X } from 'lucide-react';
import { fetchMeetings } from '../api/meetingService';

export default function Sidebar({ currentMeeting, onSelect, onNew }) {
  const [meetings, setMeetings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load meetings from Supabase on mount
  useEffect(() => {
    const load = async () => {
      const { data, error } = await fetchMeetings();
      if (!error && data) setMeetings(data);
    };
    load();
  }, []);

  const refreshMeetings = async () => {
    const { data, error } = await fetchMeetings();
    if (!error && data) setMeetings(data);
  };

  // Filter meetings based on search query
  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings;
    return meetings.filter(m => 
      (m.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [meetings, searchQuery]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h3>Meetings</h3>
        <button onClick={onNew} className="new-btn" title="New Meeting">
          <Plus size={18} />
        </button>
        <button onClick={refreshMeetings} className="new-btn" title="Refresh" style={{ marginLeft: 8 }}>
          <FolderOpen size={18} />
        </button>
      </div>
      
      <div className="search-container" style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '8px', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 8px 8px 32px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '0'
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <ul className="meeting-list">
        {filteredMeetings.map((m, idx) => (
          <li key={m.id || idx}
            className={currentMeeting?.id === m.id ? 'active' : ''}
            onClick={() => onSelect(m)}>
            <FileText size={16} className="text-muted" />
            <span className="truncate">{m.title || `Meeting ${idx + 1}`}</span>
          </li>
        ))}
        {filteredMeetings.length === 0 && (
          <div className="no-meetings">
            <FolderOpen size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <p>{searchQuery ? 'No meetings found' : 'No meetings yet'}</p>
          </div>
        )}
      </ul>
    </aside>
  );
}
