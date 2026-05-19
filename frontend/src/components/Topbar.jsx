import React from 'react';
import { PlusCircle, LayoutDashboard, Activity, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function Topbar({ page, setPage, hasMeeting, sidebarOpen, onToggleSidebar }) {
    return (
        <header className="topbar">
            <div className="topbar-brand">
                <button className="topbar-btn topbar-sidebar-toggle" onClick={onToggleSidebar} title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}>
                    {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
                <div className="topbar-logo">
                    <Activity size={24} color="var(--primary)" />
                    MeetingMind
                </div>
            </div>
            <nav className="topbar-nav">
                <button 
                    className={page === 'input' ? 'active' : ''} 
                    onClick={() => setPage('input')}
                >
                    <PlusCircle size={18} />
                    New Meeting
                </button>
                <button 
                    className={page === 'dashboard' ? 'active' : ''} 
                    onClick={() => setPage('dashboard')}
                >
                    <LayoutDashboard size={18} />
                    Dashboard
                </button>
            </nav>
        </header>
    );
}
