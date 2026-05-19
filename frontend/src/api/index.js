import axios from 'axios';

const resolveDefaultBaseURL = () => {
    if (typeof window !== 'undefined' && window.location?.hostname) {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'http://127.0.0.1:5000/api';
        }

        return '/api';
    }

    return '/api';
};

const envBaseURL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
const configuredBaseURL = envBaseURL.trim() || resolveDefaultBaseURL();

const api = axios.create({ baseURL: configuredBaseURL });

export const processMeeting = (notes) =>
    api.post('/process', { notes }).then(r => r.data);

export const generateEmail = (meeting) => {
    if (meeting && typeof meeting === 'object' && !Array.isArray(meeting)) {
        return api.post('/email', meeting).then(r => r.data);
    }

    return api.post('/email', { meeting_id: meeting }).then(r => r.data);
};

export const sendChatMessage = (meetingIdOrPayload, messages) => {
    if (typeof meetingIdOrPayload === 'object' && meetingIdOrPayload.messages) {
        // New format: full payload object
        return api.post('/chat', meetingIdOrPayload).then(r => r.data);
    }
    // Legacy format: meetingId + messages array
    return api.post('/chat', { meeting_id: meetingIdOrPayload, messages }).then(r => r.data);
};

export const listMeetings = () =>
    api.get('/meetings').then(r => r.data);

export const searchMeetings = (query) =>
    api.get('/search', { params: { q: query } }).then(r => r.data);