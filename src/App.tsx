/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RoundHero } from './components/RoundHero';
import { SubmissionPortal } from './components/SubmissionPortal';
import { MySubmissionsView } from './components/MySubmissionsView';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminDashboard } from './components/AdminDashboard';
import { PromptInspectorView } from './components/PromptInspectorView';
import { RulesView } from './components/RulesView';
import { ParticipantDetailModal } from './components/ParticipantDetailModal';
import { AdminPinModal } from './components/AdminPinModal';
import { LoginGate } from './components/LoginGate';
import { EventState, RoundNumber, Submission, Participant, ParticipantUser } from './types';
import { INITIAL_EVENT_STATE } from './data/mockData';
import { api } from './services/api';
import { sound } from './utils/audio';
import { Lock, KeyRound } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'portal' | 'my-submissions' | 'leaderboard' | 'admin' | 'inspector' | 'rules'>('portal');
  const [activeRound, setActiveRound] = useState<RoundNumber>(2);
  const [eventState, setEventState] = useState<EventState>(INITIAL_EVENT_STATE);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<ParticipantUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Verify auth session on startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        const [me, adminMe] = await Promise.all([
          api.getMe(),
          api.getAdminMe()
        ]);
        setCurrentUser(me);
        setIsAdmin(adminMe);
        setCurrentTab('portal');
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    };
    initAuth();
  }, []);

  // Load initial tournament data
  const loadData = async (round?: 'overall' | 1 | 2 | 3 | string) => {
    try {
      const stateRes = await api.getEventState();
      setEventState(stateRes);
      setActiveRound(stateRes.activeRound);

      const [leadRes] = await Promise.all([
        api.getLeaderboard(round)
      ]);
      setParticipants(leadRes);

      if (isAdmin) {
        const subsRes = await api.getSubmissions();
        setSubmissions(subsRes);
      } else if (currentUser) {
        const mySubs = await api.getMySubmissions();
        setSubmissions(mySubs);
      }
    } catch (err) {
      console.error('Failed to load tournament data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, isAdmin]);



  // Handle URL hash anchor navigation (#round-1, #round-2, #round-3, #submission-portal)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#round-([1-3])$/);
      if (match) {
        const roundNum = Number(match[1]) as RoundNumber;
        setCurrentTab('portal');
        setActiveRound(roundNum);
        setTimeout(() => {
          const el = document.getElementById(`round-${roundNum}`) || document.getElementById('submission-portal');
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      } else if (hash === '#submission-portal') {
        setCurrentTab('portal');
        setTimeout(() => {
          document.getElementById('submission-portal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Handle Event State Updates
  const handleUpdateEventState = async (updates: Partial<EventState>) => {
    try {
      const updated = await api.updateEventState(updates);
      setEventState(updated);
      if (updated.activeRound) {
        setActiveRound(updated.activeRound);
      }
    } catch {
      setEventState((prev) => ({ ...prev, ...updates }));
    }
  };

  // Callback on new submission
  const handleSubmissionSuccess = (newSub: Submission) => {
    setSubmissions((prev) => [newSub, ...prev.filter(s => s.id !== newSub.id)]);
    api.getLeaderboard().then((res) => setParticipants(res));
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  // 1. Loading screen while checking auth session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-mono font-black text-sm uppercase">VERIFYING ARENA CREDENTIALS...</p>
      </div>
    );
  }

  // 2. Render Login Gate if participant is unauthenticated
  if (!currentUser) {
    return (
      <LoginGate
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTab('portal');
          loadData();
          if (window.location.hash) {
            setTimeout(() => {
              const hash = window.location.hash;
              const match = hash.match(/^#round-([1-3])$/);
              if (match) {
                const roundNum = Number(match[1]) as RoundNumber;
                setActiveRound(roundNum);
              }
              const target = document.querySelector(hash) || document.getElementById('submission-portal');
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
          }
        }}
      />
    );
  }

  const activeAnnouncement = eventState.announcements[0];

  return (
    <div className="min-h-screen bg-[#F4F4F0] text-black flex flex-col font-sans selection:bg-[#FFD600] selection:text-black pb-20 md:pb-0">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        eventState={eventState}
        onUpdateEventState={handleUpdateEventState}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        onOpenAdminPinModal={() => setShowAdminPinModal(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Global Live Announcement Strip */}
      {activeAnnouncement && (
        <div className="bg-[#FF4081] text-white border-b-3 border-black px-4 py-2 text-xs font-mono font-bold">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-black animate-ping"></span>
              <span className="uppercase tracking-wider">REFEREE BROADCAST:</span>
              <span className="underline decoration-2">{activeAnnouncement.message}</span>
            </div>
            <span className="opacity-80 hidden sm:inline">{activeAnnouncement.time}</span>
          </div>
        </div>
      )}

      {/* Round Hero Banner (shown on portal) */}
      {currentTab === 'portal' && (
        <RoundHero
          activeRound={activeRound}
          onSelectRound={(r) => {
            setActiveRound(r);
            handleUpdateEventState({ activeRound: r });
            setCurrentTab('portal');
            if (window.location.hash !== `#round-${r}`) {
              window.history.pushState(null, '', `#round-${r}`);
            }
            setTimeout(() => {
              const target = document.getElementById(`round-${r}`) || document.getElementById('submission-portal');
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 60);
          }}
        />
      )}

      {/* Rolling Stats Ticker Strip */}
      <div className="ticker-strip py-2.5">
        <div className="ticker-track text-xs font-mono font-extrabold uppercase tracking-widest space-x-8">
          <span>⚡ LIVE ARENA ACTIVE</span>
          <span>💀 ROUND 0{activeRound} IN PROGRESS</span>
          <span>🔮 NLP AUTHENTICITY GUARDRAILS (+10 BONUS)</span>
          <span>🏆 {eventState.isLeaderboardPublished ? 'STANDINGS RELEASED' : 'LEADERBOARD EMBARGO ACTIVE'}</span>
          <span>🔥 ₹100 PER CADET · INDIVIDUAL SPRINT</span>
          <span>💡 IMAGINE • PROMPT • CREATE</span>
          <span>⚡ LIVE ARENA ACTIVE</span>
          <span>💀 ROUND 0{activeRound} IN PROGRESS</span>
          <span>🔮 NLP AUTHENTICITY GUARDRAILS (+10 BONUS)</span>
          <span>🏆 {eventState.isLeaderboardPublished ? 'STANDINGS RELEASED' : 'LEADERBOARD EMBARGO ACTIVE'}</span>
          <span>🔥 ₹100 PER CADET · INDIVIDUAL SPRINT</span>
          <span>💡 IMAGINE • PROMPT • CREATE</span>
        </div>
      </div>

      {/* Main View Router */}
      <main className="flex-1">
        {currentTab === 'portal' && (
          <SubmissionPortal
            activeRound={activeRound}
            setActiveRound={setActiveRound}
            eventState={eventState}
            currentUser={currentUser}
            existingSubmissions={submissions}
            participants={participants}
            onSubmissionSuccess={handleSubmissionSuccess}
          />
        )}

        {currentTab === 'my-submissions' && (
          <MySubmissionsView currentUser={currentUser} />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardView
            participants={participants}
            submissions={submissions}
            onSelectParticipant={setSelectedParticipant}
            onRefresh={loadData}
            isAdmin={isAdmin}
            eventState={eventState}
            onUpdateEventState={handleUpdateEventState}
            onOpenAdminPinModal={() => setShowAdminPinModal(true)}
          />
        )}

        {currentTab === 'admin' && (
          isAdmin ? (
            <AdminDashboard
              submissions={submissions}
              participants={participants}
              eventState={eventState}
              onUpdateEventState={handleUpdateEventState}
              onRefreshData={loadData}
            />
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-6">
              <div className="bg-white border-4 border-black p-8 sm:p-12 rounded-3xl shadow-[10px_10px_0_#000] text-center space-y-6">
                <div className="w-16 h-16 bg-[#FF4081] border-3 border-black rounded-2xl flex items-center justify-center text-white mx-auto shadow-[4px_4px_0_#000]">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-[#FFD600] text-black font-mono font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000]">
                    TOURNAMENT REFEREE & JUDGES ONLY
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-heading font-black text-black uppercase tracking-tight">
                    ADMIN CONSOLE LOCKED
                  </h2>
                  <p className="text-xs sm:text-sm font-mono text-black/80 max-w-lg mx-auto leading-relaxed pt-1">
                    This control panel is restricted to authorized tournament evaluators, judges, and administrators. Enter your judge passcode to evaluate submissions, calibrate rubrics, and release round standings.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setShowAdminPinModal(true)}
                    className="neo-btn bg-[#FFD600] hover:bg-[#00C853] text-black px-6 py-3 text-xs uppercase font-black flex items-center justify-center space-x-2 mx-auto cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>ENTER JUDGE PASSCODE TO UNLOCK</span>
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {currentTab === 'inspector' && (
          <PromptInspectorView
            isAdmin={isAdmin}
            onOpenAdminPinModal={() => setShowAdminPinModal(true)}
          />
        )}

        {currentTab === 'rules' && <RulesView />}
      </main>

      {/* Participant Detail Modal */}
      <ParticipantDetailModal
        participant={selectedParticipant}
        submissions={submissions}
        onClose={() => setSelectedParticipant(null)}
      />

      {/* Universal Judge & Admin Passcode Modal */}
      <AdminPinModal
        isOpen={showAdminPinModal}
        onClose={() => setShowAdminPinModal(false)}
        onSuccess={() => {
          setIsAdmin(true);
          setCurrentTab('admin');
          loadData();
        }}
      />

      {/* Neo-Brutalist Footer */}
      <footer className="border-t-4 border-black bg-black text-white py-8 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-heading font-black text-sm uppercase text-[#FFD600]">PROMPT WARS 2026</span>
            <span>·</span>
            <span className="font-bold">BATTLE OF THE MINDS</span>
            <span>·</span>
            <span className="text-[#00E5FF]">DEPARTMENT OF AI & DATA SCIENCE</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-neutral-400 text-[11px] font-bold">
            <span className="bg-neutral-900 border border-neutral-700 px-2 py-0.5">₹100 REGISTRATION</span>
            <span className="bg-neutral-900 border border-neutral-700 px-2 py-0.5">3 ROUNDS</span>
            <span className="bg-neutral-900 border border-neutral-700 px-2 py-0.5">
              {eventState.isLeaderboardPublished ? 'LEADERBOARD: PUBLIC' : 'LEADERBOARD: EMBARGOED'}
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
