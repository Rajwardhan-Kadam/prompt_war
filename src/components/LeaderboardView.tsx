import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Sparkles,
  School,
  CheckCircle2,
  RefreshCw,
  Flame,
  Zap,
  Crown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  Image as ImageIcon,
  Code2,
  Terminal,
  Layers
} from 'lucide-react';
import { Participant, Submission, EventState } from '../types';
import { sound } from '../utils/audio';

interface LeaderboardViewProps {
  participants: Participant[];
  submissions: Submission[];
  onSelectParticipant: (participant: Participant) => void;
  onRefresh: (round?: 'overall' | 1 | 2 | 3) => void;
  isAdmin: boolean;
  eventState: EventState;
  onUpdateEventState: (updates: Partial<EventState>) => void;
  onOpenAdminPinModal: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  participants,
  submissions,
  onSelectParticipant,
  onRefresh,
  isAdmin,
  eventState,
  onUpdateEventState,
  onOpenAdminPinModal
}) => {
  // Round-wise separate tabs: 'overall' | 1 | 2 | 3
  const [selectedRoundTab, setSelectedRoundTab] = useState<'overall' | 1 | 2 | 3>('overall');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCollege, setFilterCollege] = useState('all');
  const [sortBy, setSortBy] = useState<'total' | 'r1' | 'r2' | 'r3' | 'bonus'>('total');

  // Check if current active tab is released or embargoed
  const isCurrentTabReleased =
    selectedRoundTab === 'overall'
      ? eventState.isLeaderboardPublished
      : selectedRoundTab === 1
      ? eventState.publishedRounds?.round1 ?? false
      : selectedRoundTab === 2
      ? eventState.publishedRounds?.round2 ?? false
      : eventState.publishedRounds?.round3 ?? false;

  const isCurrentTabEmbargoed = !isAdmin && !isCurrentTabReleased;

  // Filter participants
  const filtered = participants.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.registrationId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.college || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCollege = filterCollege === 'all' || p.college === filterCollege;
    return matchesSearch && matchesCollege;
  });

  // Sort participants depending on active round tab
  const sorted = [...filtered].sort((a, b) => {
    if (selectedRoundTab === 1) {
      if (b.round1Score !== a.round1Score) return b.round1Score - a.round1Score;
      return b.totalScore - a.totalScore;
    }
    if (selectedRoundTab === 2) {
      if (b.round2Score !== a.round2Score) return b.round2Score - a.round2Score;
      return b.totalScore - a.totalScore;
    }
    if (selectedRoundTab === 3) {
      if (b.round3Score !== a.round3Score) return b.round3Score - a.round3Score;
      return b.totalScore - a.totalScore;
    }

    // Overall tab sorting
    if (sortBy === 'total') return b.totalScore - a.totalScore;
    if (sortBy === 'r1') return b.round1Score - a.round1Score;
    if (sortBy === 'r2') return b.round2Score - a.round2Score;
    if (sortBy === 'r3') return b.round3Score - a.round3Score;
    if (sortBy === 'bonus') return b.authenticityBonusTotal - a.authenticityBonusTotal;
    return b.totalScore - a.totalScore;
  });

  // Unique colleges for filter
  const uniqueColleges = Array.from(new Set(participants.map((p) => p.college)));

  // Top 3 Podium for active tab
  const top1 = sorted[0];
  const top2 = sorted[1];
  const top3 = sorted[2];

  // Helper to get participant's specific submission for round
  const getSubmissionForRound = (participantId: string, regId: string, roundId: 1 | 2 | 3) => {
    return submissions.find(
      (s) => (s.participantId === participantId || s.registrationId === regId) && s.roundId === roundId
    );
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#FFD600] text-black font-black font-mono text-xs border-2 border-black shadow-[2px_2px_0_#000]">
            <Crown className="w-3.5 h-3.5" />
            <span>#01</span>
          </div>
        );
      case 2:
        return (
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white text-black font-black font-mono text-xs border-2 border-black shadow-[2px_2px_0_#000]">
            <Medal className="w-3.5 h-3.5" />
            <span>#02</span>
          </div>
        );
      case 3:
        return (
          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#FF6B00] text-white font-black font-mono text-xs border-2 border-black shadow-[2px_2px_0_#000]">
            <Medal className="w-3.5 h-3.5" />
            <span>#03</span>
          </div>
        );
      default:
        return (
          <span className="font-mono text-black font-black text-xs px-2 py-0.5 bg-neutral-100 border border-black rounded">
            {rank.toString().padStart(2, '0')}
          </span>
        );
    }
  };

  const getTabTitle = () => {
    if (selectedRoundTab === 'overall') return 'GRAND CHAMPIONSHIP BOARD';
    if (selectedRoundTab === 1) return 'ROUND 01 — PROMPT TO PICTURE STANDINGS';
    if (selectedRoundTab === 2) return 'ROUND 02 — SCENARIO SPRINT STANDINGS';
    return 'ROUND 03 — PROMPT TO PRODUCT FINALE';
  };

  const getTabSubtitle = () => {
    if (selectedRoundTab === 'overall') {
      return 'Cumulative championship standings across all 3 rounds plus verified ML authenticity bonus.';
    }
    if (selectedRoundTab === 1) {
      return 'Image generation challenge scores based on prompt precision, aesthetic output relevance, and screenshot verification.';
    }
    if (selectedRoundTab === 2) {
      return 'Situation-based prompting challenge scores evaluated on 15-word scenario solving, constraint syntax, and LLM reasoning.';
    }
    return 'AI-assisted full prototype scores evaluated on functional delivery, code architecture, and live demonstration.';
  };

  const handleToggleCurrentRelease = () => {
    if (selectedRoundTab === 'overall') {
      const next = !eventState.isLeaderboardPublished;
      onUpdateEventState({ isLeaderboardPublished: next });
      if (next) sound.playSuccessChime();
      else sound.playWarningPing();
    } else if (selectedRoundTab === 1) {
      const next = !(eventState.publishedRounds?.round1 ?? false);
      onUpdateEventState({
        publishedRounds: { ...eventState.publishedRounds, round1: next }
      });
      if (next) sound.playSuccessChime();
      else sound.playWarningPing();
    } else if (selectedRoundTab === 2) {
      const next = !(eventState.publishedRounds?.round2 ?? false);
      onUpdateEventState({
        publishedRounds: { ...eventState.publishedRounds, round2: next }
      });
      if (next) sound.playSuccessChime();
      else sound.playWarningPing();
    } else if (selectedRoundTab === 3) {
      const next = !(eventState.publishedRounds?.round3 ?? false);
      onUpdateEventState({
        publishedRounds: { ...eventState.publishedRounds, round3: next }
      });
      if (next) sound.playSuccessChime();
      else sound.playWarningPing();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* ------------------------------------------------------------- */}
      {/* ROUND-WISE SEPARATE TAB SWITCHER (Loot Drop Style) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border-4 border-black p-3 rounded-2xl shadow-[6px_6px_0_#000] space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-mono font-black text-black/70 uppercase tracking-wider flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-black" />
            <span>SELECT TOURNAMENT LEADERBOARD:</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-black/50 hidden sm:inline">
            CLICK TABS TO VIEW ROUND-BY-ROUND STANDINGS
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Overall Tab */}
          <button
            onClick={() => {
              setSelectedRoundTab('overall');
              sound.playBeep(700, 0.04);
              onRefresh('overall');
            }}
            className={`py-3 px-3 rounded-xl border-3 border-black text-xs font-mono font-black uppercase transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 cursor-pointer ${
              selectedRoundTab === 'overall'
                ? 'bg-[#FFD600] text-black shadow-[4px_4px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                : 'bg-[#F4F4F0] text-black hover:bg-neutral-200'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span className="truncate">OVERALL BOARD</span>
            {!eventState.isLeaderboardPublished ? (
              <span className="text-[9px] bg-[#FF4081] text-white px-1.5 py-0.2 rounded border border-black shrink-0 font-bold">
                {isAdmin ? 'EMBARGO' : '🔒'}
              </span>
            ) : (
              <span className="text-[9px] bg-[#00C853] text-black px-1.5 py-0.2 rounded border border-black shrink-0 font-bold">
                LIVE
              </span>
            )}
          </button>

          {/* Round 1 Tab */}
          <button
            onClick={() => {
              setSelectedRoundTab(1);
              sound.playBeep(750, 0.04);
              onRefresh(1);
            }}
            className={`py-3 px-3 rounded-xl border-3 border-black text-xs font-mono font-black uppercase transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 cursor-pointer ${
              selectedRoundTab === 1
                ? 'bg-[#FFD600] text-black shadow-[4px_4px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                : 'bg-[#F4F4F0] text-black hover:bg-neutral-200'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">ROUND 01 (PICTURE)</span>
            {eventState.publishedRounds?.round1 ? (
              <span className="text-[9px] bg-[#00C853] text-black px-1.5 py-0.2 rounded border border-black shrink-0 font-bold">
                RELEASED
              </span>
            ) : (
              <span className="text-[9px] bg-[#FF4081] text-white px-1.5 py-0.2 rounded border border-black shrink-0 font-bold">
                LOCKED 🔒
              </span>
            )}
          </button>

          {/* Round 2 Tab */}
          <button
            onClick={() => {
              setSelectedRoundTab(2);
              sound.playBeep(800, 0.04);
              onRefresh(2);
            }}
            className={`py-3 px-3 rounded-xl border-3 border-black text-xs font-mono font-black uppercase transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 cursor-pointer ${
              selectedRoundTab === 2
                ? 'bg-[#FFD600] text-black shadow-[4px_4px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                : 'bg-[#F4F4F0] text-black hover:bg-neutral-200'
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span className="truncate">ROUND 02 (SCENARIO)</span>
            {eventState.publishedRounds?.round2 ? (
              <span className="text-[9px] bg-[#00C853] text-black px-1.5 py-0.2 rounded border border-black shrink-0 font-bold">
                RELEASED
              </span>
            ) : (
              <span className="text-[9px] bg-[#FF4081] text-white px-1.5 py-0.2 rounded border border-black shrink-0 font-bold">
                LOCKED 🔒
              </span>
            )}
          </button>

          {/* Round 3 Tab */}
          <button
            onClick={() => {
              setSelectedRoundTab(3);
              sound.playBeep(850, 0.04);
              onRefresh(3);
            }}
            className={`py-3 px-3 rounded-xl border-3 border-black text-xs font-mono font-black uppercase transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 cursor-pointer ${
              selectedRoundTab === 3
                ? 'bg-[#FFD600] text-black shadow-[4px_4px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                : 'bg-[#F4F4F0] text-black hover:bg-neutral-200'
            }`}
          >
            <Code2 className="w-4 h-4 shrink-0" />
            <span className="truncate">ROUND 03 (PRODUCT)</span>
            {eventState.publishedRounds?.round3 ? (
              <span className="text-[9px] bg-[#00C853] text-black px-1.5 py-0.2 rounded border border-black shrink-0 font-bold">
                RELEASED
              </span>
            ) : (
              <span className="text-[9px] bg-[#FF4081] text-white px-1.5 py-0.2 rounded border border-black shrink-0 font-bold">
                LOCKED 🔒
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ADMIN PRIVILEGE / EMBARGO OVERRIDE BANNER */}
      {/* ------------------------------------------------------------- */}
      {isAdmin && (
        <div className={`border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0_#000] flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isCurrentTabReleased ? 'bg-[#00C853] text-black' : 'bg-[#FF4081] text-white'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black text-white rounded-xl border-2 border-black flex items-center justify-center shrink-0">
              {isCurrentTabReleased ? (
                <Eye className="w-5 h-5 text-[#00C853]" />
              ) : (
                <EyeOff className="w-5 h-5 text-[#FF4081]" />
              )}
            </div>
            <div>
              <div className="text-xs font-mono font-black uppercase">
                {isCurrentTabReleased
                  ? `📢 ${getTabTitle()} IS PUBLICLY RELEASED`
                  : `🔒 JUDGE PRIVATE PREVIEW: ${getTabTitle()} IS EMBARGOED`}
              </div>
              <p className="text-xs font-mono opacity-90 mt-0.5">
                {isCurrentTabReleased
                  ? 'Contestants can currently see the standings in this tab.'
                  : 'Contestants are blocked by the embargo screen until you release this specific round.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleCurrentRelease}
              className="neo-btn bg-white hover:bg-[#FFD600] text-black px-4 py-2 text-xs uppercase flex items-center space-x-1.5 cursor-pointer font-black"
            >
              {isCurrentTabReleased ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#FF4081]" />
                  <span>EMBARGO / HIDE THIS TAB</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 text-[#00C853]" />
                  <span>ALLOW & RELEASE THIS TAB</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* EMBARGO SCREEN (When contestant views an unreleased round tab) */}
      {/* ------------------------------------------------------------- */}
      {isCurrentTabEmbargoed ? (
        <div className="bg-[#FFD600] border-4 border-black p-8 sm:p-12 rounded-3xl shadow-[10px_10px_0_#000] text-center space-y-6">
          <div className="inline-flex items-center space-x-2 bg-black text-[#FFD600] px-4 py-1.5 rounded-xl border-2 border-black font-mono font-black text-xs uppercase shadow-[3px_3px_0_#000]">
            <Lock className="w-4 h-4 text-[#FFD600]" />
            <span>RESULTS EMBARGO ACTIVE</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-5xl font-heading font-black text-black uppercase tracking-tight">
              {selectedRoundTab === 'overall' ? 'OVERALL STANDINGS PENDING' : `ROUND 0${selectedRoundTab} EVALUATION IN PROGRESS`}
            </h2>
            <p className="text-xs sm:text-sm font-mono font-bold text-black/80 max-w-xl mx-auto leading-relaxed">
              Official scores for this specific round are currently being evaluated and verified by tournament referees. Standings will be unlocked here as soon as the round results are released.
            </p>
          </div>

          {/* Quick round status pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left font-mono max-w-2xl mx-auto">
            <div className={`p-3 rounded-xl border-2 border-black ${
              eventState.publishedRounds?.round1 ? 'bg-[#00C853] text-black' : 'bg-white text-black'
            }`}>
              <div className="text-[10px] font-black uppercase">ROUND 01 PICTURE</div>
              <div className="text-xs font-black mt-0.5">
                {eventState.publishedRounds?.round1 ? 'RELEASED ✅' : 'UNDER REVIEW ⏳'}
              </div>
            </div>
            <div className={`p-3 rounded-xl border-2 border-black ${
              eventState.publishedRounds?.round2 ? 'bg-[#00C853] text-black' : 'bg-white text-black'
            }`}>
              <div className="text-[10px] font-black uppercase">ROUND 02 SCENARIO</div>
              <div className="text-xs font-black mt-0.5">
                {eventState.publishedRounds?.round2 ? 'RELEASED ✅' : 'UNDER REVIEW ⏳'}
              </div>
            </div>
            <div className={`p-3 rounded-xl border-2 border-black ${
              eventState.publishedRounds?.round3 ? 'bg-[#00C853] text-black' : 'bg-white text-black'
            }`}>
              <div className="text-[10px] font-black uppercase">ROUND 03 PRODUCT</div>
              <div className="text-xs font-black mt-0.5">
                {eventState.publishedRounds?.round3 ? 'RELEASED ✅' : 'UNDER REVIEW ⏳'}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t-3 border-black flex justify-center">
            <button
              onClick={onOpenAdminPinModal}
              className="neo-btn bg-white hover:bg-black hover:text-white text-black px-6 py-2.5 text-xs uppercase flex items-center space-x-2 cursor-pointer font-black"
            >
              <ShieldAlert className="w-4 h-4 text-[#FF4081]" />
              <span>JUDGE OR EVALUATOR? ENTER PASSCODE TO PREVIEW</span>
            </button>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* ACTIVE STANDINGS (Either Admin preview OR Publicly Released)  */
        /* ------------------------------------------------------------- */
        <>
          {/* Header Banner */}
          <div className="bg-white border-4 border-black p-5 sm:p-6 rounded-2xl shadow-[6px_6px_0_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#00C853] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-black animate-ping mr-1"></span>
                  {selectedRoundTab === 'overall' ? 'CHAMPIONSHIP STANDINGS' : `ROUND 0${selectedRoundTab} STANDINGS`}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFD600] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000]">
                  REAL-TIME AUDITED
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-black text-black uppercase tracking-tight">
                {getTabTitle()}
              </h2>
              <p className="text-xs sm:text-sm font-mono text-black/80 mt-1 max-w-2xl leading-relaxed">
                {getTabSubtitle()}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  onRefresh(selectedRoundTab);
                  sound.playBeep(850, 0.05);
                }}
                className="neo-btn bg-[#FFD600] text-black px-4 py-2.5 flex items-center space-x-2 text-xs cursor-pointer font-black"
              >
                <RefreshCw className="w-4 h-4" />
                <span>REFRESH RANKS</span>
              </button>
            </div>
          </div>

          {/* Round Cutoff Rule Notice Strip */}
          {selectedRoundTab === 1 && (
            <div className="bg-[#FFD600] border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-black text-[#FFD600] rounded-xl flex items-center justify-center font-mono font-black text-lg border-2 border-black shrink-0">
                  30
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm uppercase text-black">
                    ROUND 01 ADVANCEMENT RULE: TOP 30 CADETS ADVANCE TO ROUND 02
                  </h4>
                  <p className="font-mono text-xs text-black/80 font-bold mt-0.5">
                    Only contestants ranked in the Top 30 for Round 01 qualify for the Round 02 Scenario Sprint.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-center bg-black text-white px-3 py-1 text-xs font-mono font-black uppercase rounded-lg border border-black shrink-0">
                TOP 30 CUTOFF
              </span>
            </div>
          )}

          {selectedRoundTab === 2 && (
            <div className="bg-[#00E5FF] border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-black text-[#00E5FF] rounded-xl flex items-center justify-center font-mono font-black text-lg border-2 border-black shrink-0">
                  10
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm uppercase text-black">
                    ROUND 02 FINALS ADVANCEMENT RULE: TOP 10 CADETS ADVANCE TO ROUND 03 FINALE
                  </h4>
                  <p className="font-mono text-xs text-black/80 font-bold mt-0.5">
                    Only the Top 10 contestants from Round 02 Scenario Sprint qualify for the Round 03 Prompt to Product Finale.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-center bg-black text-white px-3 py-1 text-xs font-mono font-black uppercase rounded-lg border border-black shrink-0">
                TOP 10 FINALS CUTOFF
              </span>
            </div>
          )}

          {selectedRoundTab === 3 && (
            <div className="bg-[#00C853] border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-black text-[#FFD600] rounded-xl flex items-center justify-center font-mono font-black text-lg border-2 border-black shrink-0">
                  🏆
                </div>
                <div>
                  <h4 className="font-heading font-black text-sm uppercase text-black">
                    ROUND 03 GRAND FINALE: TOP 10 FINALISTS BATTLING FOR TOURNAMENT CHAMPIONSHIP
                  </h4>
                  <p className="font-mono text-xs text-black/80 font-bold mt-0.5">
                    The top 10 finalists build functional prototypes. Final podium standings will be announced live by tournament judges!
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-center bg-black text-[#FFD600] px-3 py-1 text-xs font-mono font-black uppercase rounded-lg border border-black shrink-0">
                GRAND FINALE
              </span>
            </div>
          )}

          {/* Podium Top 3 Cards for Selected Tab */}
          {sorted.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 pt-2">
              
              {/* 1st Place - Gold Hero Card */}
              {top1 && (
                <div
                  onClick={() => { onSelectParticipant(top1); sound.playBeep(850, 0.05); }}
                  className="bg-[#FFD600] border-4 border-black rounded-2xl p-6 shadow-[8px_8px_0_#000] md:-rotate-1 hover:rotate-0 transition-transform duration-200 cursor-pointer order-1 md:order-2 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-xl bg-black text-[#FFD600] font-heading font-black text-xs uppercase flex items-center space-x-1.5 shadow-[2px_2px_0_#000]">
                      <Crown className="w-4 h-4 text-[#FFD600]" />
                      <span>{selectedRoundTab === 'overall' ? 'GOLD CHAMPION · RANK #01' : `ROUND 0${selectedRoundTab} WINNER · #01`}</span>
                    </span>
                    <span className="text-xs font-mono font-black text-black bg-white px-2 py-0.5 rounded border-2 border-black">
                      {top1.registrationId}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 mb-5">
                    <div className="relative">
                      <img
                        src={top1.avatar}
                        alt={top1.name}
                        className="w-16 h-16 rounded-xl border-3 border-black shadow-[3px_3px_0_#000] object-cover bg-white"
                      />
                      <div className="absolute -bottom-2 -right-2 bg-black text-[#FFD600] rounded-full p-1 border-2 border-black text-[10px]">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-heading font-black text-black text-lg sm:text-xl uppercase leading-tight">
                        {top1.name}
                      </h4>
                      <p className="text-xs font-mono font-bold text-black/80 line-clamp-1">{top1.college}</p>
                      <div className="inline-flex items-center space-x-1 mt-1 text-[11px] font-mono font-black bg-[#00C853] text-black px-2 py-0.5 rounded border border-black">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ML BONUS +{top1.authenticityBonusTotal} PTS</span>
                      </div>
                    </div>
                  </div>

                  {/* Round breakdown or round-specific details */}
                  {selectedRoundTab === 'overall' ? (
                    <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border-3 border-black text-center font-mono text-xs shadow-[3px_3px_0_#000]">
                      <div>
                        <div className="text-[10px] font-black text-black/60 uppercase">R1 Picture</div>
                        <div className="font-black text-black text-base">{top1.round1Score}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-black/60 uppercase">R2 Scenario</div>
                        <div className="font-black text-black text-base">{top1.round2Score}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-black/60 uppercase">R3 Product</div>
                        <div className="font-black text-black text-base">{top1.round3Score}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-xl border-3 border-black font-mono text-xs shadow-[3px_3px_0_#000] space-y-1">
                      <div className="text-[10px] font-black text-black/60 uppercase">ROUND DELIVERABLE VERIFIED:</div>
                      <div className="text-xs text-black font-bold line-clamp-2">
                        {getSubmissionForRound(top1.id, top1.registrationId, selectedRoundTab)?.assignedThemeOrChit || 'Verified tournament challenge submission'}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t-3 border-black flex items-center justify-between">
                    <span className="text-xs font-heading font-black uppercase text-black">
                      {selectedRoundTab === 'overall' ? 'TOTAL SCORE' : `ROUND 0${selectedRoundTab} SCORE`}
                    </span>
                    <span className="text-3xl font-mono font-black text-black">
                      {selectedRoundTab === 'overall'
                        ? `${top1.totalScore} PTS`
                        : selectedRoundTab === 1
                        ? `${top1.round1Score} PTS`
                        : selectedRoundTab === 2
                        ? `${top1.round2Score} PTS`
                        : `${top1.round3Score} PTS`}
                    </span>
                  </div>
                </div>
              )}

              {/* 2nd Place - Silver Card */}
              {top2 && (
                <div
                  onClick={() => { onSelectParticipant(top2); sound.playBeep(700, 0.04); }}
                  className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0_#000] md:rotate-1 hover:rotate-0 transition-transform duration-200 cursor-pointer order-2 md:order-1 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-xl bg-neutral-100 text-black font-heading font-black text-xs uppercase border-2 border-black flex items-center space-x-1.5 shadow-[2px_2px_0_#000]">
                      <Medal className="w-4 h-4 text-neutral-600" />
                      <span>SILVER · RANK #02</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-black/70 bg-neutral-100 px-2 py-0.5 rounded border border-black">
                      {top2.registrationId}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-5">
                    <img
                      src={top2.avatar}
                      alt={top2.name}
                      className="w-14 h-14 rounded-xl border-3 border-black shadow-[3px_3px_0_#000] object-cover bg-neutral-100"
                    />
                    <div>
                      <h4 className="font-heading font-black text-black text-base sm:text-lg uppercase leading-tight">
                        {top2.name}
                      </h4>
                      <p className="text-xs font-mono font-bold text-black/70 line-clamp-1">{top2.college}</p>
                    </div>
                  </div>

                  {selectedRoundTab === 'overall' ? (
                    <div className="grid grid-cols-3 gap-2 bg-[#F4F4F0] p-3 rounded-xl border-2 border-black text-center font-mono text-xs">
                      <div>
                        <div className="text-[10px] font-bold text-black/60 uppercase">R1</div>
                        <div className="font-black text-black text-sm">{top2.round1Score}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-black/60 uppercase">R2</div>
                        <div className="font-black text-black text-sm">{top2.round2Score}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-black/60 uppercase">R3</div>
                        <div className="font-black text-black text-sm">{top2.round3Score}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#F4F4F0] p-3 rounded-xl border-2 border-black font-mono text-xs space-y-1">
                      <div className="text-[10px] font-bold text-black/60 uppercase">ROUND DELIVERABLE:</div>
                      <div className="text-xs text-black font-bold line-clamp-2">
                        {getSubmissionForRound(top2.id, top2.registrationId, selectedRoundTab)?.assignedThemeOrChit || 'Verified challenge deliverable'}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
                    <span className="text-xs font-heading font-black text-black uppercase">
                      {selectedRoundTab === 'overall' ? 'TOTAL SCORE' : `ROUND 0${selectedRoundTab} SCORE`}
                    </span>
                    <span className="text-2xl font-mono font-black text-black">
                      {selectedRoundTab === 'overall'
                        ? `${top2.totalScore} PTS`
                        : selectedRoundTab === 1
                        ? `${top2.round1Score} PTS`
                        : selectedRoundTab === 2
                        ? `${top2.round2Score} PTS`
                        : `${top2.round3Score} PTS`}
                    </span>
                  </div>
                </div>
              )}

              {/* 3rd Place - Bronze / Cyan Card */}
              {top3 && (
                <div
                  onClick={() => { onSelectParticipant(top3); sound.playBeep(650, 0.04); }}
                  className="bg-[#00E5FF] border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0_#000] md:-rotate-1 hover:rotate-0 transition-transform duration-200 cursor-pointer order-3 md:order-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-xl bg-white text-black font-heading font-black text-xs uppercase border-2 border-black flex items-center space-x-1.5 shadow-[2px_2px_0_#000]">
                      <Medal className="w-4 h-4 text-[#FF6B00]" />
                      <span>BRONZE · RANK #03</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-black bg-white px-2 py-0.5 rounded border border-black">
                      {top3.registrationId}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 mb-5">
                    <img
                      src={top3.avatar}
                      alt={top3.name}
                      className="w-14 h-14 rounded-xl border-3 border-black shadow-[3px_3px_0_#000] object-cover bg-white"
                    />
                    <div>
                      <h4 className="font-heading font-black text-black text-base sm:text-lg uppercase leading-tight">
                        {top3.name}
                      </h4>
                      <p className="text-xs font-mono font-bold text-black/80 line-clamp-1">{top3.college}</p>
                    </div>
                  </div>

                  {selectedRoundTab === 'overall' ? (
                    <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border-2 border-black text-center font-mono text-xs">
                      <div>
                        <div className="text-[10px] font-bold text-black/60 uppercase">R1</div>
                        <div className="font-black text-black text-sm">{top3.round1Score}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-black/60 uppercase">R2</div>
                        <div className="font-black text-black text-sm">{top3.round2Score}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-black/60 uppercase">R3</div>
                        <div className="font-black text-black text-sm">{top3.round3Score}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-xl border-2 border-black font-mono text-xs space-y-1">
                      <div className="text-[10px] font-bold text-black/60 uppercase">ROUND DELIVERABLE:</div>
                      <div className="text-xs text-black font-bold line-clamp-2">
                        {getSubmissionForRound(top3.id, top3.registrationId, selectedRoundTab)?.assignedThemeOrChit || 'Verified challenge deliverable'}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between">
                    <span className="text-xs font-heading font-black text-black uppercase">
                      {selectedRoundTab === 'overall' ? 'TOTAL SCORE' : `ROUND 0${selectedRoundTab} SCORE`}
                    </span>
                    <span className="text-2xl font-mono font-black text-black">
                      {selectedRoundTab === 'overall'
                        ? `${top3.totalScore} PTS`
                        : selectedRoundTab === 1
                        ? `${top3.round1Score} PTS`
                        : selectedRoundTab === 2
                        ? `${top3.round2Score} PTS`
                        : `${top3.round3Score} PTS`}
                    </span>
                  </div>
                </div>
              )}

            </div>
          )}

          {sorted.length === 0 && (
            <div className="bg-white border-4 border-black p-8 sm:p-12 text-center rounded-2xl shadow-[8px_8px_0_#000] font-mono">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3 stroke-2" />
              <h3 className="font-black text-lg sm:text-xl uppercase text-black mb-1">
                NO REGISTERED PARTICIPANTS YET
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 font-bold max-w-md mx-auto">
                Official standings will update on the leaderboard as soon as contestants register and submit solutions!
              </p>
            </div>
          )}

          {/* Controls Bar: Search & College Filter in Brutalist Card */}
          <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0_#000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="w-4 h-4 text-black absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SEARCH CONTESTANT, REG ID, OR COLLEGE..."
                className="w-full bg-[#F4F4F0] border-3 border-black rounded-xl pl-10 pr-3 py-2 text-xs text-black font-mono font-bold uppercase placeholder:text-black/50 focus:outline-none focus:bg-[#FFD600]/20 shadow-[2px_2px_0_#000]"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <select
                value={filterCollege}
                onChange={(e) => setFilterCollege(e.target.value)}
                className="bg-[#F4F4F0] border-3 border-black rounded-xl px-3 py-2 text-xs text-black font-mono font-bold uppercase focus:outline-none shadow-[2px_2px_0_#000]"
              >
                <option value="all">ALL INSTITUTIONS & COLLEGES</option>
                {uniqueColleges.map((col, idx) => (
                  <option key={idx} value={col}>{col.toUpperCase()}</option>
                ))}
              </select>

              {selectedRoundTab === 'overall' && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#FFD600] border-3 border-black rounded-xl px-3 py-2 text-xs text-black font-mono font-black uppercase focus:outline-none shadow-[2px_2px_0_#000]"
                >
                  <option value="total">SORT: TOTAL SCORE</option>
                  <option value="r1">SORT: ROUND 1 (PICTURE)</option>
                  <option value="r2">SORT: ROUND 2 (SCENARIO)</option>
                  <option value="r3">SORT: ROUND 3 (PRODUCT)</option>
                  <option value="bonus">SORT: ML BONUS</option>
                </select>
              )}
            </div>
          </div>

          {/* MOBILE VIEW: Neo-Brutalist Contestant Cards */}
          <div className="space-y-3.5 md:hidden">
            {sorted.map((p, idx) => {
              const sub =
                selectedRoundTab !== 'overall'
                  ? getSubmissionForRound(p.id, p.registrationId, selectedRoundTab)
                  : null;
              const isCutoffLine = 
                (selectedRoundTab === 1 && idx === 30) ||
                (selectedRoundTab === 2 && idx === 10);

              return (
                <React.Fragment key={p.id}>
                  {isCutoffLine && (
                    <div className="bg-black text-[#FFD600] border-3 border-black p-3 rounded-xl text-center font-mono font-black text-xs uppercase shadow-[3px_3px_0_#000]">
                      {selectedRoundTab === 1 
                        ? '⚡ ─── TOP 30 CUTOFF: CADETS ABOVE ADVANCE TO ROUND 02 ─── ⚡'
                        : '⚡ ─── TOP 10 CUTOFF: CADETS ABOVE ADVANCE TO ROUND 03 FINALE ─── ⚡'}
                    </div>
                  )}
                  <div
                    onClick={() => {
                      onSelectParticipant(p);
                      sound.playBeep(700, 0.03);
                    }}
                    className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] transition-all cursor-pointer active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getRankBadge(idx + 1)}
                        <span className="text-xs font-mono font-bold text-black/70">{p.registrationId}</span>
                        {selectedRoundTab === 1 && (
                          idx < 30 ? (
                            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-[#00C853] text-black border border-black uppercase">
                              TOP 30 · R2
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-black/60 border border-black uppercase">
                              R1 ONLY
                            </span>
                          )
                        )}
                        {selectedRoundTab === 2 && (
                          idx < 10 ? (
                            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-[#FFD600] text-black border border-black uppercase">
                              TOP 10 · FINALS
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-200 text-black/60 border border-black uppercase">
                              CUTOFF
                            </span>
                          )
                        )}
                      </div>
                      <div className="text-right">
                      <span className="text-xl font-mono font-black text-black">
                        {selectedRoundTab === 'overall'
                          ? p.totalScore
                          : selectedRoundTab === 1
                          ? p.round1Score
                          : selectedRoundTab === 2
                          ? p.round2Score
                          : p.round3Score}
                      </span>
                      <span className="text-xs font-mono font-black text-black/60 ml-1 uppercase">PTS</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mb-3">
                    <img
                      src={p.avatar}
                      alt={p.name}
                      className="w-12 h-12 rounded-xl border-2 border-black object-cover shrink-0 shadow-[2px_2px_0_#000]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-heading font-black text-black text-base uppercase truncate">{p.name}</div>
                      <div className="text-xs font-mono font-bold text-black/60 truncate">{p.college}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black shrink-0" />
                  </div>

                  {/* Overall tab pills */}
                  {selectedRoundTab === 'overall' ? (
                    <div className="grid grid-cols-4 gap-1.5 pt-2.5 border-t-2 border-black text-center font-mono text-xs">
                      <div className="bg-[#F4F4F0] py-1 rounded-lg border border-black">
                        <div className="text-[9px] font-bold text-black/60 uppercase">R1</div>
                        <div className="font-black text-black">{p.round1Score > 0 ? p.round1Score : '—'}</div>
                      </div>
                      <div className="bg-[#F4F4F0] py-1 rounded-lg border border-black">
                        <div className="text-[9px] font-bold text-black/60 uppercase">R2</div>
                        <div className="font-black text-black">{p.round2Score > 0 ? p.round2Score : '—'}</div>
                      </div>
                      <div className="bg-[#F4F4F0] py-1 rounded-lg border border-black">
                        <div className="text-[9px] font-bold text-black/60 uppercase">R3</div>
                        <div className="font-black text-black">{p.round3Score > 0 ? p.round3Score : '—'}</div>
                      </div>
                      <div className="bg-[#00C853] py-1 rounded-lg border border-black text-black font-black">
                        <div className="text-[9px] uppercase">BONUS</div>
                        <div>+{p.authenticityBonusTotal}</div>
                      </div>
                    </div>
                  ) : (
                    /* Round-specific excerpt */
                    <div className="pt-2 border-t-2 border-black font-mono text-xs text-black/80 flex items-center justify-between">
                      <span className="truncate max-w-[200px]">
                        {sub?.assignedThemeOrChit || 'Challenge entry'}
                      </span>
                      {sub?.screenshotUrl && (
                        <span className="text-[10px] bg-[#FFD600] px-1.5 py-0.5 rounded border border-black font-bold uppercase">
                          📷 Image Verified
                        </span>
                      )}
                      {sub?.demoUrl && (
                        <span className="text-[10px] bg-[#00E5FF] px-1.5 py-0.5 rounded border border-black font-bold uppercase">
                          🚀 Demo Active
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

          {/* DESKTOP VIEW: Neo-Brutalist Standings Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0_#000]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-3 border-black bg-black text-white font-mono uppercase text-xs">
                  <th className="py-4 px-4 font-black">RANK</th>
                  <th className="py-4 px-4 font-black">CONTESTANT</th>
                  <th className="py-4 px-4 font-black">INSTITUTION</th>
                  
                  {selectedRoundTab === 'overall' ? (
                    <>
                      <th className="py-4 px-3 text-center font-black">R1 (100 PTS)</th>
                      <th className="py-4 px-3 text-center font-black">R2 (100 PTS)</th>
                      <th className="py-4 px-3 text-center font-black">R3 (100 PTS)</th>
                      <th className="py-4 px-3 text-center font-black text-[#00E5FF]">ML BONUS</th>
                      <th className="py-4 px-4 text-right font-black text-[#FFD600]">GRAND TOTAL</th>
                    </>
                  ) : selectedRoundTab === 1 ? (
                    <>
                      <th className="py-4 px-4 font-black">THEME CHIT / TOPIC</th>
                      <th className="py-4 px-3 font-black">AI IMAGE TOOL</th>
                      <th className="py-4 px-3 text-center font-black">SCREENSHOT</th>
                      <th className="py-4 px-4 text-right font-black text-[#FFD600]">ROUND 1 SCORE</th>
                    </>
                  ) : selectedRoundTab === 2 ? (
                    <>
                      <th className="py-4 px-4 font-black">SCENARIO SITUATION</th>
                      <th className="py-4 px-3 font-black">PERMITTED LLM</th>
                      <th className="py-4 px-3 text-center font-black">ML VERDICT</th>
                      <th className="py-4 px-4 text-right font-black text-[#FFD600]">ROUND 2 SCORE</th>
                    </>
                  ) : (
                    <>
                      <th className="py-4 px-4 font-black">PROTOTYPE PRODUCT</th>
                      <th className="py-4 px-3 font-black">DEV STACK</th>
                      <th className="py-4 px-3 text-center font-black">LINKS</th>
                      <th className="py-4 px-4 text-right font-black text-[#FFD600]">ROUND 3 SCORE</th>
                    </>
                  )}

                  <th className="py-4 px-3 text-center font-black">INSPECT</th>
                </tr>
              </thead>

              <tbody className="divide-y-2 divide-black font-mono">
                {sorted.map((p, idx) => {
                  const sub =
                    selectedRoundTab !== 'overall'
                      ? getSubmissionForRound(p.id, p.registrationId, selectedRoundTab)
                      : null;
                  const isCutoffLine = 
                    (selectedRoundTab === 1 && idx === 30) ||
                    (selectedRoundTab === 2 && idx === 10);

                  return (
                    <React.Fragment key={p.id}>
                      {isCutoffLine && (
                        <tr key={`cutoff-tr-${idx}`} className="bg-black text-[#FFD600] border-y-4 border-black">
                          <td colSpan={6} className="py-2.5 px-4 text-center font-mono font-black text-xs uppercase tracking-widest text-[#FFD600]">
                            {selectedRoundTab === 1 
                              ? '⚡ ─── TOP 30 ADVANCEMENT CUTOFF: CONTESTANTS ABOVE ADVANCE TO ROUND 02 ─── ⚡'
                              : '⚡ ─── TOP 10 FINALS CUTOFF: CONTESTANTS ABOVE ADVANCE TO ROUND 03 FINALE ─── ⚡'}
                          </td>
                        </tr>
                      )}
                      <tr
                        onClick={() => {
                          onSelectParticipant(p);
                          sound.playBeep(700, 0.03);
                        }}
                        className="hover:bg-[#FFD600]/20 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-black text-sm">
                          {getRankBadge(idx + 1)}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg border-2 border-black object-cover shrink-0 shadow-[2px_2px_0_#000]"
                            />
                            <div>
                              <div className="font-heading font-black text-black text-sm uppercase group-hover:text-black flex items-center space-x-1.5">
                                <span>{p.name}</span>
                                {selectedRoundTab === 1 && (
                                  idx < 30 ? (
                                    <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-[#00C853] text-black border border-black uppercase">
                                      TOP 30 · R2
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-neutral-200 text-black/60 border border-black uppercase">
                                      R1 ONLY
                                    </span>
                                  )
                                )}
                                {selectedRoundTab === 2 && (
                                  idx < 10 ? (
                                    <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-[#FFD600] text-black border border-black uppercase">
                                      TOP 10 · FINALS
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-neutral-200 text-black/60 border border-black uppercase">
                                      CUTOFF
                                    </span>
                                  )
                                )}
                              </div>
                              <div className="text-[10px] font-mono font-bold text-black/60">
                                {p.registrationId}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-black/80">
                          {p.college}
                        </td>

                      {/* Overall Tab columns */}
                      {selectedRoundTab === 'overall' ? (
                        <>
                          <td className="py-3.5 px-3 text-center font-black text-black text-sm">
                            {p.round1Score > 0 ? p.round1Score : <span className="text-black/30">—</span>}
                          </td>
                          <td className="py-3.5 px-3 text-center font-black text-black text-sm">
                            {p.round2Score > 0 ? p.round2Score : <span className="text-black/30">—</span>}
                          </td>
                          <td className="py-3.5 px-3 text-center font-black text-black text-sm">
                            {p.round3Score > 0 ? p.round3Score : <span className="text-black/30">—</span>}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-[#00C853] text-black font-black border border-black text-xs">
                              +{p.authenticityBonusTotal}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-lg text-black">
                            {p.totalScore}
                          </td>
                        </>
                      ) : selectedRoundTab === 1 ? (
                        /* Round 1 Columns */
                        <>
                          <td className="py-3.5 px-4 max-w-xs truncate font-bold text-black" title={sub?.assignedThemeOrChit}>
                            {sub?.assignedThemeOrChit || 'Theme assigned'}
                          </td>
                          <td className="py-3.5 px-3 font-black text-black uppercase">
                            {sub?.aiToolUsed || 'Midjourney'}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {sub?.screenshotUrl ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#FFD600] text-black border border-black font-bold">
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>VERIFIED</span>
                              </span>
                            ) : (
                              <span className="text-black/40">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-lg text-black">
                            {p.round1Score} PTS
                          </td>
                        </>
                      ) : selectedRoundTab === 2 ? (
                        /* Round 2 Columns */
                        <>
                          <td className="py-3.5 px-4 max-w-xs truncate font-bold text-black" title={sub?.assignedThemeOrChit}>
                            {sub?.assignedThemeOrChit || '15-word scenario chit'}
                          </td>
                          <td className="py-3.5 px-3 font-black text-black uppercase">
                            {sub?.aiToolUsed || 'Claude / GPT-4o'}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-[#00C853] text-black font-black border border-black text-xs">
                              {sub?.authenticity.authenticityScore ?? 85}% HUMAN
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-lg text-black">
                            {p.round2Score} PTS
                          </td>
                        </>
                      ) : (
                        /* Round 3 Columns */
                        <>
                          <td className="py-3.5 px-4 max-w-xs truncate font-bold text-black" title={sub?.assignedThemeOrChit}>
                            {sub?.assignedThemeOrChit || 'Prompt-to-Product prototype'}
                          </td>
                          <td className="py-3.5 px-3 font-black text-black uppercase">
                            {sub?.aiToolUsed || 'Cursor / v0'}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              {sub?.demoUrl && (
                                <a
                                  href={sub.demoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 bg-[#00E5FF] rounded border border-black hover:scale-110 transition-transform"
                                  title="Open Prototype"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-black" />
                                </a>
                              )}
                              {sub?.repoUrl && (
                                <a
                                  href={sub.repoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1 bg-neutral-200 rounded border border-black hover:scale-110 transition-transform"
                                  title="Open Repo"
                                >
                                  <Code2 className="w-3.5 h-3.5 text-black" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-lg text-black">
                            {p.round3Score} PTS
                          </td>
                        </>
                      )}

                      <td className="py-3.5 px-3 text-center">
                        <button
                          className="p-1.5 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0_#000] group-hover:bg-[#FFD600] transition-colors"
                          title="Inspect Submissions & Prompt Engineering"
                        >
                          <ChevronRight className="w-4 h-4 text-black" />
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
};
