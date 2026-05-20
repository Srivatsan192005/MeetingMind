import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import InputPage from './pages/InputPage';
import Dashboard from './pages/Dashboard';
import { fetchMeetings, storeMeeting } from './api/meetingService';
import './App.css';
import './mobile.css';

export default function App() {
    const [page, setPage] = useState('input');
    const [meetings, setMeetings] = useState([]);
    const [currentMeeting, setCurrentMeeting] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Fetch stored meetings on mount
    useEffect(() => {
        const loadMeetings = async () => {
            const { data, error } = await fetchMeetings();
            if (!error && data) {
                setMeetings(data);
            }
        };
        loadMeetings();
    }, []);

    const handleMeetingProcessed = async (meeting) => {
        const inferTags = (m) => {
            const text = [m.title, m.result?.summary, ...(m.result?.highlights || []).map(h => h.text || '')].join(' ').toLowerCase();
            const tags = new Set();
            if (/\b(plan|planning|roadmap|strategy|next steps)\b/.test(text)) tags.add('planning');
            if (/\b(client|customer|vendor|prospect)\b/.test(text)) tags.add('client call');
            if (/\b(hire|interview|candidate|recruit|onboard)\b/.test(text)) tags.add('hiring');
            if (/\b(retro|retrospective|review)\b/.test(text)) tags.add('retro');
            if (/\b(urgent|asap|priority|immediately|blocker)\b/.test(text)) tags.add('urgent');
            if ((m.result?.action_items || []).length > 0) tags.add('actions');
            return Array.from(tags);
        };

        const payload = {
            title: meeting.title,
            raw: meeting.raw,
            ...meeting.result,
            full_meeting_json: meeting,
            tags: inferTags(meeting),
        };

        try {
            const { data, error } = await storeMeeting(payload);
            if (error) {
                throw error;
            }

            const savedMeeting = data?.[0]
                ? {
                    ...meeting,
                    id: data[0].id,
                    supabaseId: data[0].id,
                }
                : meeting;

            const { data: refreshedMeetings, error: refreshError } = await fetchMeetings();
            if (!refreshError && refreshedMeetings) {
                setMeetings(refreshedMeetings);
            } else {
                setMeetings(prev => [savedMeeting, ...prev.filter(item => item.id !== savedMeeting.id)]);
            }
            setCurrentMeeting(savedMeeting);
            setPage('dashboard');
        } catch (err) {
            console.error('Failed to auto-save meeting to Supabase:', err);
            setCurrentMeeting(meeting);
            setMeetings(prev => [meeting, ...prev]);
            setPage('dashboard');
        }
    };

    const selectMeeting = (meeting) => {
        setCurrentMeeting(meeting);
        setPage('dashboard');
    };

    const startNew = () => {
        setPage('input');
    };

    return (
        <div className="app-shell">
            <Topbar
                page={page}
                setPage={setPage}
                hasMeeting={!!currentMeeting}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            />
            <div className="app-body">
                {sidebarOpen && (
                    <Sidebar
                        meetings={meetings}
                        currentMeeting={currentMeeting}
                        onSelect={selectMeeting}
                        onNew={startNew}
                        onHome={() => {
                            setCurrentMeeting(null);
                            setPage('dashboard');
                        }}
                    />
                )}
                <main className="app-content">
                    {page === 'input' && (
                        <InputPage onProcessed={handleMeetingProcessed} />
                    )}
                    {page === 'dashboard' && (
                        <Dashboard meetings={meetings} meeting={currentMeeting} onMeetingUpdated={(updatedMeeting) => {
                            setCurrentMeeting(updatedMeeting);
                            setMeetings(prev => prev.map(item => (item.id === updatedMeeting.id ? updatedMeeting : item)));
                        }} onOpenMeeting={selectMeeting} />
                    )}
                </main>
            </div>
        </div>
    );
}