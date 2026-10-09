import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Code2,
  Image as ImageIcon,
  Search,
  Filter,
  Download,
  RotateCcw,
  Sparkles,
  Sliders,
  Send,
  UserX,
  Play,
  Pause,
  X,
  Terminal,
  Crown,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Submission, EventState, RoundNumber, Participant } from '../types';
import { api } from '../services/api';
import { sound } from '../utils/audio';

interface AdminDashboardProps {
  submissions: Submission[];
  participants: Participant[];
  eventState: EventState;
  onUpdateEventState: (updates: Partial<EventState>) => void;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  submissions,
  participants,
  eventState,
  onUpdateEventState,
  onRefreshData
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [roundFilter, setRoundFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated' | 'flagged_ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Grading form state
  const [promptQuality, setPromptQuality] = useState(20);
  const [outputRelevance, setOutputRelevance] = useState(20);
  const [creativity, setCreativity] = useState(20);
  const [technicalExecution, setTechnicalExecution] = useState(20);
  const [judgeFeedback, setJudgeFeedback] = useState('');
  const [judgeName, setJudgeName] = useState('Dr. S. K. Sen (Lead Evaluator)');
  const [isGrading, setIsGrading] = useState(false);
  const [isAutoGradingRound1, setIsAutoGradingRound1] = useState(false);
  const [isAiGradingSingle, setIsAiGradingSingle] = useState(false);

  // Batch Gemini AI Autograding for Round 1
  const handleAutoGradeRound1 = async () => {
    if (!window.confirm('Run Gemini AI Multimodal evaluation for all Round 1 submissions and calculate official leaderboard scores?')) return;
    setIsAutoGradingRound1(true);
    sound.playBeep(600, 0.05);

    try {
      const res = await api.autoGradeRound1();
      sound.playSuccessChime();
      alert(res.message || `Successfully evaluated ${res.gradedCount} Round 1 submissions with Gemini AI!`);
      onRefreshData();
    } catch (err: any) {
      sound.playWarningPing();
      alert(err?.message || 'Failed to autograde Round 1 submissions.');
    } finally {
      setIsAutoGradingRound1(false);
    }
  };

  // Single Gemini AI Multimodal Evaluation
  const handleSingleAiGrade = async () => {
    if (!selectedSubmission) return;
    setIsAiGradingSingle(true);
    sound.playBeep(650, 0.05);

    try {
      const res = await api.aiGradeSubmission(selectedSubmission.id);
      if (res.scores) {
        setPromptQuality(res.scores.promptQuality);
        setOutputRelevance(res.scores.outputRelevance);
        setCreativity(res.scores.creativity);
        setTechnicalExecution(res.scores.technicalExecution);
        setJudgeFeedback(res.scores.feedback || '');
        setJudgeName('Gemini 2.5 Flash AI Evaluator');
        sound.playSuccessChime();
        alert(`Gemini AI evaluated entry! Total Score: ${res.scores.totalScore} / 100.`);
        onRefreshData();
      }
    } catch (err: any) {
      sound.playWarningPing();
      alert(err?.message || 'Gemini AI evaluation failed.');
    } finally {
      setIsAiGradingSingle(false);
    }
  };

  // Announcement state
  const [announcementText, setAnnouncementText] = useState('');

  // DB connection status
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; provider: string; supabaseUrl: string | null }>({
    connected: false,
    provider: 'in-memory',
    supabaseUrl: null
  });

  React.useEffect(() => {
    api.getDbStatus().then(setDbStatus);
  }, []);

  // Filter submissions
  const filtered = submissions.filter((s) => {
    const matchesRound = roundFilter === 'all' || s.roundId === roundFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch =
      s.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.registrationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.promptText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRound && matchesStatus && matchesSearch;
  });

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const flaggedCount = submissions.filter((s) => s.status === 'flagged_ai' || s.authenticity.isAiGenerated).length;
  const evaluatedCount = submissions.filter((s) => s.status === 'evaluated').length;

  // Open evaluation modal
  const openEvaluation = (sub: Submission) => {
    setSelectedSubmission(sub);
    sound.playBeep(700, 0.04);
    if (sub.scores) {
      setPromptQuality(sub.scores.promptQuality);
      setOutputRelevance(sub.scores.outputRelevance);
      setCreativity(sub.scores.creativity);
      setTechnicalExecution(sub.scores.technicalExecution);
      setJudgeFeedback(sub.scores.feedback || '');
      setJudgeName(sub.scores.gradedBy || 'Dr. S. K. Sen');
    } else {
      const authRatio = sub.authenticity.authenticityScore / 100;
      setPromptQuality(Math.round(18 + authRatio * 6));
      setOutputRelevance(22);
      setCreativity(Math.round(17 + authRatio * 7));
      setTechnicalExecution(20);
      setJudgeFeedback(
        sub.authenticity.isAiGenerated
          ? 'Note: High concentration of boilerplate tags detected by NLP model. Advised to focus on organic problem-solving.'
          : 'High originality and thoughtful prompt architecture.'
      );
    }
  };

  // Submit Grade
  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;
    setIsGrading(true);
    sound.playBeep(600, 0.05);

    try {
      await api.gradeSubmission(selectedSubmission.id, {
        promptQuality,
        outputRelevance,
        creativity,
        technicalExecution,
        feedback: judgeFeedback,
        gradedBy: judgeName
      });

      sound.playSuccessChime();
      setSelectedSubmission(null);
      onRefreshData();
    } catch {
      sound.playWarningPing();
      alert('Failed to update submission grade.');
    } finally {
      setIsGrading(false);
    }
  };

  // Broadcast announcement
  const handleBroadcastAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    const newAnn = {
      id: `ann-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: announcementText.trim(),
      type: 'urgent' as const
    };

    onUpdateEventState({
      announcements: [newAnn, ...eventState.announcements]
    });

    setAnnouncementText('');
    sound.playSuccessChime();
  };

  // Export submissions to CSV
  const exportToCSV = () => {
    sound.playBeep(750, 0.05);
    const headers = [
      'Submission ID',
      'Round',
      'Participant',
      'Reg ID',
      'College',
      'Tool Used',
      'ML Authenticity Score',
      'ML Verdict',
      'Prompt Quality (25)',
      'Relevance (25)',
      'Creativity (25)',
      'Execution (25)',
      'Total Score',
      'Status',
      'Submitted At'
    ];

    const rows = submissions.map((s) => [
      s.id,
      `Round ${s.roundId}`,
      s.participantName,
      s.registrationId,
      s.college,
      s.aiToolUsed,
      `${s.authenticity.authenticityScore}%`,
      s.authenticity.verdict,
      s.scores?.promptQuality ?? 'N/A',
      s.scores?.outputRelevance ?? 'N/A',
      s.scores?.creativity ?? 'N/A',
      s.scores?.technicalExecution ?? 'N/A',
      s.scores?.totalScore ?? 'N/A',
      s.status,
      new Date(s.submittedAt).toLocaleTimeString()
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `prompt_wars_submissions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentTotalGrade =
    selectedSubmission
      ? promptQuality +
        outputRelevance +
        creativity +
        technicalExecution +
        Math.min(10, Math.round(selectedSubmission.authenticity.authenticityScore * 0.1))
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Top Banner Card - Loot Drop Neo-Brutalist Style */}
      <div className="bg-white border-4 border-black p-5 sm:p-6 rounded-2xl shadow-[6px_6px_0_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FF4081] text-white font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>REFEREE & JUDGE CONSOLE</span>
            </span>
            {dbStatus.connected ? (
              <span className="px-2.5 py-0.5 rounded-full bg-[#00C853] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-black animate-ping mr-1"></span>
                <span>SUPABASE CLOUD ACTIVE</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFD600] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000]">
                RAM IN-MEMORY MODE
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-black text-black uppercase tracking-tight">
            TOURNAMENT AUDIT & RUBRIC PANEL
          </h2>
          <p className="text-xs sm:text-sm font-mono text-black/80 mt-1 max-w-2xl leading-relaxed">
            Audit contestant prompts, verify mobile screenshots, test digital prototypes, and assign official rubric scores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleAutoGradeRound1}
            disabled={isAutoGradingRound1}
            className="neo-btn bg-[#FFD600] hover:bg-[#00C853] text-black px-4 py-2 text-xs flex items-center space-x-2 cursor-pointer shadow-[3px_3px_0_#000]"
          >
            <Sparkles className={`w-4 h-4 text-black ${isAutoGradingRound1 ? 'animate-spin' : ''}`} />
            <span>{isAutoGradingRound1 ? 'GEMINI AI EVALUATING...' : 'AUTOGRADE R1 WITH GEMINI AI'}</span>
          </button>

          <button
            onClick={exportToCSV}
            className="neo-btn bg-white hover:bg-[#FFD600] text-black px-3.5 py-2 text-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>EXPORT CSV</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Reset tournament data to fresh demo state?')) {
                api.resetData().then(() => onRefreshData());
              }
            }}
            className="neo-btn bg-[#FF4081] hover:bg-black text-white px-3.5 py-2 text-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET DEMO</span>
          </button>
        </div>
      </div>

      {/* Round Start & Stop Control Center */}
      <div className="bg-white border-4 border-black p-5 sm:p-6 rounded-2xl shadow-[6px_6px_0_#000] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFD600] text-black font-black font-mono text-xs uppercase border-2 border-black shadow-[2px_2px_0_#000] flex items-center space-x-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>JUDGE CONTROL CENTER</span>
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-black text-black uppercase tracking-tight mt-1">
              ROUND START & STOP CONTROLS
            </h3>
            <p className="text-xs font-mono text-black/70">
              Start and stop each round. Participants are not allowed to submit to stopped rounds or skip previous unfinished rounds.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {([1, 2, 3] as RoundNumber[]).map((r) => {
            const statuses = eventState.roundStatuses || { round1: true, round2: false, round3: false };
            const isStarted = statuses[`round${r}` as keyof typeof statuses] ?? false;
            const isCurrentActive = eventState.activeRound === r;

            return (
              <div
                key={r}
                className={`p-4 rounded-xl border-3 border-black shadow-[4px_4px_0_#000] space-y-3 transition-all ${
                  isCurrentActive ? 'bg-[#FFD600]/25' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-md bg-black text-white text-xs font-mono font-black uppercase">
                    ROUND 0{r}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-black border border-black uppercase ${
                    isStarted ? 'bg-[#00C853] text-black' : 'bg-[#FF4081] text-white'
                  }`}>
                    {isStarted ? '🟢 STARTED / ACTIVE' : '🔴 STOPPED / LOCKED'}
                  </span>
                </div>

                <div>
                  <div className="font-heading font-black text-black text-sm uppercase">
                    {r === 1 ? 'Prompt to Picture' : r === 2 ? 'Scenario Sprint' : 'Prompt to Product'}
                  </div>
                  <div className="text-[11px] font-mono text-black/60 font-bold mt-0.5">
                    {r === 1 ? 'Round 01 Image Generation' : r === 2 ? 'Round 02 15-Word Chit' : 'Round 03 Finale App Build'}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t-2 border-black">
                  <button
                    onClick={() => {
                      const nextStatuses = { ...statuses, [`round${r}`]: true };
                      onUpdateEventState({
                        activeRound: r,
                        roundStatuses: nextStatuses,
                        isRoundActive: true
                      });
                      sound.playSuccessChime();
                    }}
                    className={`flex-1 neo-btn py-1.5 text-xs font-mono font-black uppercase cursor-pointer ${
                      isStarted
                        ? 'bg-[#00C853] text-black hover:bg-[#00C853]/80'
                        : 'bg-white text-black hover:bg-[#00C853]'
                    }`}
                  >
                    ▶ START
                  </button>
                  <button
                    onClick={() => {
                      const nextStatuses = { ...statuses, [`round${r}`]: false };
                      onUpdateEventState({
                        roundStatuses: nextStatuses,
                        isRoundActive: eventState.activeRound === r ? false : (nextStatuses[`round${eventState.activeRound}` as keyof typeof nextStatuses] ?? false)
                      });
                      sound.playWarningPing();
                    }}
                    className={`flex-1 neo-btn py-1.5 text-xs font-mono font-black uppercase cursor-pointer ${
                      !isStarted
                        ? 'bg-[#FF4081] text-white hover:bg-[#FF4081]/80'
                        : 'bg-white text-black hover:bg-[#FF4081] hover:text-white'
                    }`}
                  >
                    ⏸ STOP
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Embargo & Results Release Control Panel */}
      <div className={`p-5 sm:p-6 rounded-2xl border-4 border-black shadow-[6px_6px_0_#000] space-y-4 ${
        eventState.isLeaderboardPublished ? 'bg-[#00C853]/15' : 'bg-[#FFD600]/30'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black uppercase border-2 border-black shadow-[2px_2px_0_#000] ${
                eventState.isLeaderboardPublished ? 'bg-[#00C853] text-black' : 'bg-[#FF4081] text-white'
              }`}>
                {eventState.isLeaderboardPublished ? '📢 LEADERBOARD RELEASED TO PUBLIC' : '🔒 LEADERBOARD EMBARGO ACTIVE'}
              </span>
              <span className="text-xs font-mono font-bold text-black/70">
                Gatekeeper Controls
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-black text-black uppercase tracking-tight">
              CONTESTANT RESULTS VISIBILITY
            </h3>
            <p className="text-xs font-mono text-black/80 max-w-xl">
              Control when contestants can view standings and release individual round scores after referee evaluations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const next = !eventState.isLeaderboardPublished;
                onUpdateEventState({ isLeaderboardPublished: next });
                if (next) sound.playSuccessChime();
                else sound.playWarningPing();
              }}
              className={`neo-btn px-5 py-2.5 text-xs uppercase font-black cursor-pointer ${
                eventState.isLeaderboardPublished
                  ? 'bg-[#FF4081] text-white hover:bg-black'
                  : 'bg-[#00C853] text-black hover:bg-[#FFD600]'
              }`}
            >
              {eventState.isLeaderboardPublished ? '🔒 EMBARGO / HIDE LEADERBOARD' : '📢 ALLOW & PUBLISH LEADERBOARD'}
            </button>
          </div>
        </div>

        {/* Per-Round Standings Toggles */}
        <div className="pt-3 border-t-2 border-black grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border-2 border-black flex items-center justify-between shadow-[2px_2px_0_#000]">
            <div>
              <div className="text-[10px] font-mono font-black text-black/60 uppercase">ROUND 01 PICTURE</div>
              <div className="text-xs font-mono font-black text-black">
                {eventState.publishedRounds?.round1 ? 'STANDINGS RELEASED ✅' : 'SCORES EMBARGOED 🔒'}
              </div>
            </div>
            <button
              onClick={() => {
                const curr = eventState.publishedRounds?.round1 ?? false;
                onUpdateEventState({
                  publishedRounds: { ...eventState.publishedRounds, round1: !curr }
                });
                sound.playBeep(700, 0.04);
              }}
              className={`px-3 py-1 text-xs font-mono font-black uppercase rounded-lg border-2 border-black cursor-pointer shadow-[2px_2px_0_#000] ${
                eventState.publishedRounds?.round1 ? 'bg-[#00C853] text-black' : 'bg-[#FFD600] text-black'
              }`}
            >
              {eventState.publishedRounds?.round1 ? 'ALLOW ✅' : 'LOCK 🔒'}
            </button>
          </div>

          <div className="bg-white p-3.5 rounded-xl border-2 border-black flex items-center justify-between shadow-[2px_2px_0_#000]">
            <div>
              <div className="text-[10px] font-mono font-black text-black/60 uppercase">ROUND 02 SCENARIO</div>
              <div className="text-xs font-mono font-black text-black">
                {eventState.publishedRounds?.round2 ? 'STANDINGS RELEASED ✅' : 'SCORES EMBARGOED 🔒'}
              </div>
            </div>
            <button
              onClick={() => {
                const curr = eventState.publishedRounds?.round2 ?? false;
                onUpdateEventState({
                  publishedRounds: { ...eventState.publishedRounds, round2: !curr }
                });
                sound.playBeep(750, 0.04);
              }}
              className={`px-3 py-1 text-xs font-mono font-black uppercase rounded-lg border-2 border-black cursor-pointer shadow-[2px_2px_0_#000] ${
                eventState.publishedRounds?.round2 ? 'bg-[#00C853] text-black' : 'bg-[#FFD600] text-black'
              }`}
            >
              {eventState.publishedRounds?.round2 ? 'ALLOW ✅' : 'LOCK 🔒'}
            </button>
          </div>

          <div className="bg-white p-3.5 rounded-xl border-2 border-black flex items-center justify-between shadow-[2px_2px_0_#000]">
            <div>
              <div className="text-[10px] font-mono font-black text-black/60 uppercase">ROUND 03 FINALE</div>
              <div className="text-xs font-mono font-black text-black">
                {eventState.publishedRounds?.round3 ? 'CHAMPION RELEASED 🏆' : 'SCORES EMBARGOED 🔒'}
              </div>
            </div>
            <button
              onClick={() => {
                const curr = eventState.publishedRounds?.round3 ?? false;
                onUpdateEventState({
                  publishedRounds: { ...eventState.publishedRounds, round3: !curr }
                });
                sound.playBeep(800, 0.04);
              }}
              className={`px-3 py-1 text-xs font-mono font-black uppercase rounded-lg border-2 border-black cursor-pointer shadow-[2px_2px_0_#000] ${
                eventState.publishedRounds?.round3 ? 'bg-[#00C853] text-black' : 'bg-[#FFD600] text-black'
              }`}
            >
              {eventState.publishedRounds?.round3 ? 'ALLOW ✅' : 'LOCK 🔒'}
            </button>
          </div>
        </div>
      </div>

      {/* Top Stat Counters & Arena Controls Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Stat 1: Submissions */}
        <div className="bg-white border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000]">
          <div className="text-xs font-mono font-black text-black/60 uppercase">TOTAL ENTRIES</div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-black mt-1">{submissions.length}</div>
          <div className="text-[11px] font-mono font-bold text-black/60 mt-0.5">ACROSS ALL 3 ROUNDS</div>
        </div>

        {/* Stat 2: Pending Review */}
        <div className="bg-[#FFD600] border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000]">
          <div className="text-xs font-mono font-black text-black uppercase">PENDING REVIEW</div>
          <div className="text-2xl sm:text-3xl font-mono font-black text-black mt-1">{pendingCount}</div>
          <div className="text-[11px] font-mono font-bold text-black/70 mt-0.5">AWAITING EVALUATION</div>
        </div>

        {/* Stat 3: Flagged AI Prompts */}
        <div className="bg-[#FF4081] border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000] text-white">
          <div className="text-xs font-mono font-black uppercase">FLAGGED (AI CLICHÉ)</div>
          <div className="text-2xl sm:text-3xl font-mono font-black mt-1">{flaggedCount}</div>
          <div className="text-[11px] font-mono font-bold mt-0.5 opacity-90">PROMPT STUFFING ALERTS</div>
        </div>

        {/* Round Broadcast Selector */}
        <div className="bg-[#00E5FF] border-3 border-black rounded-2xl p-4 space-y-2 shadow-[4px_4px_0_#000]">
          <div className="flex items-center justify-between text-xs font-mono font-black uppercase text-black">
            <span>ARENA ROUND</span>
            <span className="bg-black text-[#00E5FF] px-2 py-0.5 rounded text-xs font-black">R0{eventState.activeRound}</span>
          </div>
          <div className="flex rounded-xl bg-white p-1 border-2 border-black gap-1">
            {([1, 2, 3] as RoundNumber[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  onUpdateEventState({ activeRound: r });
                  sound.playBeep(700 + r * 50, 0.05);
                }}
                className={`flex-1 py-1 text-xs font-mono font-black uppercase rounded-lg transition-all cursor-pointer ${
                  eventState.activeRound === r
                    ? 'bg-[#FFD600] text-black border-2 border-black shadow-[1px_1px_0_#000]'
                    : 'text-black hover:bg-neutral-100'
                }`}
              >
                R{r}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Broadcast Announcement Bar */}
      <form onSubmit={handleBroadcastAnnouncement} className="flex flex-col sm:flex-row gap-2.5 bg-white p-3.5 rounded-2xl border-4 border-black shadow-[4px_4px_0_#000]">
        <input
          type="text"
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          placeholder="BROADCAST LIVE ANNOUNCEMENT (E.G. '5 MINUTES REMAINING IN ROUND 02!')..."
          className="flex-1 bg-[#F4F4F0] border-2 border-black rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase text-black focus:outline-none focus:bg-[#FFD600]/15"
        />
        <button
          type="submit"
          className="neo-btn bg-[#FFD600] text-black px-5 py-2 text-xs uppercase flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>BROADCAST</span>
        </button>
      </form>

      {/* Filter and Search Bar */}
      <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0_#000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 text-black absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH CADET, PROMPT, OR REG ID..."
            className="w-full bg-[#F4F4F0] border-3 border-black rounded-xl pl-10 pr-3 py-2 text-xs text-black font-mono font-bold uppercase placeholder:text-black/50 focus:outline-none focus:bg-[#FFD600]/20 shadow-[2px_2px_0_#000]"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Round Filter */}
          <select
            value={roundFilter}
            onChange={(e) => setRoundFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as 1 | 2 | 3))}
            className="bg-[#F4F4F0] border-3 border-black rounded-xl px-3 py-2 text-xs text-black font-mono font-bold uppercase focus:outline-none shadow-[2px_2px_0_#000]"
          >
            <option value="all">ALL ROUNDS</option>
            <option value="1">ROUND 01 (PICTURE)</option>
            <option value="2">ROUND 02 (SCENARIO)</option>
            <option value="3">ROUND 03 (PRODUCT)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#F4F4F0] border-3 border-black rounded-xl px-3 py-2 text-xs text-black font-mono font-bold uppercase focus:outline-none shadow-[2px_2px_0_#000]"
          >
            <option value="all">ALL STATUSES</option>
            <option value="pending">PENDING ({pendingCount})</option>
            <option value="flagged_ai">FLAGGED AI ({flaggedCount})</option>
            <option value="evaluated">EVALUATED ({evaluatedCount})</option>
          </select>
        </div>
      </div>

      {/* MOBILE VIEW: Neo-Brutalist Submission Cards */}
      <div className="space-y-3.5 md:hidden">
        {filtered.map((sub) => {
          const isFlagged = sub.status === 'flagged_ai' || sub.authenticity.isAiGenerated;

          return (
            <div
              key={sub.id}
              className={`border-3 border-black rounded-2xl p-4 shadow-[4px_4px_0_#000] space-y-3 ${
                isFlagged ? 'bg-[#FF4081]/15' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-lg bg-black text-white text-xs font-mono font-black uppercase">
                  ROUND 0{sub.roundId}
                </span>
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-mono font-black border border-black ${
                  sub.authenticity.isAiGenerated
                    ? 'bg-[#FF4081] text-white'
                    : 'bg-[#00C853] text-black'
                }`}>
                  {sub.authenticity.isAiGenerated ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{sub.authenticity.authenticityScore}%</span>
                </span>
              </div>

              <div>
                <div className="font-heading font-black text-black text-base uppercase">{sub.participantName}</div>
                <div className="text-xs font-mono font-bold text-black/60">{sub.registrationId} · {sub.college}</div>
              </div>

              <div className="text-xs text-black font-mono bg-[#F4F4F0] border-2 border-black p-2.5 rounded-xl line-clamp-2">
                {sub.promptText}
              </div>

              <div className="flex items-center justify-between pt-2 border-t-2 border-black">
                <div className="text-xs font-mono">
                  {sub.scores ? (
                    <span className="font-black text-black bg-[#FFD600] px-2 py-0.5 rounded border border-black">{sub.scores.totalScore} PTS</span>
                  ) : (
                    <span className="text-black/50 font-bold">UNRATED</span>
                  )}
                </div>

                <button
                  onClick={() => openEvaluation(sub)}
                  className="neo-btn bg-[#FFD600] text-black px-3 py-1.5 text-xs uppercase cursor-pointer"
                >
                  {sub.scores ? 'RE-GRADE' : 'GRADE SUBMISSION'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP VIEW: Review Queue Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[8px_8px_0_#000]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-3 border-black bg-black text-white font-mono uppercase text-xs">
              <th className="py-4 px-4 font-black">ROUND</th>
              <th className="py-4 px-4 font-black">CONTESTANT</th>
              <th className="py-4 px-4 font-black">PROMPT EXCERPT</th>
              <th className="py-4 px-3 font-black">TOOL</th>
              <th className="py-4 px-3 text-center font-black">ML AUTH</th>
              <th className="py-4 px-3 text-center font-black">DELIVERABLES</th>
              <th className="py-4 px-3 text-center font-black">SCORE</th>
              <th className="py-4 px-4 text-right font-black">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black font-mono">
            {filtered.map((sub) => {
              const isFlagged = sub.status === 'flagged_ai' || sub.authenticity.isAiGenerated;

              return (
                <tr
                  key={sub.id}
                  className={`hover:bg-[#FFD600]/20 transition-colors ${
                    isFlagged ? 'bg-[#FF4081]/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-black">
                    <span className="px-2.5 py-1 rounded bg-black text-white text-xs font-mono font-black">
                      R0{sub.roundId}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-heading font-black text-black uppercase text-sm">{sub.participantName}</div>
                    <div className="text-[10px] text-black/60 font-mono font-bold">{sub.registrationId} · {sub.college}</div>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="text-black/80 truncate font-mono text-xs" title={sub.promptText}>
                      {sub.promptText}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 font-bold text-black uppercase">
                    {sub.aiToolUsed}
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-black border border-black ${
                        sub.authenticity.isAiGenerated
                          ? 'bg-[#FF4081] text-white'
                          : 'bg-[#00C853] text-black'
                      }`}
                    >
                      {sub.authenticity.isAiGenerated ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>{sub.authenticity.authenticityScore}%</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    <div className="flex items-center justify-center space-x-2 text-black">
                      {sub.screenshotUrl && (
                        <span title="Mobile Screenshot Uploaded" className="bg-[#FFD600] p-1 rounded border border-black">
                          <ImageIcon className="w-4 h-4 text-black" />
                        </span>
                      )}
                      {sub.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Prototype URL"
                          className="bg-[#00E5FF] p-1 rounded border border-black hover:scale-110 transition-transform"
                        >
                          <ExternalLink className="w-4 h-4 text-black" />
                        </a>
                      )}
                      {sub.repoUrl && (
                        <a
                          href={sub.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Code Repo"
                          className="bg-neutral-200 p-1 rounded border border-black hover:scale-110 transition-transform"
                        >
                          <Code2 className="w-4 h-4 text-black" />
                        </a>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {sub.scores ? (
                      <span className="font-mono font-black text-black text-sm bg-[#FFD600] px-2 py-0.5 rounded border border-black">
                        {sub.scores.totalScore}
                      </span>
                    ) : (
                      <span className="text-black/40 font-bold">UNRATED</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => openEvaluation(sub)}
                      className="neo-btn bg-[#FFD600] text-black px-3 py-1 text-xs uppercase cursor-pointer"
                    >
                      {sub.scores ? 'RE-GRADE' : 'GRADE'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Side-by-Side Comprehensive Evaluation Modal - Loot Drop Brutalist Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#F4F4F0] border-4 border-black rounded-2xl p-5 sm:p-6 shadow-[10px_10px_0_#000] space-y-5 my-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="bg-[#FFD600] border-3 border-black p-4 rounded-xl shadow-[3px_3px_0_#000] flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono font-black text-black uppercase">
                  <span>EVALUATING ROUND 0{selectedSubmission.roundId} SUBMISSION</span>
                  <span>·</span>
                  <span>ID: {selectedSubmission.id}</span>
                </div>
                <h3 className="font-heading font-black text-black text-lg sm:text-xl uppercase mt-0.5">
                  {selectedSubmission.participantName} ({selectedSubmission.registrationId})
                </h3>
                <p className="text-xs font-mono font-bold text-black/70">{selectedSubmission.college}</p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="bg-white border-2 border-black p-1.5 rounded-lg shadow-[2px_2px_0_#000] hover:bg-[#FF4081] hover:text-white transition-colors cursor-pointer text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen: Submission Artifacts vs Grading Rubric */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Left Column: Contestant Deliverables */}
              <div className="space-y-4">
                
                {/* Assigned Topic */}
                <div className="p-3.5 bg-white rounded-xl border-3 border-black shadow-[3px_3px_0_#000]">
                  <div className="text-[10px] font-mono text-black/60 uppercase font-black">ASSIGNED CHALLENGE / CHIT:</div>
                  <div className="text-xs text-black font-mono font-bold mt-0.5">{selectedSubmission.assignedThemeOrChit}</div>
                </div>

                {/* Prompt Text Box */}
                <div className="p-3.5 bg-white rounded-xl border-3 border-black space-y-2 shadow-[3px_3px_0_#000]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-black/60 uppercase font-black">CONTESTANT PROMPT:</span>
                    <span className="text-xs font-mono font-black text-black bg-[#FFD600] px-2 py-0.5 rounded border border-black">TOOL: {selectedSubmission.aiToolUsed}</span>
                  </div>
                  <div className="text-xs text-black font-mono leading-relaxed bg-[#F4F4F0] p-3 rounded-lg border-2 border-black max-h-36 overflow-y-auto">
                    {selectedSubmission.promptText}
                  </div>
                </div>

                {/* ML Model Authenticity Forensic Report */}
                <div className={`p-4 rounded-xl border-3 border-black font-mono text-xs space-y-2 shadow-[3px_3px_0_#000] ${
                  selectedSubmission.authenticity.isAiGenerated
                    ? 'bg-[#FF4081]/20 text-black'
                    : 'bg-[#00C853]/20 text-black'
                }`}>
                  <div className="flex items-center justify-between font-black">
                    <span className="flex items-center space-x-1.5 uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-black" />
                      <span>VERDICT: {selectedSubmission.authenticity.verdict}</span>
                    </span>
                    <span className="bg-black text-white px-2 py-0.5 rounded">{selectedSubmission.authenticity.authenticityScore}% HUMAN</span>
                  </div>
                  <p className="font-mono text-xs opacity-90 leading-relaxed">
                    {selectedSubmission.authenticity.reasoning}
                  </p>
                  {selectedSubmission.authenticity.detectedMarkers.length > 0 && (
                    <div className="pt-2 border-t border-black text-[11px]">
                      <span className="font-black uppercase">FLAGGED CLICHÉS: </span>
                      {selectedSubmission.authenticity.detectedMarkers.map((m, idx) => (
                        <span key={idx} className="bg-[#FF4081] text-white px-1.5 py-0.5 rounded mr-1 font-bold">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Media Artifacts: Screenshot or Demo */}
                {selectedSubmission.screenshotUrl && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono text-black uppercase font-black">MOBILE SCREENSHOT DELIVERABLE:</div>
                    <div className="rounded-xl overflow-hidden border-3 border-black bg-white max-h-48 flex items-center justify-center p-2 shadow-[3px_3px_0_#000]">
                      <img
                        src={selectedSubmission.screenshotUrl}
                        alt="Mobile Screenshot"
                        className="max-h-44 object-contain rounded"
                      />
                    </div>
                  </div>
                )}

                {selectedSubmission.demoUrl && (
                  <div className="p-3.5 bg-white rounded-xl border-3 border-black space-y-2 shadow-[3px_3px_0_#000]">
                    <div className="text-[10px] font-mono text-black/60 uppercase font-black">ROUND 3 DIGITAL PROTOTYPE:</div>
                    <div className="flex items-center justify-between">
                      <a
                        href={selectedSubmission.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono font-bold text-black hover:underline flex items-center space-x-1 bg-[#00E5FF] px-2.5 py-1 rounded border border-black shadow-[1px_1px_0_#000]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="truncate max-w-xs">{selectedSubmission.demoUrl}</span>
                      </a>
                      {selectedSubmission.repoUrl && (
                        <a
                          href={selectedSubmission.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono font-bold text-black hover:underline flex items-center space-x-1 bg-white px-2.5 py-1 rounded border border-black shadow-[1px_1px_0_#000]"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>CODE REPO</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Interactive Grading Rubric */}
              <div className="space-y-4 bg-white p-5 rounded-2xl border-3 border-black shadow-[4px_4px_0_#000]">
                <div className="flex items-center justify-between border-b-2 border-black pb-3">
                  <div className="flex items-center space-x-1.5 text-xs font-heading font-black text-black uppercase">
                    <Sliders className="w-4 h-4 text-black" />
                    <span>OFFICIAL 100-PT SCORING RUBRIC</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSingleAiGrade}
                      disabled={isAiGradingSingle}
                      className="neo-btn bg-[#00E5FF] hover:bg-[#FFD600] text-black px-2.5 py-1 text-[11px] font-mono font-black uppercase flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAiGradingSingle ? 'animate-spin' : ''}`} />
                      <span>{isAiGradingSingle ? 'EVALUATING...' : 'GEMINI AI EVALUATE'}</span>
                    </button>
                    <div className="text-sm font-mono font-black text-black bg-[#FFD600] px-2.5 py-1 rounded border-2 border-black shadow-[2px_2px_0_#000]">
                      TOTAL: {currentTotalGrade} / 100
                    </div>
                  </div>
                </div>

                {/* Criteria 1: Prompt Quality */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-black text-black uppercase">
                    <span>1. PROMPT ENGINEERING QUALITY</span>
                    <span className="bg-[#F4F4F0] px-1.5 py-0.5 rounded border border-black">{promptQuality} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={promptQuality}
                    onChange={(e) => setPromptQuality(Number(e.target.value))}
                    className="w-full accent-black cursor-pointer"
                  />
                  <div className="text-[10px] font-mono text-black/60">Clarity, lexical precision, constraint syntax</div>
                </div>

                {/* Criteria 2: Output Relevance */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-black text-black uppercase">
                    <span>2. OUTPUT RELEVANCE TO TOPIC</span>
                    <span className="bg-[#F4F4F0] px-1.5 py-0.5 rounded border border-black">{outputRelevance} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={outputRelevance}
                    onChange={(e) => setOutputRelevance(Number(e.target.value))}
                    className="w-full accent-black cursor-pointer"
                  />
                  <div className="text-[10px] font-mono text-black/60">Faithfulness to assigned challenge constraints</div>
                </div>

                {/* Criteria 3: Creativity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-black text-black uppercase">
                    <span>3. CREATIVITY & ORIGINALITY</span>
                    <span className="bg-[#F4F4F0] px-1.5 py-0.5 rounded border border-black">{creativity} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={creativity}
                    onChange={(e) => setCreativity(Number(e.target.value))}
                    className="w-full accent-black cursor-pointer"
                  />
                  <div className="text-[10px] font-mono text-black/60">Unique angles, non-obvious synthesis</div>
                </div>

                {/* Criteria 4: Technical Execution */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-black text-black uppercase">
                    <span>4. TECHNICAL FEASIBILITY / SPEED</span>
                    <span className="bg-[#F4F4F0] px-1.5 py-0.5 rounded border border-black">{technicalExecution} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={technicalExecution}
                    onChange={(e) => setTechnicalExecution(Number(e.target.value))}
                    className="w-full accent-black cursor-pointer"
                  />
                  <div className="text-[10px] font-mono text-black/60">Speed of submission, prototype execution</div>
                </div>

                {/* Authenticity Bonus Auto-Calc */}
                <div className="p-3 rounded-xl bg-[#00C853]/20 border-2 border-black flex items-center justify-between text-xs font-mono font-black">
                  <span className="uppercase">ML AUTHENTICITY BONUS:</span>
                  <span className="bg-black text-[#00C853] px-2 py-0.5 rounded">
                    +{Math.min(10, Math.round(selectedSubmission.authenticity.authenticityScore * 0.1))} PTS
                  </span>
                </div>

                {/* Judge Feedback */}
                <div className="space-y-1.5 pt-2 border-t-2 border-black">
                  <label className="block text-xs font-mono font-black text-black uppercase">
                    JUDGE PANEL FEEDBACK:
                  </label>
                  <textarea
                    rows={2}
                    value={judgeFeedback}
                    onChange={(e) => setJudgeFeedback(e.target.value)}
                    placeholder="Constructive feedback for contestant..."
                    className="w-full bg-[#F4F4F0] border-2 border-black rounded-xl p-2.5 text-xs text-black font-mono focus:outline-none focus:bg-white"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    onClick={handleSaveGrade}
                    disabled={isGrading}
                    className="w-full neo-btn bg-[#00C853] hover:bg-[#FFD600] text-black py-3 text-xs uppercase font-black cursor-pointer disabled:opacity-50"
                  >
                    {isGrading ? 'PUBLISHING OFFICIAL SCORE...' : 'PUBLISH SCORE & PROMOTE'}
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
