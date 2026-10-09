export type RoundNumber = 1 | 2 | 3;

export interface RoundInfo {
  id: RoundNumber;
  title: string;
  subtitle: string;
  timeLimitMinutes: number;
  location: string;
  level: 'Easy' | 'Intermediate' | 'Advanced / Final Round';
  description: string;
  keyTasks: string[];
  submissionRequirements: string[];
  submissionType: 'image_screenshot' | 'text_and_output' | 'product_prototype';
}

export interface PromptAuthenticityResult {
  authenticityScore: number; // 0 - 100 (higher = more human/self-made)
  isAiGenerated: boolean;
  aiProbability: number; // 0.0 - 1.0
  verdict: 'Human Crafted (Self-Made)' | 'Likely AI Generated / Boilerplate' | 'Hybrid / AI-Assisted';
  confidence: number; // 0 - 100
  metrics: {
    burstiness: number; // 0 - 100
    entropyScore: number; // 0 - 100
    formulaicMarkersCount: number;
    vocabularyDiversity: number; // 0 - 100
  };
  detectedMarkers: string[];
  flaggedPhrases: string[];
  reasoning: string;
  improvementTips: string[];
  analyzedAt: string;
}

export interface SubmissionScores {
  promptQuality: number; // 0 - 25
  outputRelevance: number; // 0 - 25
  creativity: number; // 0 - 25
  technicalExecution: number; // 0 - 25
  authenticityBonus: number; // 0 - 10 (awarded for genuine self-made prompts)
  totalScore: number; // 0 - 100
  gradedBy?: string;
  feedback?: string;
  gradedAt?: string;
}

export interface Submission {
  id: string;
  roundId: RoundNumber;
  participantId: string;
  participantName: string;
  college: string;
  registrationId: string;
  email: string;
  
  // Content
  assignedThemeOrChit: string;
  promptText: string;
  aiToolUsed: string;
  generatedOutputSummary?: string;
  
  // Media / Links
  screenshotUrl?: string; // Base64 or image URL
  demoUrl?: string; // Round 3 prototype link
  repoUrl?: string; // Round 3 code link
  
  // ML Authenticity
  authenticity: PromptAuthenticityResult;
  
  // Judging
  scores?: SubmissionScores;
  status: 'pending' | 'evaluated' | 'flagged_ai' | 'disqualified';
  submittedAt: string;
}

export interface Round1Task {
  id: number;
  category: string;
  title: string;
  brief: string;
}

export interface Round2Task {
  id: number;
  title: string;
  scenario: string;
  category?: string;
}

export interface Participant {
  id: string;
  registrationId: string;
  name: string;
  college: string;
  email: string;
  avatar: string;
  round1Score: number;
  round2Score: number;
  round3Score: number;
  authenticityBonusTotal: number;
  totalScore: number;
  rank: number;
  round1Rank?: number;
  round2Rank?: number;
  round3Rank?: number;
  isQualifiedR2?: boolean; // Top 30 ranks from Round 1
  isQualifiedR3?: boolean; // Top 10 ranks from Round 2
  status: 'active' | 'qualified_r2' | 'qualified_r3' | 'champion';
  submissionsCount: number;
  round1Task?: Round1Task | null;
  round2Task?: Round2Task | null;
}

export interface EventState {
  activeRound: RoundNumber;
  timerSecondsRemaining: number;
  isTimerRunning: boolean;
  currentThemeRound1: string;
  scenarioChitsRound2: string[];
  productRequirementsRound3: {
    title: string;
    requirement: string;
    techStackHint: string;
  }[];
  announcements: {
    id: string;
    time: string;
    message: string;
    type: 'info' | 'warning' | 'urgent';
  }[];
  // Leaderboard Access & Result Release Controls
  isLeaderboardPublished: boolean;
  publishedRounds: {
    round1: boolean;
    round2: boolean;
    round3: boolean;
  };
  // Round Start/Stop Controls
  isRoundActive: boolean;
  roundStatuses: {
    round1: boolean;
    round2: boolean;
    round3: boolean;
  };
}

export interface ParticipantUser {
  id: string;
  name: string;
  registrationId: string;
  email: string;
  college?: string;
  round1Task?: Round1Task | null;
  round2Task?: Round2Task | null;
}

