import { Submission, Participant, EventState, PromptAuthenticityResult, ParticipantUser } from '../types';

const USE_MOCKS = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true';

export const api = {
  // ------------------- AUTHENTICATION -------------------
  async login(email: string, registrationId?: string): Promise<ParticipantUser> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, registrationId: registrationId || email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'No participant record found for this email address');
    }
    return data.participant;
  },

  async getMe(): Promise<ParticipantUser | null> {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  },

  async adminLogin(passcode: string): Promise<boolean> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ passcode })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid admin passcode');
    return true;
  },

  async getAdminMe(): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/me', { credentials: 'same-origin' });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.isAdmin);
    } catch {
      return false;
    }
  },

  async adminLogout(): Promise<void> {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
  },

  // ------------------- PROMPT CHECK -------------------
  async checkPrompt(promptText: string): Promise<PromptAuthenticityResult> {
    const res = await fetch('/api/check-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ promptText })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Prompt authenticity check failed');
    return data;
  },

  // ------------------- ROUND 1 TASK DRAWING -------------------
  async getMyRound1Task(): Promise<{ success: boolean; task: any; isAssigned: boolean }> {
    const res = await fetch('/api/round1/my-task', { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to retrieve Round 1 task');
    return data;
  },

  async drawRound1Task(): Promise<{ success: boolean; task: any; isAlreadyAssigned: boolean }> {
    const res = await fetch('/api/round1/draw-task', {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to draw Round 1 task');
    return data;
  },

  // ------------------- ROUND 2 TASK DRAWING -------------------
  async getMyRound2Task(): Promise<{ success: boolean; task: any; isAssigned: boolean }> {
    const res = await fetch('/api/round2/my-task', { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to retrieve Round 2 task');
    return data;
  },

  async drawRound2Task(): Promise<{ success: boolean; task: any; isAlreadyAssigned: boolean }> {
    const res = await fetch('/api/round2/draw-task', {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to draw Round 2 task');
    return data;
  },

  // ------------------- EVENT STATE -------------------
  async getEventState(): Promise<EventState> {
    const res = await fetch('/api/event-state', { credentials: 'same-origin' });
    if (!res.ok) {
      if (USE_MOCKS) {
        const { INITIAL_EVENT_STATE } = await import('../data/mockData');
        return INITIAL_EVENT_STATE;
      }
      throw new Error('Failed to fetch event state');
    }
    return await res.json();
  },

  async updateEventState(updates: Partial<EventState>): Promise<EventState> {
    const res = await fetch('/api/event-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update event state');
    return data.eventState;
  },

  // ------------------- SUBMISSIONS -------------------
  async getMySubmissions(): Promise<Submission[]> {
    const res = await fetch('/api/submissions/mine', { credentials: 'same-origin' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch your submissions');
    }
    return await res.json();
  },

  async getSubmissions(params?: { round?: number; status?: string }): Promise<Submission[]> {
    const query = new URLSearchParams();
    if (params?.round) query.set('round', params.round.toString());
    if (params?.status) query.set('status', params.status);

    const res = await fetch(`/api/submissions?${query.toString()}`, { credentials: 'same-origin' });
    if (!res.ok) {
      if (USE_MOCKS) {
        const { INITIAL_SUBMISSIONS } = await import('../data/mockData');
        let filtered = [...INITIAL_SUBMISSIONS];
        if (params?.round) filtered = filtered.filter(s => s.roundId === params.round);
        if (params?.status) filtered = filtered.filter(s => s.status === params.status);
        return filtered;
      }
      const data = await res.json();
      throw new Error(data.error || 'Failed to fetch submissions');
    }
    return await res.json();
  },

  async createSubmission(payload: Partial<Submission>): Promise<{ success: boolean; submission: Submission }> {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Submission failed. Please retry.');
    }
    return data;
  },

  async gradeSubmission(id: string, scoresData: any): Promise<any> {
    const res = await fetch(`/api/submissions/${id}/grade`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(scoresData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Grading failed');
    return data;
  },

  async aiGradeSubmission(id: string): Promise<{ success: boolean; submission: Submission; scores: any }> {
    const res = await fetch(`/api/submissions/${id}/ai-grade`, {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gemini AI evaluation failed');
    return data;
  },

  async autoGradeRound1(): Promise<{ success: boolean; gradedCount: number; message: string }> {
    const res = await fetch('/api/admin/auto-grade-round1', {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Batch autograding failed');
    return data;
  },

  // ------------------- LEADERBOARD & SYSTEM -------------------
  async getLeaderboard(round?: 1 | 2 | 3 | string): Promise<Participant[]> {
    const targetRound = round || 1;
    const url = `/api/leaderboard?round=${targetRound}`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      if (USE_MOCKS) {
        const { INITIAL_PARTICIPANTS } = await import('../data/mockData');
        return INITIAL_PARTICIPANTS;
      }
      throw new Error('Failed to fetch leaderboard');
    }
    return await res.json();
  },

  async resetData(): Promise<void> {
    const res = await fetch('/api/seed-reset', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Reset failed');
    }
  },

  async getDbStatus(): Promise<{ connected: boolean; provider: string; supabaseUrl: string | null }> {
    try {
      const res = await fetch('/api/db-status', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Failed to fetch DB status');
      return await res.json();
    } catch {
      return { connected: false, provider: 'in-memory', supabaseUrl: null };
    }
  }
};
