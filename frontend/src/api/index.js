import axios from 'axios';

const defaultBaseURL = 'http://127.0.0.1:5000/api';
const configuredBaseURL =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
    defaultBaseURL;

const api = axios.create({ baseURL: configuredBaseURL });

export const processMeeting = (notes) =>
    api.post('/process', { notes }).then(r => r.data);

export const generateEmail = (meetingId) =>
    api.post('/email', { meeting_id: meetingId }).then(r => r.data);

export const sendChatMessage = (meetingId, messages) =>
    api.post('/chat', { meeting_id: meetingId, messages }).then(r => r.data);

export const listMeetings = () =>
    api.get('/meetings').then(r => r.data);

export const searchMeetings = (query) =>
    api.get('/search', { params: { q: query } }).then(r => r.data);