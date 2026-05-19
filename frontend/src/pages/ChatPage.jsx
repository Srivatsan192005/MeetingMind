import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api';
import { MessageCircle, Bot, User, Send } from 'lucide-react';
import './ChatPage.css';

export default function ChatPage({ meeting }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    if (!meeting) {
        return (
            <div className="empty-state" style={{ flex: 1 }}>
                <div className="empty-icon">
                    <MessageCircle size={48} strokeWidth={1.5} />
                </div>
                <h3>No meeting loaded</h3>
                <p>Process a meeting first to chat about it.</p>
            </div>
        );
    }

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = { role: 'user', content: input.trim() };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput('');
        setLoading(true);

        try {
            const chatPayload = {
                messages: next,
                title: meeting.title,
                summary: meeting.result?.summary || '',
                action_items: meeting.result?.action_items || [],
                decisions: meeting.result?.decisions || [],
                raw: meeting.raw || '',
                meeting_id: meeting.id,
            };
            const { reply } = await sendChatMessage(chatPayload);
            setMessages([...next, { role: 'assistant', content: reply }]);
        } catch {
            setMessages([...next, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <div className="chat-page">
            <div className="chat-notice">
                <MessageCircle size={18} className="text-primary" />
                Chatting about: <strong>{meeting.title}</strong>
            </div>

            <div className="chat-messages">
                <div className="chat-message">
                    <div className="msg-avatar msg-ai">
                        <Bot size={18} />
                    </div>
                    <div className="msg-bubble">
                        <div className="msg-name">MeetingMind</div>
                        <div className="msg-content">
                            I've processed your meeting. Ask me anything — who owns what tasks,
                            what was decided, upcoming deadlines, or anything else from the transcript.
                        </div>
                    </div>
                </div>

                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`chat-message ${m.role === 'user' ? 'chat-message-user' : ''}`}
                    >
                        <div className={`msg-avatar ${m.role === 'user' ? 'msg-user' : 'msg-ai'}`}>
                            {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                        </div>
                        <div className="msg-bubble">
                            <div className={`msg-name ${m.role === 'user' ? 'msg-name-right' : ''}`}>
                                {m.role === 'user' ? 'You' : 'MeetingMind'}
                            </div>
                            <div className={`msg-content ${m.role === 'user' ? 'msg-content-user' : ''}`}>
                                {m.content}
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="chat-message">
                        <div className="msg-avatar msg-ai">
                            <Bot size={18} />
                        </div>
                        <div className="msg-bubble">
                            <div className="msg-name">MeetingMind</div>
                            <div className="msg-content msg-loading">
                                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="chat-input-area">
                <textarea
                    className="chat-input"
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about action items, decisions, assignees…"
                />
                <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}