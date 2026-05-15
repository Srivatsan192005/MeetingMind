import React from 'react';
import { PlusCircle, LayoutDashboard, MessageSquare, Download, Activity } from 'lucide-react';

export default function Topbar({ page, setPage, hasMeeting }) {
    return (
        <header className="topbar">
            <div className="topbar-logo">
                <Activity size={24} color="var(--primary)" />
                MeetingMind
            </div>
            <nav className="topbar-nav">
                <button 
                    className={page === 'input' ? 'active' : ''} 
                    onClick={() => setPage('input')}
                >
                    <PlusCircle size={18} />
                    New Meeting
                </button>
                {hasMeeting && (
                    <>
                        <button 
                            className={page === 'dashboard' ? 'active' : ''} 
                            onClick={() => setPage('dashboard')}
                        >
                            <LayoutDashboard size={18} />
                            Dashboard
                        </button>
                        <button 
                            className={page === 'chat' ? 'active' : ''} 
                            onClick={() => setPage('chat')}
                        >
                            <MessageSquare size={18} />
                            Chat
                        </button>
                        <button 
                            className={page === 'export' ? 'active' : ''} 
                            onClick={() => setPage('export')}
                        >
                            <Download size={18} />
                            Export
                        </button>
                    </>
                )}
            </nav>
        </header>
    );
}
