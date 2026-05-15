import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import InputPage from './pages/InputPage';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import ExportPage from './pages/ExportPage';
import './App.css';

export default function App() {
    const [page, setPage] = useState('input');
    const [meetings, setMeetings] = useState([]);
    const [currentMeeting, setCurrentMeeting] = useState(null);

    const handleMeetingProcessed = (meeting) => {
        setMeetings(prev => [meeting, ...prev]);
        setCurrentMeeting(meeting);
        setPage('dashboard');
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
            />
            <div className="app-body">
                <Sidebar
                    meetings={meetings}
                    currentMeeting={currentMeeting}
                    onSelect={selectMeeting}
                    onNew={startNew}
                />
                <main className="app-content">
                    {page === 'input' && (
                        <InputPage onProcessed={handleMeetingProcessed} />
                    )}
                    {page === 'dashboard' && (
                        <Dashboard meeting={currentMeeting} />
                    )}
                    {page === 'chat' && (
                        <ChatPage meeting={currentMeeting} />
                    )}
                    {page === 'export' && (
                        <ExportPage meeting={currentMeeting} />
                    )}
                </main>
            </div>
        </div>
    );
}