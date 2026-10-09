import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ImageIcon,
  Dice5,
  FileCheck,
  Zap,
  Lock,
  User,
  Award,
  ShieldAlert,
  Crown
} from 'lucide-react';
import { RoundNumber, EventState, PromptAuthenticityResult, Submission, ParticipantUser, Participant } from '../types';
import { ROUNDS_INFO, SAMPLE_ROUND1_THEMES, SAMPLE_SCENARIO_CHITS, SAMPLE_PRODUCT_REQUIREMENTS, SAMPLE_SCREENSHOTS } from '../data/mockData';
import { api } from '../services/api';
import { sound } from '../utils/audio';
import { Round1TopicDrawer } from './Round1TopicDrawer';
import { Round2TopicDrawer } from './Round2TopicDrawer';
import { Round3TopicDrawer } from './Round3TopicDrawer';

interface SubmissionPortalProps {
  activeRound: RoundNumber;
  setActiveRound: (r: RoundNumber) => void;
  eventState: EventState;
  currentUser: ParticipantUser;
  existingSubmissions: Submission[];
  participants?: Participant[];
  onSubmissionSuccess: (sub: Submission) => void;
}

export const SubmissionPortal: React.FC<SubmissionPortalProps> = ({
  activeRound,
  setActiveRound,
  eventState,
  currentUser,
  existingSubmissions,
  participants = [],
  onSubmissionSuccess
}) => {
  // Helper to check if submission belongs to currently logged-in participant
  const isMySubmission = (s: Submission) => {
    if (!currentUser) return false;
    if (currentUser.id && s.participantId === currentUser.id) return true;
    if (currentUser.email && s.email && s.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (currentUser.registrationId && s.registrationId === currentUser.registrationId) return true;
    return false;
  };

  // Check if current user already submitted for activeRound
  const existingSubForRound = (existingSubmissions || []).find(s => s.roundId === activeRound && isMySubmission(s));

  // Round content state
  const [assignedTheme, setAssignedTheme] = useState(
    activeRound === 1 
      ? eventState.currentThemeRound1 
      : activeRound === 2 
      ? SAMPLE_SCENARIO_CHITS[0] 
      : SAMPLE_PRODUCT_REQUIREMENTS[0].requirement
  );

  const [promptText, setPromptText] = useState('');
  const [aiToolUsed, setAiToolUsed] = useState('Midjourney v6.1');
  const [generatedOutputSummary, setGeneratedOutputSummary] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);



  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<Submission | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentRoundInfo = ROUNDS_INFO[activeRound];

  useEffect(() => {
    if (activeRound === 1) {
      setAssignedTheme(eventState.currentThemeRound1);
    } else if (activeRound === 2) {
      setAssignedTheme(SAMPLE_SCENARIO_CHITS[0]);
    } else {
      setAssignedTheme(SAMPLE_PRODUCT_REQUIREMENTS[0].requirement);
    }
  }, [activeRound, eventState.currentThemeRound1]);

  const drawRandomChit = () => {
    sound.playBeep(700, 0.05);
    const randomIndex = Math.floor(Math.random() * SAMPLE_SCENARIO_CHITS.length);
    setAssignedTheme(SAMPLE_SCENARIO_CHITS[randomIndex]);
  };

  const selectProductReq = (req: string) => {
    sound.playBeep(750, 0.05);
    setAssignedTheme(req);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage('File size exceeds 8MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setScreenshotDataUrl(event.target?.result as string);
        sound.playBeep(850, 0.05);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadSampleScreenshot = (type: 'biomarine' | 'vedic') => {
    setScreenshotDataUrl(SAMPLE_SCREENSHOTS[type]);
    sound.playBeep(800, 0.05);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!promptText.trim()) {
      setErrorMessage('Prompt text is required.');
      return;
    }

    if (activeRound === 1 && !screenshotDataUrl) {
      setErrorMessage('Round 1 requires a mobile screenshot showing both prompt & generated image.');
      return;
    }

    if (activeRound === 3 && !demoUrl.trim()) {
      setErrorMessage('Round 3 requires a functional prototype URL or deployed demo link.');
      return;
    }

    setIsSubmitting(true);
    sound.playBeep(500, 0.08);

    try {
      const payload: Partial<Submission> = {
        roundId: activeRound,
        assignedThemeOrChit: assignedTheme,
        promptText,
        aiToolUsed,
        generatedOutputSummary: generatedOutputSummary || (activeRound === 1 ? 'Mobile screenshot verified with prompt' : ''),
        screenshotUrl: screenshotDataUrl || undefined,
        demoUrl: demoUrl.trim() || undefined,
        repoUrl: repoUrl.trim() || undefined
      };

      const res = await api.createSubmission(payload);
      if (res.success && res.submission) {
        sound.playSuccessChime();
        setSubmittedReceipt(res.submission);
        onSubmissionSuccess(res.submission);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Submission failed. Please retry.');
      sound.playWarningPing();
    } finally {
      setIsSubmitting(false);
    }
  };

  const wordCount = promptText.trim() ? promptText.trim().split(/\s+/).length : 0;
  const estimatedTokens = Math.round(promptText.length / 4);

  // Round Active & Prerequisite Enforcement Checks
  const hasSubmittedR1 = (existingSubmissions || []).some(s => s.roundId === 1 && isMySubmission(s));
  const hasSubmittedR2 = (existingSubmissions || []).some(s => s.roundId === 2 && isMySubmission(s));

  const isPrereqMet = activeRound === 1 
    ? true 
    : activeRound === 2 
    ? hasSubmittedR1 
    : (hasSubmittedR1 && hasSubmittedR2);

  const roundStatuses = eventState.roundStatuses || { round1: true, round2: false, round3: false };
  const isRoundStarted = roundStatuses[`round${activeRound}` as keyof typeof roundStatuses] ?? (eventState.activeRound === activeRound ? (eventState.isRoundActive ?? true) : false);

  // Qualification Cutoff Checks:
  // Round 2: Top 30 ranks from Round 1
  // Round 3: Top 10 ranks from Round 2
  const currentParticipant = (participants || []).find(p => p.id === currentUser?.id || p.registrationId === currentUser?.registrationId);
  const r1Rank = currentParticipant?.round1Rank ?? currentParticipant?.rank;
  const r2Rank = currentParticipant?.round2Rank;

  const isR1Evaluated = (participants || []).some(p => p.round1Score > 0);
  const isR2Evaluated = (participants || []).some(p => p.round2Score > 0);

  const isQualifiedForR2 = !isR1Evaluated || (r1Rank ? r1Rank <= 30 : true);
  const isQualifiedForR3 = !isR2Evaluated || (r2Rank ? r2Rank <= 10 : true);

  const isCutoffBlocked = activeRound === 2
    ? hasSubmittedR1 && isR1Evaluated && !isQualifiedForR2
    : activeRound === 3
    ? hasSubmittedR1 && hasSubmittedR2 && isR2Evaluated && !isQualifiedForR3
    : false;

  return (
    <div id="submission-portal" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 scroll-mt-20 sm:scroll-mt-24 relative">
      {/* Invisible anchor targets with navbar offset for direct hash navigation */}
      <span id="round-1" className="absolute -top-24 left-0 block w-0 h-0 pointer-events-none" aria-hidden="true" />
      <span id="round-2" className="absolute -top-24 left-0 block w-0 h-0 pointer-events-none" aria-hidden="true" />
      <span id="round-3" className="absolute -top-24 left-0 block w-0 h-0 pointer-events-none" aria-hidden="true" />
      
      {/* Round Selection Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b-4 border-black pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-black text-white px-2 py-0.5 text-xs font-mono font-bold uppercase">
              CONSOLE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-heading text-black uppercase tracking-tight">
              SUBMISSION PORTAL
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-1 font-mono">
            SUBMIT PROMPT & MEDIA ARTIFACTS BEFORE ROUND CLOSES
          </p>
        </div>

        {/* Chunky Round Switcher Pills */}
        <div className="grid grid-cols-3 sm:flex gap-1.5 p-1 bg-black border-3 border-black shadow-[4px_4px_0_#000]">
          {([1, 2, 3] as RoundNumber[]).map((r) => {
            const rStarted = roundStatuses[`round${r}` as keyof typeof roundStatuses] ?? false;
            const rPrereq = r === 1 ? true : r === 2 ? hasSubmittedR1 : (hasSubmittedR1 && hasSubmittedR2);
            const rQualified = r === 1 ? true : r === 2 ? isQualifiedForR2 : isQualifiedForR3;

            return (
              <button
                key={r}
                onClick={() => {
                  setActiveRound(r);
                  setErrorMessage('');
                  sound.playBeep(650 + r * 50, 0.04);
                  if (window.location.hash !== `#round-${r}`) {
                    window.history.pushState(null, '', `#round-${r}`);
                  }
                }}
                className={`py-1.5 px-3 text-xs font-mono font-black uppercase transition-all cursor-pointer flex items-center space-x-1 ${
                  activeRound === r
                    ? 'bg-[#FFD600] text-black shadow-[2px_2px_0_#000]'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                <span>R0{r}: {r === 1 ? 'PICTURE' : r === 2 ? 'SCENARIO' : 'PRODUCT'}</span>
                {!rPrereq ? (
                  <span title="Prerequisite locked"><Lock className="w-3 h-3 text-red-600 shrink-0" /></span>
                ) : !rQualified ? (
                  <span title={r === 2 ? "Top 30 cutoff locked" : "Top 10 cutoff locked"}><ShieldAlert className="w-3 h-3 text-red-600 shrink-0" /></span>
                ) : rStarted ? (
                  <span className="w-2 h-2 rounded-full bg-[#00C853] inline-block shrink-0" title="Round Started" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#FF4081] inline-block shrink-0" title="Round Stopped" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Round Brief & Tasks */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Objective Card */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0_#000] overflow-hidden">
            <div className="bg-[#FFD600] border-b-3 border-black p-3.5 flex items-center justify-between">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-black">
                ROUND 0{activeRound} BRIEF
              </span>
              <span className="text-xs font-mono font-bold bg-black text-white px-2 py-0.5">
                {currentRoundInfo.timeLimitMinutes}M LIMIT
              </span>
            </div>

            <div className="p-5 space-y-4">
              <h3 className="font-heading font-black text-black text-xl uppercase leading-tight">
                {currentRoundInfo.title}
              </h3>
              <p className="text-xs font-medium text-black leading-relaxed">
                {currentRoundInfo.description}
              </p>

              <div className="space-y-2 border-t-3 border-black pt-3">
                <div className="text-[11px] font-mono font-black uppercase tracking-wider text-black">
                  KEY DELIVERABLES:
                </div>
                {currentRoundInfo.keyTasks.map((task, i) => (
                  <div key={i} className="flex items-start space-x-2 text-xs font-bold text-black">
                    <span className="bg-black text-[#FFD600] text-[10px] font-mono px-1 border border-black mt-0.5 shrink-0">✓</span>
                    <span className="leading-snug">{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ML Authenticity Card */}
          <div className="bg-[#00E5FF] border-4 border-black shadow-[6px_6px_0_#000] p-5">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-black text-white flex items-center justify-center border-2 border-black">
                <Cpu className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <h4 className="font-heading font-black text-base uppercase text-black">
                NLP FORENSIC GUARDRAIL
              </h4>
            </div>
            <p className="text-xs font-bold text-black leading-relaxed">
              Every prompt is scanned for AI clichés, burstiness, and entropy. Original human prompts earn <span className="bg-black text-[#FFD600] px-1 py-0.2 font-mono">+10 BONUS POINTS</span> on the leaderboard!
            </p>
          </div>

        </div>

        {/* Right Column: Submission Form OR Block Banner OR Receipt */}
        <div className="lg:col-span-8">
          
          {existingSubForRound ? (
            /* READ-ONLY SUBMISSION RECEIPT FOR ALREADY SUBMITTED ROUND */
            <div className="bg-white border-4 border-black shadow-[8px_8px_0_#000] p-6 space-y-6">
              
              <div className="bg-[#00E5FF] border-3 border-black p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileCheck className="w-8 h-8 text-black" />
                  <div>
                    <h3 className="font-mono font-black text-lg uppercase text-black">
                      ROUND 0{activeRound} SUBMISSION RECEIVED
                    </h3>
                    <p className="text-xs font-mono font-bold text-black">
                      Submitted on: {new Date(existingSubForRound.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <span className="bg-black text-white text-xs font-mono font-bold px-3 py-1 uppercase">
                  {existingSubForRound.status === 'evaluated' ? 'GRADED' : 'UNDER REVIEW'}
                </span>
              </div>

              {/* User Identity Card */}
              <div className="bg-gray-50 border-3 border-black p-4 font-mono text-xs">
                <div className="font-black text-gray-500 uppercase mb-2">Authenticated Participant Ticket</div>
                <div className="grid grid-cols-2 gap-2 font-bold text-black">
                  <div>Name: <span className="underline">{currentUser.name}</span></div>
                  <div>Reg ID: <span>{currentUser.registrationId}</span></div>
                  <div>Email: <span>{currentUser.email}</span></div>
                  <div>College: <span>{currentUser.college || 'N/A'}</span></div>
                </div>
              </div>

              {/* Submitted Prompt */}
              <div>
                <label className="block text-xs font-mono font-black text-black uppercase mb-1">
                  SUBMITTED PROMPT STRING:
                </label>
                <div className="bg-[#F4F4F0] border-2 border-black p-4 font-mono text-xs font-semibold whitespace-pre-wrap">
                  {existingSubForRound.promptText}
                </div>
              </div>



              {/* Evaluated Score if Graded */}
              {existingSubForRound.scores && (
                <div className="bg-[#FFD600] border-3 border-black p-4 font-mono text-xs">
                  <div className="flex items-center justify-between font-black text-sm mb-2">
                    <span>SCORE AWARDED BY JUDGE:</span>
                    <span className="text-xl bg-black text-white px-3 py-1">{existingSubForRound.scores.totalScore} / 100</span>
                  </div>
                  {existingSubForRound.scores.feedback && (
                    <p className="font-semibold text-black bg-white p-2 border border-black">
                      Judge Feedback: {existingSubForRound.scores.feedback}
                    </p>
                  )}
                </div>
              )}

              <div className="p-3 bg-neutral-100 border-2 border-black text-center font-mono text-xs font-bold text-gray-700">
                You have already submitted an entry for Round 0{activeRound}. To view all your entries across rounds, click "My Submissions" in the navigation bar.
              </div>

            </div>
          ) : !isRoundStarted ? (
            /* ROUND STOPPED BANNER */
            <div className="bg-[#FF4081] border-4 border-black shadow-[8px_8px_0_#000] p-6 sm:p-8 space-y-5 text-white font-mono rounded-2xl">
              <div className="flex items-center space-x-3 bg-black text-[#FFD600] p-4 border-3 border-black shadow-[3px_3px_0_#fff]">
                <Lock className="w-8 h-8 shrink-0" />
                <div>
                  <h3 className="font-heading font-black text-xl uppercase tracking-tight">
                    ROUND 0{activeRound} IS CURRENTLY STOPPED BY JUDGES
                  </h3>
                  <p className="text-xs font-bold text-white/90 mt-0.5">
                    Submissions for Round 0{activeRound} are currently paused or locked.
                  </p>
                </div>
              </div>

              <p className="text-xs font-bold leading-relaxed bg-black/50 p-4 border-2 border-white/40 rounded-xl">
                Participants are not allowed to submit entries while this round is stopped. Please wait until competition referees trigger the start of Round 0{activeRound}.
              </p>

              <div className="flex items-center space-x-2 text-xs font-bold text-[#FFD600]">
                <Zap className="w-4 h-4" />
                <span>Monitor live arena broadcasts and announcements for status updates.</span>
              </div>
            </div>
          ) : !isPrereqMet ? (
            /* PREREQUISITE UNFULFILLED BANNER */
            <div className="bg-[#FF6B00] border-4 border-black shadow-[8px_8px_0_#000] p-6 sm:p-8 space-y-5 text-white font-mono rounded-2xl">
              <div className="flex items-center space-x-3 bg-black text-[#FFD600] p-4 border-3 border-black shadow-[3px_3px_0_#fff]">
                <AlertTriangle className="w-8 h-8 shrink-0 text-[#FFD600]" />
                <div>
                  <h3 className="font-heading font-black text-xl uppercase tracking-tight">
                    PREREQUISITE ROUND UNFULFILLED
                  </h3>
                  <p className="text-xs font-bold text-white/90 mt-0.5">
                    Until previous rounds are finished, participants are restricted from submitting further rounds.
                  </p>
                </div>
              </div>

              <div className="bg-black/50 p-4 border-2 border-white/40 rounded-xl space-y-2 text-xs font-bold">
                <p>
                  {activeRound === 2 
                    ? "⛔ You must complete and submit your Round 01 entry before you can enter or submit to Round 02."
                    : "⛔ You must complete and submit your entries for both Round 01 and Round 02 before entering Round 03."}
                </p>
                <div className="pt-2 border-t border-white/20 text-[#FFD600]">
                  Status Check: Round 01: {hasSubmittedR1 ? 'SUBMITTED ✅' : 'PENDING ❌'} | Round 02: {hasSubmittedR2 ? 'SUBMITTED ✅' : 'PENDING ❌'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveRound(hasSubmittedR1 ? 2 : 1)}
                className="neo-btn bg-[#FFD600] text-black px-6 py-2.5 text-xs font-heading font-black uppercase cursor-pointer shadow-[3px_3px_0_#000]"
              >
                GO TO {hasSubmittedR1 ? 'ROUND 02' : 'ROUND 01'} SUBMISSION
              </button>
            </div>
          ) : isCutoffBlocked ? (
            /* QUALIFICATION CUTOFF BANNER */
            <div className="bg-[#FF4081] border-4 border-black shadow-[8px_8px_0_#000] p-6 sm:p-8 space-y-5 text-white font-mono rounded-2xl">
              <div className="flex items-center space-x-3 bg-black text-[#FFD600] p-4 border-3 border-black shadow-[3px_3px_0_#fff]">
                <ShieldAlert className="w-8 h-8 shrink-0 text-[#FF4081]" />
                <div>
                  <h3 className="font-heading font-black text-xl uppercase tracking-tight">
                    {activeRound === 2 ? 'ROUND 02 QUALIFICATION CUTOFF: TOP 30 ONLY' : 'ROUND 03 FINALE CUTOFF: TOP 10 ONLY'}
                  </h3>
                  <p className="text-xs font-bold text-white/90 mt-0.5">
                    {activeRound === 2 
                      ? 'Only the Top 30 ranks from Round 01 advance to Round 02.'
                      : 'Only the Top 10 ranks from Round 02 advance to the Grand Finale.'}
                  </p>
                </div>
              </div>

              <div className="bg-black/50 p-4 border-2 border-white/40 rounded-xl space-y-2 text-xs font-bold">
                <p>
                  {activeRound === 2 ? (
                    <>
                      Your verified Round 01 standing is <span className="bg-[#FFD600] text-black px-1.5 py-0.5 font-black">RANK #{r1Rank}</span> ({currentParticipant?.round1Score ?? 0} PTS). 
                      The cutoff for Round 02 is Rank #30.
                    </>
                  ) : (
                    <>
                      Your verified Round 02 standing is <span className="bg-[#FFD600] text-black px-1.5 py-0.5 font-black">RANK #{r2Rank}</span> ({currentParticipant?.round2Score ?? 0} PTS). 
                      The cutoff for Round 03 Finale is Rank #10.
                    </>
                  )}
                </p>
                <div className="pt-2 border-t border-white/20 text-[#FFD600]">
                  Thank you for competing in PROMPT WARS 2026! You can view full official standings on the Leaderboard.
                </div>
              </div>

              <a
                href="#leaderboard"
                onClick={() => {
                  window.location.hash = '#leaderboard';
                }}
                className="neo-btn bg-[#FFD600] text-black px-6 py-2.5 text-xs font-heading font-black uppercase cursor-pointer shadow-[3px_3px_0_#000] inline-block no-underline"
              >
                VIEW TOURNAMENT LEADERBOARD →
              </a>
            </div>
          ) : (
            /* SUBMISSION FORM */
            <form onSubmit={handleSubmit} className="bg-white border-4 border-black shadow-[8px_8px_0_#000] p-5 sm:p-7 space-y-6">
              
              {/* Qualification Triumph Banner */}
              {activeRound === 2 && isR1Evaluated && isQualifiedForR2 && (
                <div className="bg-[#00C853] text-black border-3 border-black p-3 font-mono text-xs font-black uppercase flex items-center justify-between shadow-[3px_3px_0_#000]">
                  <span className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-black" />
                    <span>QUALIFIED CADET: RANK #{r1Rank} IN ROUND 01 (TOP 30 ADVANCEMENT)</span>
                  </span>
                  <span className="bg-black text-[#FFD600] px-2 py-0.5 border border-black">ADVANCED TO R02</span>
                </div>
              )}
              {activeRound === 3 && isR2Evaluated && isQualifiedForR3 && (
                <div className="bg-[#FFD600] text-black border-3 border-black p-3 font-mono text-xs font-black uppercase flex items-center justify-between shadow-[3px_3px_0_#000]">
                  <span className="flex items-center space-x-1.5">
                    <Crown className="w-4 h-4 text-black" />
                    <span>TOP 10 FINALIST CADET: RANK #{r2Rank} IN ROUND 02 (FINALE CONTENDER)</span>
                  </span>
                  <span className="bg-black text-white px-2 py-0.5 border border-black">ADVANCED TO R03</span>
                </div>
              )}
              
              {/* Header Strip inside form */}
              <div className="bg-[#F4F4F0] border-3 border-black p-3.5 flex items-center justify-between">
                <span className="font-mono font-black text-xs uppercase text-black flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-black" />
                  <span>AUTHENTICATED CONTESTANT IDENTITY</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-neutral-600">
                  SESSION VERIFIED
                </span>
              </div>

              {/* Read-Only Participant Badge */}
              <div className="bg-[#FFD600]/30 border-3 border-black p-4 font-mono text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-600 uppercase font-bold block text-[10px]">Participant Name</span>
                  <span className="font-black text-sm text-black">{currentUser.name}</span>
                </div>
                <div>
                  <span className="text-gray-600 uppercase font-bold block text-[10px]">Registration ID</span>
                  <span className="font-black text-sm text-black">{currentUser.registrationId}</span>
                </div>
                <div>
                  <span className="text-gray-600 uppercase font-bold block text-[10px]">Email Address</span>
                  <span className="font-bold text-black">{currentUser.email}</span>
                </div>
                <div>
                  <span className="text-gray-600 uppercase font-bold block text-[10px]">College / Institute</span>
                  <span className="font-bold text-black">{currentUser.college || 'Participant Institute'}</span>
                </div>
              </div>

              {/* Assigned Topic / Chit Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-black text-black uppercase tracking-wider">
                    {activeRound === 1 && 'ASSIGNED IMAGE THEME:'}
                    {activeRound === 2 && '15-WORD SCENARIO CHIT (ROUND 02 SPRINT):'}
                    {activeRound === 3 && 'PRODUCT REQUIREMENT BRIEF:'}
                  </label>
                </div>

                {activeRound === 1 && (
                  <Round1TopicDrawer
                    currentUser={currentUser}
                    onTaskAssigned={(taskStr) => setAssignedTheme(taskStr)}
                  />
                )}

                {activeRound === 2 && (
                  <Round2TopicDrawer
                    currentUser={currentUser}
                    onTaskAssigned={(taskStr) => setAssignedTheme(taskStr)}
                  />
                )}

                {activeRound === 3 && (
                  <Round3TopicDrawer
                    currentUser={currentUser}
                    onTaskAssigned={(taskStr) => setAssignedTheme(taskStr)}
                  />
                )}
              </div>

              {/* Permitted AI Tool Select / Free Text Input */}
              <div>
                <label className="block text-xs font-mono font-black text-black mb-1.5 uppercase">
                  {activeRound === 1 ? 'AI TOOL USED TO GENERATE IMAGE:' : 'PERMITTED AI TOOL USED:'}
                </label>
                {activeRound === 1 ? (
                  <>
                    <input
                      type="text"
                      required
                      value={aiToolUsed}
                      onChange={(e) => setAiToolUsed(e.target.value)}
                      placeholder="Type any AI tool used (e.g. Midjourney v6, DALL-E 3, Leonardo AI, Flux 1.1, Stable Diffusion...)"
                      className="w-full neo-input px-3 py-2 text-xs font-mono font-bold text-black"
                      list="round1-ai-tools"
                    />
                    <datalist id="round1-ai-tools">
                      <option value="Midjourney v6.1" />
                      <option value="DALL-E 3 (OpenAI)" />
                      <option value="Ideogram 2.0" />
                      <option value="Google Imagen 3" />
                      <option value="Stable Diffusion XL" />
                      <option value="Recraft.ai" />
                      <option value="Leonardo.Ai" />
                      <option value="Flux 1.1 Pro" />
                      <option value="Bing Image Creator" />
                      <option value="Adobe Firefly" />
                    </datalist>
                  </>
                ) : (
                  <select
                    value={aiToolUsed}
                    onChange={(e) => setAiToolUsed(e.target.value)}
                    className="w-full neo-input px-3 py-2 text-xs font-mono font-bold text-black cursor-pointer"
                  >
                    {activeRound === 2 ? (
                      <>
                        <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet (Permitted)</option>
                        <option value="ChatGPT (GPT-4o)">ChatGPT (GPT-4o)</option>
                        <option value="Google Gemini 2.5 Flash">Google Gemini 2.5 Flash</option>
                        <option value="DeepSeek R1">DeepSeek R1</option>
                        <option value="Perplexity AI">Perplexity AI</option>
                      </>
                    ) : (
                      <>
                        <option value="Cursor & Anthropic API">Cursor & Anthropic API (Permitted)</option>
                        <option value="v0.dev by Vercel">v0.dev by Vercel</option>
                        <option value="Bolt.new">Bolt.new</option>
                        <option value="Lovable.dev">Lovable.dev</option>
                        <option value="GitHub Copilot Workspace">GitHub Copilot Workspace</option>
                        <option value="Claude Artifacts">Claude Artifacts</option>
                      </>
                    )}
                  </select>
                )}
              </div>

              {/* Prompt Text Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono font-black text-black uppercase">
                    EXACT PROMPT STRING:
                  </label>
                  <div className="text-[11px] font-mono font-bold text-neutral-600">
                    {wordCount} WORDS · ~{estimatedTokens} TOKENS
                  </div>
                </div>
                <textarea
                  required
                  rows={4}
                  value={promptText}
                  onChange={(e) => {
                    setPromptText(e.target.value);
                  }}
                  placeholder={
                    activeRound === 1
                      ? "Enter your exact image prompt. E.g., A macro view of bioluminescent manta ray gliding through deep oceanic currents with photovoltaic conduits, deep cobalt lighting..."
                      : activeRound === 2
                      ? "Enter your exact prompt converting the 15-word scenario chit into actionable AI instructions..."
                      : "Enter your iterative prompt chain (e.g., [P1] Scaffold React component -> [P2] Add state logic -> [P3] Refine UI polish)..."
                  }
                  className="w-full neo-input p-3 text-xs font-mono text-black leading-relaxed"
                />

              </div>

              {/* Round 1 Deliverable: Mobile Screenshot Upload */}
              {activeRound === 1 && (
                <div className="space-y-3 pt-3 border-t-3 border-black">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-mono font-black text-black uppercase flex items-center space-x-1.5">
                      <ImageIcon className="w-4 h-4 text-[#FF6B00]" />
                      <span>RULE 5: MOBILE SCREENSHOT ARTIFACT</span>
                    </label>
                    <div className="flex items-center space-x-2 text-[11px] font-mono font-bold">
                      <button
                        type="button"
                        onClick={() => loadSampleScreenshot('biomarine')}
                        className="bg-[#FFD600] text-black px-2 py-0.5 border border-black shadow-[1px_1px_0_#000]"
                      >
                        SAMPLE CAPTURE A
                      </button>
                      <button
                        type="button"
                        onClick={() => loadSampleScreenshot('vedic')}
                        className="bg-[#00E5FF] text-black px-2 py-0.5 border border-black shadow-[1px_1px_0_#000]"
                      >
                        SAMPLE CAPTURE B
                      </button>
                    </div>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-3 border-dashed border-black bg-[#F4F4F0] hover:bg-white p-6 text-center cursor-pointer transition-colors shadow-[4px_4px_0_#000]"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {screenshotDataUrl ? (
                      <div className="space-y-2">
                        <div className="relative inline-block max-w-xs max-h-48 overflow-hidden border-3 border-black shadow-[4px_4px_0_#000]">
                          <img
                            src={screenshotDataUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-xs font-mono font-black text-[#00C853] flex items-center justify-center space-x-1 bg-black text-white p-1 max-w-xs mx-auto">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>SCREENSHOT LOADED · CLICK TO REPLACE</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="w-12 h-12 bg-[#FFD600] border-2 border-black flex items-center justify-center mx-auto shadow-[2px_2px_0_#000]">
                          <UploadCloud className="w-6 h-6 text-black" />
                        </div>
                        <div className="text-xs font-mono font-black uppercase text-black">
                          UPLOAD MOBILE SCREENSHOT (PNG/JPEG)
                        </div>
                        <p className="text-[11px] font-mono text-neutral-600">
                          Must visibly display prompt text and generated output image
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Round 2 Deliverable */}
              {activeRound === 2 && (
                <div className="space-y-2 pt-3 border-t-3 border-black">
                  <label className="block text-xs font-mono font-black text-black uppercase">
                    GENERATED OUTPUT RESPONSE / NOTES (OPTIONAL):
                  </label>
                  <textarea
                    rows={3}
                    value={generatedOutputSummary}
                    onChange={(e) => setGeneratedOutputSummary(e.target.value)}
                    placeholder="Optional: Paste output text, simulated response, or narrative generated by your permitted tool..."
                    className="w-full neo-input p-3 text-xs font-mono text-black"
                  />
                </div>
              )}

              {/* Round 3 Deliverable */}
              {activeRound === 3 && (
                <div className="space-y-4 pt-3 border-t-3 border-black">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-black text-black uppercase mb-1">
                        DEPLOYED WEBSITE URL (OPTIONAL):
                      </label>
                      <input
                        type="url"
                        value={demoUrl}
                        onChange={(e) => setDemoUrl(e.target.value)}
                        placeholder="https://my-family-tree.vercel.app or https://courtcraft.netlify.app"
                        className="w-full neo-input px-3 py-2 text-xs font-mono text-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-black text-black uppercase mb-1">
                        CODE REPOSITORY LINK:
                      </label>
                      <input
                        type="url"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/myteam/prompt-wars-r3"
                        className="w-full neo-input px-3 py-2 text-xs font-mono text-black"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-black text-black uppercase mb-1">
                      PROTOTYPE NOTES & JUDGES DEMO SUMMARY:
                    </label>
                    <textarea
                      rows={3}
                      value={generatedOutputSummary}
                      onChange={(e) => setGeneratedOutputSummary(e.target.value)}
                      placeholder="Describe key features implemented, prompts used to debug, and how you will demonstrate to the judges..."
                      className="w-full neo-input p-3 text-xs font-mono text-black"
                    />
                  </div>
                </div>
              )}

              {/* Error Message if any */}
              {errorMessage && (
                <div className="p-3.5 bg-[#FF4081] text-white border-3 border-black font-mono font-bold text-xs flex items-center space-x-2 shadow-[3px_3px_0_#000]">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t-4 border-black">
                <div className="text-xs font-mono font-bold text-neutral-600 uppercase">
                  OFFICIAL SUBMISSION · BOUND TO {currentUser.registrationId}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="neo-btn bg-[#FFD600] text-black px-8 py-3 text-sm font-heading font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-[5px_5px_0_#000] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>VERIFYING & SUBMITTING...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black" />
                      <span>SUBMIT ROUND 0{activeRound} ENTRY</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>

      </div>

      {/* Submission Success Modal */}
      {submittedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border-4 border-black shadow-[10px_10px_0_#000] p-6 space-y-4">
            <div className="flex items-center space-x-3 bg-[#00C853] p-3 border-3 border-black">
              <FileCheck className="w-7 h-7 text-black" />
              <div>
                <h3 className="font-heading font-black text-black text-lg uppercase">
                  ROUND 0{submittedReceipt.roundId} ENTRY RECEIVED!
                </h3>
                <p className="text-xs font-mono font-bold text-black">
                  RECEIPT: {submittedReceipt.id}
                </p>
              </div>
            </div>



            <div className="space-y-2 text-xs font-mono bg-[#F4F4F0] p-3.5 border-3 border-black font-bold">
              <div className="flex justify-between">
                <span>CONTESTANT:</span>
                <span>{submittedReceipt.participantName}</span>
              </div>
              <div className="flex justify-between">
                <span>REGISTRATION ID:</span>
                <span>{submittedReceipt.registrationId}</span>
              </div>
              <div className="flex justify-between">
                <span>TOOL:</span>
                <span>{submittedReceipt.aiToolUsed}</span>
              </div>
              <div className="flex justify-between text-[#FF4081]">
                <span>STATUS:</span>
                <span>QUEUED FOR JUDGE EVALUATION</span>
              </div>
            </div>

            <button
              onClick={() => setSubmittedReceipt(null)}
              className="w-full py-3 bg-black text-white hover:bg-[#FFD600] hover:text-black font-heading font-black text-xs uppercase tracking-wider border-3 border-black shadow-[4px_4px_0_#000] transition-colors cursor-pointer"
            >
              DONE & RETURN TO ARENA
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
