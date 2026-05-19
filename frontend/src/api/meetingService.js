import { supabase } from './supabaseClient';

const backendBaseURL = 'http://localhost:5000/api';

/**
 * Inserts a meeting record into the Supabase `meetings` table.
 * @param {Object} meeting - Full meeting object (including AI‑generated JSON).
 * @returns {Promise<{data:any, error:any}>}
 */
export async function storeMeeting(meeting) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable storage.'),
    };
  }

  const { data, error } = await supabase.from('meetings').insert([
    {
      title: meeting.title || 'Untitled Meeting',
      meeting_date: meeting.meeting_date || new Date().toISOString().split('T')[0],
      meeting_time: meeting.meeting_time || null,
      organizer: meeting.organizer || null,
      platform: meeting.platform || null,
      status: 'saved',
      full_meeting_json: meeting,
      raw_transcript: meeting.raw || null,
      tags: meeting.tags || [],
      sentiment: meeting.sentiment || null,
      risk_level: meeting.risk_level || null,
    },
  ]).select();
  return { data, error };
}

/** Updates an existing meeting record in Supabase or the local backend. */
export async function updateMeeting(meetingId, meeting) {
  if (!supabase) {
    try {
      const response = await fetch(`${backendBaseURL}/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meeting),
      });
      const data = await response.json();
      return {
        data,
        error: response.ok ? null : new Error(data?.error || 'Failed to update meeting'),
      };
    } catch (error) {
      return { data: null, error };
    }
  }

  const { data, error } = await supabase
    .from('meetings')
    .update({
      title: meeting.title || 'Untitled Meeting',
      meeting_date: meeting.meeting_date || new Date().toISOString().split('T')[0],
      meeting_time: meeting.meeting_time || null,
      organizer: meeting.organizer || null,
      platform: meeting.platform || null,
      full_meeting_json: meeting,
      raw_transcript: meeting.raw || null,
      tags: meeting.tags || [],
      sentiment: meeting.sentiment || null,
      risk_level: meeting.risk_level || null,
    })
    .eq('id', meetingId)
    .select();

  return { data, error };
}

/** Retrieves all meetings ordered by newest first */
export async function fetchMeetings() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Reconstruct meeting objects from stored data
        const meetings = data.map(row => {
          let fullJson = row.full_meeting_json;
          
          // Parse if it's stored as a string
          if (typeof fullJson === 'string') {
            try {
              fullJson = JSON.parse(fullJson);
            } catch {
              fullJson = {};
            }
          }
          
          // The stored data has result nested at different levels, check all
          let result = fullJson?.result || fullJson?.full_meeting_json?.result || {};
          
          // If result is empty, try to extract from top-level fields
          if (!result || Object.keys(result).length === 0) {
            result = {
              summary: fullJson?.summary || row.summary || '',
              action_items: fullJson?.action_items || row.action_items || [],
              decisions: fullJson?.decisions || row.decisions || [],
              highlights: fullJson?.highlights || row.highlights || []
            };
          }
          
          return {
            id: row.id,
            title: row.title || fullJson?.title || 'Untitled Meeting',
            raw: row.raw_transcript || fullJson?.raw || row.raw || '',
            result: result,
            full_meeting_json: fullJson,
            meeting_date: row.meeting_date || fullJson?.meeting_date || null,
            created_at: row.created_at || null,
            status: row.status || null,
            tags: row.tags || fullJson?.tags || []
          };
        });
        return { data: meetings, error: null };
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
    }
  }

  try {
    const response = await fetch(`${backendBaseURL}/meetings`);
    const data = await response.json();
    return {
      data: Array.isArray(data) ? data : [],
      error: response.ok ? null : new Error(data?.error || 'Failed to load meetings'),
    };
  } catch (error) {
    return { data: [], error };
  }
}
