import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { SignJWT, jwtVerify } from 'jose';

import {
  INITIAL_PARTICIPANTS,
  INITIAL_EVENT_STATE,
  ROUNDS_INFO
} from './src/data/mockData.ts';
import { Submission, Participant, EventState, PromptAuthenticityResult, SubmissionScores } from './src/types/index.ts';
import { ROUND1_TASKS, Round1Task } from './src/data/round1Tasks.ts';
import { ROUND2_TASKS, Round2Task } from './src/data/round2Tasks.ts';
import { ROUND3_TASKS, Round3Task } from './src/data/round3Tasks.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Secrets & Configuration
const SESSION_SECRET_RAW = process.env.SESSION_SECRET || 'prompt-wars-2026-secure-session-secret';
const SESSION_SECRET_KEY = new TextEncoder().encode(SESSION_SECRET_RAW);
const ADMIN_SESSION_SECRET_KEY = new TextEncoder().encode(`${SESSION_SECRET_RAW}-admin-key`);
const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'pw2026';
const ENFORCE_TIMER_ON_SUBMIT = false;

// ------------------- RATE LIMITERS -------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

const geminiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Prompt analysis rate limit reached. Please wait before submitting more prompt checks.' }
});

// ------------------- SUPABASE INITIALIZATION -------------------
let supabase: SupabaseClient | null = null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log(`✓ Supabase configured: Connected to ${supabaseUrl}`);
  } catch (err) {
    console.warn('Could not initialize Supabase client:', err);
  }
} else {
  console.warn('⚠️ LOUD WARNING: Running in In-Memory Mode! Supabase credentials missing (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY). All data will reset on server restart.');
}

// In-Memory Fallback State (ONLY populated if Supabase is NOT connected)
let memoryParticipants: Participant[] = [...INITIAL_PARTICIPANTS];
let memorySubmissions: Submission[] = [];
let eventState: EventState = { ...INITIAL_EVENT_STATE };

// ------------------- HELPER FUNCTIONS -------------------

function mapParticipantFromDb(row: any): Participant {
  return {
    id: row.id,
    registrationId: row.registration_id,
    name: row.name,
    college: row.college || '',
    email: row.email,
    avatar: row.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face',
    round1Score: Number(row.round1_score || 0),
    round2Score: Number(row.round2_score || 0),
    round3Score: Number(row.round3_score || 0),
    authenticityBonusTotal: Number(row.authenticity_bonus_total || 0),
    totalScore: Number(row.total_score || 0),
    rank: Number(row.rank || 1),
    status: row.status || 'active',
    submissionsCount: Number(row.submissions_count || 0),
    round1Task: row.round1_task ? (typeof row.round1_task === 'string' ? JSON.parse(row.round1_task) : row.round1_task) : null,
    round2Task: row.round2_task ? (typeof row.round2_task === 'string' ? JSON.parse(row.round2_task) : row.round2_task) : null,
    round3Task: row.round3_task ? (typeof row.round3_task === 'string' ? JSON.parse(row.round3_task) : row.round3_task) : null
  };
}

function mapSubmissionFromDb(row: any): Submission {
  return {
    id: row.id,
    roundId: row.round_id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    college: row.college || '',
    registrationId: row.registration_id,
    email: row.email,
    assignedThemeOrChit: row.assigned_theme_or_chit,
    promptText: row.prompt_text,
    aiToolUsed: row.ai_tool_used,
    generatedOutputSummary: row.generated_output_summary,
    screenshotUrl: row.screenshot_url,
    demoUrl: row.demo_url,
    repoUrl: row.repo_url,
    authenticity: row.authenticity,
    scores: row.scores,
    status: row.status,
    submittedAt: row.submitted_at || row.created_at
  };
}

async function getParticipantById(id: string): Promise<Participant | null> {
  if (supabase) {
    const { data, error } = await supabase.from('participants').select('*').eq('id', id).maybeSingle();
    if (!error && data) return mapParticipantFromDb(data);
    return null;
  }
  return memoryParticipants.find(p => p.id === id) || null;
}

async function uploadScreenshotToStorage(dataUrl: string, submissionId: string): Promise<string> {
  if (!supabase || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataUrl;

    const fileExt = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${submissionId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('submission-artifacts')
      .upload(fileName, buffer, { contentType: `image/${matches[1]}`, upsert: true });

    if (uploadError) return dataUrl;

    const { data: publicUrlData } = supabase.storage.from('submission-artifacts').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (err) {
    return dataUrl;
  }
}

// ------------------- GEMINI AI & HEURISTICS -------------------
let geminiClient: GoogleGenAI | null = null;
const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (geminiKey) {
  try {
    geminiClient = new GoogleGenAI({ apiKey: geminiKey });
  } catch (err) {
    console.warn('Could not initialize Gemini Client:', err);
  }
}

function calculateAuthenticityBonus(authenticityScore: number): number {
  if (authenticityScore >= 90) return 10;
  if (authenticityScore >= 80) return 8;
  if (authenticityScore >= 70) return 6;
  if (authenticityScore >= 60) return 4;
  if (authenticityScore >= 50) return 2;
  return 0;
}

const KNOWN_AI_CLICHES = [
  // ChatGPT & LLM Openers / Prefixes
  'certainly', 'certainly!', 'here is a', 'here\'s a', 'here is the', 'here\'s the',
  'below is a', 'below is the', 'i\'d be happy to', 'sure, here', 'let\'s delve',
  'in this scenario', 'as an ai', 'as an ai language model', 'i cannot fulfill',

  // ChatGPT & LLM Transition / Filler Buzzwords
  'delve into', 'tapestry of', 'testament to', 'beacon of', 'fostering a', 'harnessing the',
  'unwavering', 'key takeaways', 'crucial role', 'vital component', 'in conclusion',
  'in summary', 'seamlessly', 'leverage', 'ever-evolving', 'vital role', 'crucial aspect',
  'in order to achieve', 'tailored to', 'key considerations', 'root cause analysis',

  // LLM Meta-Prompting & Scaffolding Patterns
  'act as a', 'act as an', 'you are an expert', 'you are a senior', 'your task is to',
  'step-by-step guide', 'provide a comprehensive', 'design a robust', 'create a detailed',
  'write a comprehensive', 'please ensure that', 'make sure to include',
  'system prompt:', 'user prompt:', 'roleplay as', 'given the scenario',
  'expected output:', 'guidelines:', 'best practices:', 'objective:', 'constraints:',
  'role:', 'context:', 'task:', 'instructions:',

  // Image AI Generation Clichés
  'masterpiece', '8k', '4k', 'photorealistic', 'hyperrealistic', 'ultra-realistic',
  'octane render', 'unreal engine', 'trending on artstation', 'cinematic lighting',
  'volumetric lighting', 'highly detailed', 'intricate detail', 'sharp focus',
  'studio lighting', 'depth of field', 'ray tracing', 'unreal engine 5', 'award winning'
];

function analyzePromptHeuristically(text: string): PromptAuthenticityResult {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  if (!clean || clean.length < 5) {
    return {
      authenticityScore: 50,
      isAiGenerated: false,
      aiProbability: 0.5,
      verdict: 'Human Crafted (Self-Made)',
      confidence: 50,
      metrics: { burstiness: 50, entropyScore: 50, formulaicMarkersCount: 0, vocabularyDiversity: 50 },
      detectedMarkers: [],
      flaggedPhrases: [],
      reasoning: "Prompt is too short for deep feature extraction.",
      improvementTips: ["Expand your prompt with specific domain requirements."],
      analyzedAt: new Date().toISOString()
    };
  }

  // 1. Detect AI Clichés & LLM Phrases
  const detectedMarkers: string[] = [];
  for (const phrase of KNOWN_AI_CLICHES) {
    const regex = new RegExp(`\\b${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) {
      if (!detectedMarkers.includes(phrase)) {
        detectedMarkers.push(phrase);
      }
    }
  }

  // 2. Vocabulary Diversity (Type-Token Ratio)
  const words = clean.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const uniqueWords = new Set(words);
  const vocabularyDiversity = words.length > 0 ? Math.min(100, Math.round((uniqueWords.size / words.length) * 100)) : 50;

  // 3. Structural & Formatting AI Markers
  let structuralPenalty = 0;
  // ChatGPT openers & section header check
  const chatGptOpeners = [
    /^certainly/i, /^here (is|'s) (a|the)/i, /^sure,/i, /^as an ai/i,
    /^act as (a|an)/i, /^you are (a|an|the)/i, /^in this (scenario|task)/i,
    /^create a (comprehensive|detailed|robust)/i, /^design a (comprehensive|robust)/i,
    /^write a (comprehensive|detailed)/i, /^i want you to act as/i,
    /^given the (following|scenario|problem)/i, /^objective:/i, /^role:/i, /^task:/i
  ];
  const matchedOpener = chatGptOpeners.some(rgx => rgx.test(clean));
  if (matchedOpener) {
    structuralPenalty += 40;
  }

  // Markdown headers & structured template check (typical of ChatGPT pastes)
  const bulletCount = (clean.match(/^[\s]*[-*•]\s+/gm) || []).length;
  const numberedListCount = (clean.match(/^[\s]*\d+[\.\)]\s+/gm) || []).length;
  const boldHeaderCount = (clean.match(/\*\*[^*]+\*\*/g) || []).length;
  const markdownSectionHeaders = (clean.match(/^#{1,4}\s+[A-Za-z0-9]/gm) || []).length;

  if (bulletCount >= 3 || numberedListCount >= 3 || boldHeaderCount >= 3 || markdownSectionHeaders >= 2) {
    structuralPenalty += 25;
  }

  // Check for explicit ChatGPT template label sections like **Role:**, **Context:**, **Task:**, **Output:**
  const templateSectionMatches = (lower.match(/\b(role|context|task|instructions|constraints|objective|output format):\b/g) || []).length;
  if (templateSectionMatches >= 2) {
    structuralPenalty += 30;
  }

  // 4. Burstiness (Sentence Length Variance)
  const sentences = clean.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
  let burstiness = 50;
  if (sentences.length > 1) {
    const lengths = sentences.map(s => s.split(/\s+/).length).filter(l => l > 0);
    if (lengths.length > 1) {
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
      const stdDev = Math.sqrt(variance);
      const cv = avg > 0 ? stdDev / avg : 0;
      burstiness = Math.min(100, Math.round(cv * 100));
      // Low CV (< 0.35) means unnatural sentence length uniformity -> ChatGPT penalty
      if (cv < 0.35) {
        structuralPenalty += 15;
      }
    }
  }

  // 5. Calculate Final Authenticity Score
  const markerPenalty = Math.min(75, detectedMarkers.length * 18);
  let baseScore = 95 - markerPenalty - structuralPenalty;

  if (markerPenalty === 0 && structuralPenalty === 0) {
    baseScore += Math.round((vocabularyDiversity - 50) * 0.1);
  }

  const authenticityScore = Math.max(10, Math.min(98, Math.round(baseScore)));
  const isAiGenerated = authenticityScore < 60;

  let verdict: 'Human Crafted (Self-Made)' | 'Likely AI Generated / Boilerplate' | 'Hybrid / AI-Assisted' = 'Human Crafted (Self-Made)';
  if (authenticityScore < 45) {
    verdict = 'Likely AI Generated / Boilerplate';
  } else if (authenticityScore < 75) {
    verdict = 'Hybrid / AI-Assisted';
  }

  const aiProbability = parseFloat(((100 - authenticityScore) / 100).toFixed(2));

  let reasoning = `Authenticity evaluated at ${authenticityScore}%.`;
  if (matchedOpener) {
    reasoning += ` Detected formulaic ChatGPT / LLM opener phrasing.`;
  }
  if (detectedMarkers.length > 0) {
    reasoning += ` Flagged ${detectedMarkers.length} AI marker phrase(s): ${detectedMarkers.slice(0, 3).join(', ')}.`;
  }
  if (structuralPenalty >= 20 && !matchedOpener) {
    reasoning += ` Heavy LLM template formatting & uniform scaffolding detected.`;
  }
  if (detectedMarkers.length === 0 && structuralPenalty === 0) {
    reasoning = `Authenticity evaluated at ${authenticityScore}%. Prompt displays natural human composition & organic phrasing.`;
  }

  return {
    authenticityScore,
    isAiGenerated,
    aiProbability,
    verdict,
    confidence: 90,
    metrics: {
      burstiness,
      entropyScore: Math.min(100, Math.round(vocabularyDiversity * 0.9 + burstiness * 0.1)),
      formulaicMarkersCount: detectedMarkers.length,
      vocabularyDiversity
    },
    detectedMarkers,
    flaggedPhrases: detectedMarkers,
    reasoning,
    improvementTips: detectedMarkers.length > 0
      ? [`Remove formulaic AI markers like "${detectedMarkers[0]}".`, "Use your own natural domain terms instead of template phrases."]
      : matchedOpener
        ? ["Avoid starting prompts with ChatGPT boilerplate like 'Act as' or 'Certainly'."]
        : ["Strong, organic prompt phrasing."],
    analyzedAt: new Date().toISOString()
  };
}

async function evaluatePromptWithGemini(promptText: string): Promise<PromptAuthenticityResult> {
  const heuristicResult = analyzePromptHeuristically(promptText);
  if (!geminiClient) return heuristicResult;

  try {
    const systemPrompt = `You are an expert AI Forensics & Prompt Engineering Referee for PROMPT WARS 2026.
Your mandate is to strictly evaluate whether a contestant's prompt is an authentic, organically human-crafted prompt or if it was generated by ChatGPT / Claude / LLMs or copied from formulaic AI prompt templates.

CRITICAL PENALTY INSTRUCTIONS:
1. ChatGPT / LLM Scaffolding: Prompts using roleplay/scaffold templates ("Act as a...", "You are an expert...", "Given the following scenario...", "Objective:", "Role:", "Constraints:") MUST BE PENALIZED HEAVILY.
2. AI Clichés & Buzzwords: Words like "delve", "tapestry", "fostering", "harnessing", "unwavering", "seamlessly", "vital role", "crucial aspect" indicate LLM generation.
3. Overly neat markdown headers (###), bolded role/task labels, or uniform bullet points generated by ChatGPT must receive low authenticity (<50%).
4. Purely organic, hand-crafted prompt text written directly without template stuffing receives high authenticity (80-98%).

AUTHENTICITY SCORING SCALE (0-100):
- 85-100: Purely human-written, natural phrasing, original creative thought without AI templates.
- 60-84: Mostly human with slight standard syntax.
- 35-59: Hybrid prompt, heavily relies on ChatGPT templates or prompt generators.
- 0-34: Direct ChatGPT paste, full LLM boilerplate, or formulaic cliché stuffing.

Respond ONLY in valid JSON strictly conforming to this schema:
{
  "authenticityScore": number (0-100),
  "isAiGenerated": boolean,
  "aiProbability": number (0.0-1.0),
  "verdict": "Human Crafted (Self-Made)" | "Likely AI Generated / Boilerplate" | "Hybrid / AI-Assisted",
  "confidence": number (0-100),
  "detectedMarkers": string[],
  "flaggedPhrases": string[],
  "reasoning": string,
  "improvementTips": string[]
}`;

    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Analyze contestant prompt for AI generation:\n"""\n${promptText}\n"""`,
      config: { systemInstruction: systemPrompt, responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    let authenticityScore = Math.round(parsed.authenticityScore ?? heuristicResult.authenticityScore);

    // Hard cap: If heuristic analysis flagged matched openers, AI markers, or heavy structural LLM scaffolding,
    // Gemini MUST NOT override heuristic penalties with an artificially inflated score!
    if (heuristicResult.detectedMarkers.length >= 2 || heuristicResult.authenticityScore < 60) {
      authenticityScore = Math.min(authenticityScore, heuristicResult.authenticityScore + 10);
    }

    authenticityScore = Math.min(98, Math.max(10, authenticityScore));
    const isAiGenerated = authenticityScore < 60;

    let verdict: 'Human Crafted (Self-Made)' | 'Likely AI Generated / Boilerplate' | 'Hybrid / AI-Assisted' = 'Human Crafted (Self-Made)';
    if (authenticityScore < 45) verdict = 'Likely AI Generated / Boilerplate';
    else if (authenticityScore < 75) verdict = 'Hybrid / AI-Assisted';

    return {
      authenticityScore,
      isAiGenerated,
      aiProbability: parseFloat(((100 - authenticityScore) / 100).toFixed(2)),
      verdict,
      confidence: Math.round(parsed.confidence ?? 92),
      metrics: heuristicResult.metrics,
      detectedMarkers: parsed.detectedMarkers || heuristicResult.detectedMarkers,
      flaggedPhrases: parsed.flaggedPhrases || heuristicResult.flaggedPhrases,
      reasoning: parsed.reasoning || heuristicResult.reasoning,
      improvementTips: parsed.improvementTips || heuristicResult.improvementTips,
      analyzedAt: new Date().toISOString()
    };
  } catch (err: any) {
    console.warn('Gemini prompt evaluation fallback used:', err?.message || err);
    return heuristicResult;
  }
}

async function evaluateSubmissionWithGeminiMultimodal(sub: Submission): Promise<SubmissionScores> {
  const authenticityBonus = calculateAuthenticityBonus(sub.authenticity.authenticityScore);

  // Heuristic task-alignment & scenario-mention check as fallback
  const wordCount = sub.promptText.trim().split(/\s+/).length;
  const cleanPrompt = sub.promptText.toLowerCase();
  const assignedScenario = sub.assignedThemeOrChit || '';
  const scenarioWords = assignedScenario.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const matchedScenarioWords = scenarioWords.filter(w => cleanPrompt.includes(w));
  const scenarioMatchRatio = scenarioWords.length > 0 ? (matchedScenarioWords.length / scenarioWords.length) : 0.5;
  const hasScenarioMention = assignedScenario ? cleanPrompt.includes(assignedScenario.toLowerCase()) || scenarioMatchRatio >= 0.4 : true;

  // Round-specific fallback scoring logic
  let fallbackOutputRelevance = 15;
  let fallbackPromptQuality = 15;
  let fallbackCreativity = 15;
  let fallbackTechnicalExecution = 15;
  let fallbackFeedback = '';

  if (sub.roundId === 2) {
    // Round 2 Scenario Sprint: Heavily grade scenario mention and scenario explanation
    fallbackOutputRelevance = hasScenarioMention
      ? Math.min(25, Math.max(18, Math.round(18 + scenarioMatchRatio * 7)))
      : Math.min(10, Math.max(4, Math.round(scenarioMatchRatio * 8)));

    // Explain check: check for explanation keyphrases
    const explanationKeywords = ['because', 'due to', 'context', 'problem', 'issue', 'scenario', 'mitigate', 'resolve', 'incident', 'triage', 'steps', 'action'];
    const explanationCount = explanationKeywords.filter(k => cleanPrompt.includes(k)).length;
    fallbackPromptQuality = Math.min(25, Math.max(10, Math.round(12 + Math.min(8, wordCount / 12) + Math.min(5, explanationCount * 1.5))));

    fallbackCreativity = Math.min(25, Math.max(12, Math.round(14 + (sub.authenticity.authenticityScore * 0.08))));
    fallbackTechnicalExecution = Math.min(25, Math.max(12, Math.round(15 + (cleanPrompt.includes('json') || cleanPrompt.includes('step') ? 5 : 2))));

    fallbackFeedback = hasScenarioMention
      ? `Round 02 Scenario Sprint: Prompt explicitly addresses assigned scenario "${assignedScenario.slice(0, 40)}..." with structured explanation.`
      : `Round 02 Scenario Sprint: Prompt fails to clearly state or incorporate the assigned scenario "${assignedScenario.slice(0, 40)}...". Please explicitly state and explain your scenario.`;
  } else if (sub.roundId === 3) {
    // Round 3 Grand Finale: Evaluate assigned Problem Statement (Roots & Relations vs CourtCraft) and mandatory features
    const r3Keywords = ['tree', 'generation', 'member', 'family', 'jersey', 'cart', 'checkout', 'size', 'color', 'login', 'password', 'navigat'];
    const r3MatchCount = r3Keywords.filter(k => cleanPrompt.includes(k)).length;
    fallbackOutputRelevance = Math.min(25, Math.max(12, Math.round(14 + r3MatchCount * 1.5)));
    fallbackPromptQuality = Math.min(25, Math.max(12, Math.round(14 + (wordCount / 12))));
    fallbackCreativity = Math.min(25, Math.max(12, Math.round(15 + (sub.authenticity.authenticityScore * 0.08))));
    fallbackTechnicalExecution = Math.min(25, Math.max(12, Math.round(15 + (sub.demoUrl ? 5 : 2))));
    fallbackFeedback = `Round 03 Finale: Prompt evaluated against assigned Problem Statement "${assignedScenario.slice(0, 40)}...". Includes mandatory features overview.`;
  } else {
    // Round 1 Fallback
    fallbackPromptQuality = Math.min(25, Math.max(12, Math.round(14 + (wordCount / 10))));
    fallbackOutputRelevance = Math.min(25, Math.max(10, Math.round(12 + (scenarioMatchRatio * 13))));
    fallbackCreativity = Math.min(25, Math.max(12, Math.round(15 + (sub.authenticity.authenticityScore * 0.08))));
    fallbackTechnicalExecution = Math.min(25, Math.max(12, Math.round(16 + (cleanPrompt.includes('--') || cleanPrompt.includes('rendering') ? 4 : 2))));
    fallbackFeedback = scenarioMatchRatio >= 0.5
      ? `Evaluated entry. Prompt demonstrates good alignment with assigned brief "${assignedScenario.slice(0, 35)}...".`
      : `Evaluated entry. Prompt partially addresses assigned brief "${assignedScenario.slice(0, 35)}...". Could incorporate more task constraints.`;
  }

  const fallbackTotalScore = Math.min(100, fallbackPromptQuality + fallbackOutputRelevance + fallbackCreativity + fallbackTechnicalExecution + authenticityBonus);

  const fallbackScores: SubmissionScores = {
    promptQuality: fallbackPromptQuality,
    outputRelevance: fallbackOutputRelevance,
    creativity: fallbackCreativity,
    technicalExecution: fallbackTechnicalExecution,
    authenticityBonus,
    totalScore: fallbackTotalScore,
    gradedBy: geminiClient ? 'Gemini 2.0 Flash AI Evaluator' : 'Heuristic Task Evaluator',
    feedback: fallbackFeedback,
    gradedAt: new Date().toISOString()
  };

  if (!geminiClient) {
    return fallbackScores;
  }

  try {
    let systemPrompt = '';
    let promptText = '';

    if (sub.roundId === 2) {
      // Specialized System Prompt for Round 2 (Emergency Scenario Sprint)
      systemPrompt = `You are the Lead Judge & AI Evaluator for PROMPT WARS 2026 - ROUND 02: SCENARIO EMERGENCY SPRINT.

In Round 02, contestants are assigned a specific emergency incident or technical crisis scenario chit ("${assignedScenario}").
Your mandate is to strictly evaluate how effectively the contestant's prompt mentions, explains, and addresses their assigned scenario.

EVALUATION CRITERIA & SCORING BREAKDOWN (0-100 TOTAL):

1. OUTPUT RELEVANCE / SCENARIO INCORPORATION (0-25 PTS):
   - SCENARIO MENTION CHECK: Does the contestant's prompt EXPLICITLY state and mention their assigned emergency scenario ("${assignedScenario}")?
   - If the prompt completely fails to mention or ignores the assigned scenario chit, cap outputRelevance at 0-6 PTS.
   - If the prompt explicitly incorporates and targets the assigned scenario chit directly, award 20-25 PTS.

2. PROMPT QUALITY & SCENARIO EXPLANATION (0-25 PTS):
   - SCENARIO EXPLANATION DEPTH: How well does the contestant EXPLAIN the scenario background, crisis context, emergency parameters, constraints, and instructions within the prompt?
   - Does it clearly break down the problem statement, system state, variables, and expected resolution steps?
   - High scores (20-25 PTS) require clear framing, structured constraints, precise context setting, and articulate explanation of the problem.

3. CREATIVITY & STRATEGIC PROBLEM SOLVING (0-25 PTS):
   - Evaluate the contestant's strategic approach to resolving the crisis described in "${assignedScenario}".
   - Look for innovative triage mechanisms, creative failover workflows, root-cause isolation prompts, or unique technical mitigation strategies.

4. TECHNICAL EXECUTION & SYNTAX (0-25 PTS):
   - Technical precision: logic flow, variable placeholders, prompt guardrails, output constraints (e.g. JSON schema, step-by-step triage format, severity classification).

5. ML AUTHENTICITY BONUS (0-10 PTS):
   - Automatically assigned: ${authenticityBonus} PTS (based on prompt authenticity score of ${sub.authenticity.authenticityScore}%).

FEEDBACK INSTRUCTIONS:
- You MUST explicitly reference the assigned scenario ("${assignedScenario}").
- State whether the scenario was explicitly mentioned and well-explained in the prompt.
- Provide 2-3 concise sentences detailing key strengths and specific areas to improve.

Output strictly valid JSON matching this schema:
{
  "promptQuality": number (0-25),
  "outputRelevance": number (0-25),
  "creativity": number (0-25),
  "technicalExecution": number (0-25),
  "authenticityBonus": number (0-10),
  "totalScore": number (0-100),
  "feedback": string
}`;

      promptText = `
EVALUATION REQUEST FOR ROUND 02 (SCENARIO SPRINT):
- Contestant: ${sub.participantName} (${sub.registrationId})
- RANDOMLY ASSIGNED SCENARIO CHIT: "${assignedScenario}"
- CONTESTANT'S SUBMITTED PROMPT:
"""
${sub.promptText}
"""
- AI Tool Specified: "${sub.aiToolUsed}"
- PROMPT AUTHENTICITY SCORE: ${sub.authenticity.authenticityScore}% (Bonus: +${authenticityBonus} PTS)

INSTRUCTIONS:
1. Verify if the contestant's prompt explicitly mentions and incorporates the assigned scenario chit "${assignedScenario}".
2. Evaluate how thoroughly and clearly the scenario problem and context are explained within the prompt.
3. Return JSON only conforming strictly to the specified schema.`;

    } else if (sub.roundId === 3) {
      // Specialized System Prompt for Round 3 (Grand Finale - Roots & Relations vs CourtCraft)
      systemPrompt = `You are the Lead Judge & AI Evaluator for PROMPT WARS 2026 - ROUND 03: THE GRAND FINALE.

In Round 03, the top 10 finalists are randomly assigned one of two Problem Statements:
- Problem Statement 1: Roots & Relations (Family Tree: visual tree, 3+ generations, clickable member photo/bio/accomplishments, navigation back to tree, password-protected login screen).
- Problem Statement 2: CourtCraft (E-commerce Basketball Jersey Storefront: striking homepage featuring jersey, product mockups/price/material/features, size/color selectors, add-to-cart with visible counter, checkout order summary preview).

CONTESTANT'S RANDOMLY ASSIGNED PROBLEM STATEMENT:
"${assignedScenario}"

EVALUATION CRITERIA & SCORING BREAKDOWN (0-100 TOTAL):

1. PROBLEM STATEMENT ALIGNMENT & OUTPUT RELEVANCE (0-25 PTS):
   - Evaluate whether the contestant's prompt(s) directly address and solve their assigned Problem Statement ("${assignedScenario}").
   - If off-topic or completely ignores the assigned PS, cap outputRelevance at 0-8 PTS.

2. MANDATORY FEATURES COVERAGE (0-25 PTS):
   - Check coverage of all mandatory features required for their assigned PS.
   - For Roots & Relations: visual tree, member click details modal, 3+ generations, navigation back to tree, password entry screen/login flow.
   - For CourtCraft: homepage featuring jersey, product details (price, material, features), size & color options, add-to-cart interaction with visible counter, checkout/order summary preview.

3. PROMPT QUALITY & SYSTEM ARCHITECTURE (0-25 PTS):
   - Evaluate prompt structure, modular layout instructions, component breakdowns, state management specs, and engineering clarity.

4. TECHNICAL EXECUTION & DEPLOYMENT EVIDENCE (0-25 PTS):
   - Technical quality, styling tokens (dark mode/glassmorphism/gradients/animations), and functional flow.
   - Deployed Demo URL Provided: ${sub.demoUrl ? `"${sub.demoUrl}" (Bonus evidence of working deployment)` : 'None provided (Optional)'}.

5. ML AUTHENTICITY BONUS (0-10 PTS):
   - Automatically assigned: ${authenticityBonus} PTS (based on prompt authenticity score of ${sub.authenticity.authenticityScore}%).

FEEDBACK INSTRUCTIONS:
- You MUST explicitly reference the contestant's assigned Problem Statement ("${assignedScenario}").
- Detail which mandatory features were satisfied by their prompt(s).
- Provide 2-3 concise sentences detailing strengths and areas for refinement.

Output strictly valid JSON:
{
  "promptQuality": number (0-25),
  "outputRelevance": number (0-25),
  "creativity": number (0-25),
  "technicalExecution": number (0-25),
  "authenticityBonus": number (0-10),
  "totalScore": number (0-100),
  "feedback": string
}`;

      promptText = `
EVALUATION REQUEST FOR ROUND 03 (GRAND FINALE):
- Contestant: ${sub.participantName} (${sub.registrationId})
- RANDOMLY ASSIGNED PROBLEM STATEMENT: "${assignedScenario}"
- CONTESTANT'S SUBMITTED PROMPTS:
"""
${sub.promptText}
"""
- Permitted AI Tool Specified: "${sub.aiToolUsed}"
- Optional Deployed Website URL: ${sub.demoUrl || 'None'}
- PROMPT AUTHENTICITY SCORE: ${sub.authenticity.authenticityScore}% (Bonus: +${authenticityBonus} PTS)

INSTRUCTIONS:
1. Verify if the submitted prompts directly satisfy the contestant's assigned Problem Statement ("${assignedScenario}").
2. Evaluate coverage of the mandatory features specified in their PS.
3. Return JSON conforming strictly to the specified schema.`;

    } else {
      // System Prompt for Round 1
      systemPrompt = `You are the Lead Judge & Evaluator for PROMPT WARS 2026.
Your PRIMARY RESPONSIBILITY is to verify whether the contestant's submitted prompt satisfies the randomly assigned task brief given to them in Round 0${sub.roundId}.

CRITICAL EVALUATION INSTRUCTIONS:
1. Task Satisfaction Check: First, evaluate if the contestant's prompt explicitly fulfills, obeys, and satisfies all requirements of their randomly assigned task brief ("${assignedScenario}").
2. Output Relevance (0-25 PTS): Rate how accurately and completely the prompt satisfies the assigned task brief. If the prompt fails to satisfy the assigned task or is off-topic, assign a low outputRelevance score (0-8 PTS).
3. Prompt Quality (0-25 PTS): Evaluate prompt structure, specificity, camera/style modifiers, and engineering depth.
4. Creativity (0-25 PTS): Evaluate creative concept and visual/textual innovation aligned with the task.
5. Technical Execution (0-25 PTS): Evaluate technical parameters (aspect ratio --ar, lighting, style terms, negative prompts).

Output JSON format strictly:
{
  "promptQuality": number (0-25),
  "outputRelevance": number (0-25),
  "creativity": number (0-25),
  "technicalExecution": number (0-25),
  "authenticityBonus": number (0-10),
  "totalScore": number (0-100),
  "feedback": string
}`;

      promptText = `
EVALUATION REQUEST FOR ROUND 0${sub.roundId}:
- Contestant: ${sub.participantName} (${sub.registrationId})
- RANDOMLY ASSIGNED TASK BRIEF: "${assignedScenario}"
- CONTESTANT'S SUBMITTED PROMPT: "${sub.promptText}"
- AI Tool Specified: "${sub.aiToolUsed}"

INSTRUCTIONS:
Verify if the contestant's prompt directly satisfies the assigned task brief "${assignedScenario}".
Score prompt-to-task satisfaction under outputRelevance. Return JSON only.`;
    }

    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [promptText],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const pq = Math.min(25, Math.max(0, Math.round(parsed.promptQuality ?? fallbackScores.promptQuality)));
    const oRel = Math.min(25, Math.max(0, Math.round(parsed.outputRelevance ?? fallbackScores.outputRelevance)));
    const cr = Math.min(25, Math.max(0, Math.round(parsed.creativity ?? fallbackScores.creativity)));
    const te = Math.min(25, Math.max(0, Math.round(parsed.technicalExecution ?? fallbackScores.technicalExecution)));
    const ab = Math.min(10, Math.max(0, Math.round(parsed.authenticityBonus ?? authenticityBonus)));
    const tot = Math.min(100, Math.max(0, Math.round(parsed.totalScore ?? (pq + oRel + cr + te + ab))));

    return {
      promptQuality: pq,
      outputRelevance: oRel,
      creativity: cr,
      technicalExecution: te,
      authenticityBonus: ab,
      totalScore: tot,
      gradedBy: 'Gemini 2.0 Flash AI Evaluator',
      feedback: parsed.feedback || fallbackScores.feedback,
      gradedAt: new Date().toISOString()
    };
  } catch (err: any) {
    console.warn('Gemini evaluation fallback used:', err?.message || err);
    return fallbackScores;
  }
}

// ------------------- AUTH MIDDLEWARES -------------------

interface AuthenticatedRequest extends Request {
  participant?: Participant;
}

async function requireParticipant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.pw_session;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Participant session required' });
      return;
    }

    const { payload } = await jwtVerify(token, SESSION_SECRET_KEY);
    const participantId = payload.participantId as string;

    const participant = await getParticipantById(participantId);
    if (!participant) {
      res.status(401).json({ error: 'Unauthorized: Participant record not found' });
      return;
    }

    req.participant = participant;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.pw_admin_session;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Admin privileges required' });
      return;
    }

    await jwtVerify(token, ADMIN_SESSION_SECRET_KEY);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired admin session' });
  }
}

// ------------------- API ROUTES -------------------

// 0. DB Status
app.get('/api/db-status', async (_req: Request, res: Response) => {
  let isDbWorking = false;
  let dbErrorMsg: string | null = null;

  if (supabase) {
    try {
      const { error } = await supabase.from('event_state').select('id').limit(1);
      if (!error) {
        isDbWorking = true;
      } else {
        dbErrorMsg = error.message;
      }
    } catch (err: any) {
      dbErrorMsg = err.message || 'Database query error';
    }
  }

  res.json({
    connected: Boolean(supabase),
    working: isDbWorking,
    provider: supabase ? 'supabase' : 'in-memory',
    supabaseUrl: supabaseUrl || null,
    error: dbErrorMsg
  });
});

// 1. Participant Auth (Email-only login)
app.post('/api/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, registrationId } = req.body;
    const inputStr = String(email || registrationId || '').trim();
    const normInput = inputStr.toLowerCase();

    if (!normInput) {
      res.status(400).json({ error: 'Please enter your registered email address.' });
      return;
    }

    let participant: Participant | null = null;

    if (supabase) {
      const { data: emailData, error: emailErr } = await supabase
        .from('participants')
        .select('*')
        .ilike('email', normInput)
        .maybeSingle();

      if (!emailErr && emailData) {
        participant = mapParticipantFromDb(emailData);
      } else {
        const { data: regData } = await supabase
          .from('participants')
          .select('*')
          .ilike('registration_id', inputStr)
          .maybeSingle();
        if (regData) {
          participant = mapParticipantFromDb(regData);
        }
      }
    } else {
      const found = memoryParticipants.find(
        p => p.email.toLowerCase() === normInput || p.registrationId.toLowerCase() === normInput
      );
      if (found) participant = found;
    }

    if (!participant) {
      res.status(401).json({ error: 'No participant record found for this email address.' });
      return;
    }

    // Issue signed JWT token
    const token = await new SignJWT({ participantId: participant.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('12h')
      .sign(SESSION_SECRET_KEY);

    res.cookie('pw_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours
    });

    res.json({
      success: true,
      participant: {
        id: participant.id,
        name: participant.name,
        registrationId: participant.registrationId,
        email: participant.email,
        college: participant.college
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed due to an internal server error' });
  }
});

app.get('/api/auth/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.cookies.pw_session;
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { payload } = await jwtVerify(token, SESSION_SECRET_KEY);
    const participant = await getParticipantById(payload.participantId as string);

    if (!participant) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.json({
      id: participant.id,
      name: participant.name,
      registrationId: participant.registrationId,
      email: participant.email,
      college: participant.college
    });
  } catch (err) {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('pw_session');
  res.json({ success: true });
});

// ------------------- ROUND 1 RANDOM TASK DRAW ENDPOINTS -------------------
const round1TaskMap = new Map<string, Round1Task>();

app.get('/api/round1/my-task', requireParticipant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const participant = req.participant!;
    const task = participant.round1Task || round1TaskMap.get(participant.id) || null;

    res.json({
      success: true,
      task,
      isAssigned: Boolean(task)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve Round 1 task' });
  }
});

app.post('/api/round1/draw-task', requireParticipant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const participant = req.participant!;
    const existingTask = participant.round1Task || round1TaskMap.get(participant.id);

    // 1. If participant already has an assigned task, return it (1 chance only!)
    if (existingTask) {
      res.json({
        success: true,
        task: existingTask,
        isAlreadyAssigned: true
      });
      return;
    }

    // 2. Fetch all current task assignments to enforce "at most 4 participants per task"
    const taskCounts: Record<number, number> = {};
    for (let i = 1; i <= 30; i++) {
      taskCounts[i] = 0;
    }

    // Count tasks stored in memory map
    for (const t of round1TaskMap.values()) {
      if (t && t.id) {
        taskCounts[t.id] = (taskCounts[t.id] || 0) + 1;
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('participants').select('round1_task').not('round1_task', 'is', null);
        if (!error && data) {
          for (const row of data) {
            const t = typeof row.round1_task === 'string' ? JSON.parse(row.round1_task) : row.round1_task;
            if (t && t.id) {
              taskCounts[t.id] = (taskCounts[t.id] || 0) + 1;
            }
          }
        }
      } catch { }
    } else {
      for (const p of memoryParticipants) {
        if (p.round1Task && p.round1Task.id) {
          taskCounts[p.round1Task.id] = (taskCounts[p.round1Task.id] || 0) + 1;
        }
      }
    }

    // 3. Filter tasks with count < 4 (max capacity = 4)
    let availableTasks = ROUND1_TASKS.filter(t => (taskCounts[t.id] || 0) < 4);

    // Fallback: If all 30 tasks reach capacity, pick tasks with lowest count
    if (availableTasks.length === 0) {
      const minCount = Math.min(...Object.values(taskCounts));
      availableTasks = ROUND1_TASKS.filter(t => (taskCounts[t.id] || 0) === minCount);
    }

    // 4. Randomly pick one task from available pool
    const chosenTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];

    // 5. Store in DB row for this participant
    if (supabase) {
      const { error } = await supabase
        .from('participants')
        .update({ round1_task: chosenTask })
        .eq('id', participant.id);

      if (error) {
        console.warn('Supabase round1_task update warning:', error.message);
      }
    }

    // Always update in-memory object on req.participant and task map
    round1TaskMap.set(participant.id, chosenTask);
    participant.round1Task = chosenTask;
    const foundMem = memoryParticipants.find(p => p.id === participant.id);
    if (foundMem) {
      foundMem.round1Task = chosenTask;
    }

    res.json({
      success: true,
      task: chosenTask,
      isAlreadyAssigned: false
    });
  } catch (err: any) {
    console.error('Error drawing Round 1 task:', err);
    res.status(500).json({ error: 'Failed to draw Round 1 task' });
  }
});

// ------------------- ROUND 2 RANDOM SCENARIO DRAW ENDPOINTS -------------------
const round2TaskMap = new Map<string, Round2Task>();

app.get('/api/round2/my-task', requireParticipant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const participant = req.participant!;
    const task = participant.round2Task || round2TaskMap.get(participant.id) || null;

    res.json({
      success: true,
      task,
      isAssigned: Boolean(task)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve Round 2 task' });
  }
});

app.post('/api/round2/draw-task', requireParticipant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const participant = req.participant!;
    const existingTask = participant.round2Task || round2TaskMap.get(participant.id);

    // 1. If participant already has an assigned task, return it (1 chance only!)
    if (existingTask) {
      res.json({
        success: true,
        task: existingTask,
        isAlreadyAssigned: true
      });
      return;
    }

    // 2. Enforce Round 2 Top 30 Cutoff check
    let allR1Parts: { id: string; round1Score: number }[] = [];
    if (supabase) {
      const { data } = await supabase.from('participants').select('id, round1_score');
      if (data) allR1Parts = data.map(d => ({ id: d.id, round1Score: Number(d.round1_score) || 0 }));
    } else {
      allR1Parts = memoryParticipants.map(p => ({ id: p.id, round1Score: p.round1Score || 0 }));
    }
    const participantR1Score = allR1Parts.find(p => p.id === participant.id)?.round1Score || 0;
    const higherCountR1 = allR1Parts.filter(p => p.round1Score > participantR1Score).length;
    const r1Rank = higherCountR1 + 1;
    if (r1Rank > 30) {
      res.status(403).json({
        error: `Round 2 Qualification Cutoff: Only the Top 30 ranks from Round 01 qualify for Round 02. Your Round 01 rank is #${r1Rank}.`
      });
      return;
    }

    // 3. Fetch all current task assignments to enforce "at most 3 participants per scenario" (1 in 3 participants)
    const taskCounts: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) {
      taskCounts[i] = 0;
    }

    for (const t of round2TaskMap.values()) {
      if (t && t.id) {
        taskCounts[t.id] = (taskCounts[t.id] || 0) + 1;
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('participants').select('round2_task').not('round2_task', 'is', null);
        if (!error && data) {
          for (const row of data) {
            const t = typeof row.round2_task === 'string' ? JSON.parse(row.round2_task) : row.round2_task;
            if (t && t.id) {
              taskCounts[t.id] = (taskCounts[t.id] || 0) + 1;
            }
          }
        }
      } catch { }
    } else {
      for (const p of memoryParticipants) {
        if (p.round2Task && p.round2Task.id) {
          taskCounts[p.round2Task.id] = (taskCounts[p.round2Task.id] || 0) + 1;
        }
      }
    }

    // 4. Filter scenarios with count < 3 (30 participants / 10 scenarios = 3 per scenario)
    let availableTasks = ROUND2_TASKS.filter(t => (taskCounts[t.id] || 0) < 3);

    // Fallback: If all 10 tasks reach capacity, pick scenarios with lowest count
    if (availableTasks.length === 0) {
      const minCount = Math.min(...Object.values(taskCounts));
      availableTasks = ROUND2_TASKS.filter(t => (taskCounts[t.id] || 0) === minCount);
    }

    // 5. Randomly pick one scenario from available pool
    const chosenTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];

    // 6. Store in DB row for this participant
    if (supabase) {
      const { error } = await supabase
        .from('participants')
        .update({ round2_task: chosenTask })
        .eq('id', participant.id);

      if (error) {
        console.error(`❌ Failed to update round2_task in Supabase for participant ${participant.id} (${participant.registrationId}):`, error.message);
      } else {
        console.log(`✓ Stored Round 2 task in Supabase DB for participant ${participant.registrationId}`);
      }
    }

    // Always update in-memory object on req.participant and task map
    round2TaskMap.set(participant.id, chosenTask);
    participant.round2Task = chosenTask;
    const foundMem = memoryParticipants.find(p => p.id === participant.id);
    if (foundMem) {
      foundMem.round2Task = chosenTask;
    }

    res.json({
      success: true,
      task: chosenTask,
      isAlreadyAssigned: false
    });
  } catch (err: any) {
    console.error('Error drawing Round 2 task:', err);
    res.status(500).json({ error: 'Failed to draw Round 2 scenario task' });
  }
});

// ------------------- ROUND 3 RANDOM PROBLEM STATEMENT DRAW ENDPOINTS -------------------
const round3TaskMap = new Map<string, Round3Task>();

app.get('/api/round3/my-task', requireParticipant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const participant = req.participant!;
    const task = participant.round3Task || round3TaskMap.get(participant.id) || null;

    res.json({
      success: true,
      task,
      isAssigned: Boolean(task)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve Round 3 task' });
  }
});

app.post('/api/round3/draw-task', requireParticipant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const participant = req.participant!;
    const existingTask = participant.round3Task || round3TaskMap.get(participant.id);

    // 1. If participant already has an assigned task, return it (1 chance only!)
    if (existingTask) {
      res.json({
        success: true,
        task: existingTask,
        isAlreadyAssigned: true
      });
      return;
    }

    // 2. Enforce Round 3 Top 10 Cutoff check
    let allR2Parts: { id: string; round2Score: number }[] = [];
    if (supabase) {
      const { data } = await supabase.from('participants').select('id, round2_score');
      if (data) allR2Parts = data.map(d => ({ id: d.id, round2Score: Number(d.round2_score) || 0 }));
    } else {
      allR2Parts = memoryParticipants.map(p => ({ id: p.id, round2Score: p.round2Score || 0 }));
    }
    const participantR2Score = allR2Parts.find(p => p.id === participant.id)?.round2Score || 0;
    const higherCountR2 = allR2Parts.filter(p => p.round2Score > participantR2Score).length;
    const r2Rank = higherCountR2 + 1;
    if (r2Rank > 10) {
      res.status(403).json({
        error: `Round 3 Qualification Cutoff: Only the Top 10 ranks from Round 02 qualify for Round 03 Finale. Your Round 02 rank is #${r2Rank}.`
      });
      return;
    }

    // 3. Fetch all current task assignments to enforce 50/50 distribution (5 participants per PS for 10 finalists)
    const taskCounts: Record<number, number> = { 1: 0, 2: 0 };

    for (const t of round3TaskMap.values()) {
      if (t && t.id) {
        taskCounts[t.id] = (taskCounts[t.id] || 0) + 1;
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('participants').select('round3_task').not('round3_task', 'is', null);
        if (!error && data) {
          for (const row of data) {
            const t = typeof row.round3_task === 'string' ? JSON.parse(row.round3_task) : row.round3_task;
            if (t && t.id) {
              taskCounts[t.id] = (taskCounts[t.id] || 0) + 1;
            }
          }
        }
      } catch { }
    } else {
      for (const p of memoryParticipants) {
        if (p.round3Task && p.round3Task.id) {
          taskCounts[p.round3Task.id] = (taskCounts[p.round3Task.id] || 0) + 1;
        }
      }
    }

    // 4. Filter problem statements with count < 5 (5 per PS max)
    let availableTasks = ROUND3_TASKS.filter(t => (taskCounts[t.id] || 0) < 5);

    // Fallback: If both reach capacity or edge case, pick PS with lowest count
    if (availableTasks.length === 0) {
      const minCount = Math.min(...Object.values(taskCounts));
      availableTasks = ROUND3_TASKS.filter(t => (taskCounts[t.id] || 0) === minCount);
    }

    // 5. Randomly pick one PS from available pool
    const chosenTask = availableTasks[Math.floor(Math.random() * availableTasks.length)];

    // 6. Store in DB row for this participant
    if (supabase) {
      const { error } = await supabase
        .from('participants')
        .update({ round3_task: chosenTask })
        .eq('id', participant.id);

      if (error) {
        console.error(`❌ Failed to update round3_task in Supabase for participant ${participant.id} (${participant.registrationId}):`, error.message);
      } else {
        console.log(`✓ Stored Round 3 task in Supabase DB for participant ${participant.registrationId}`);
      }
    }

    // Always update in-memory object on req.participant and task map
    round3TaskMap.set(participant.id, chosenTask);
    participant.round3Task = chosenTask;
    const foundMem = memoryParticipants.find(p => p.id === participant.id);
    if (foundMem) {
      foundMem.round3Task = chosenTask;
    }

    res.json({
      success: true,
      task: chosenTask,
      isAlreadyAssigned: false
    });
  } catch (err: any) {
    console.error('Error drawing Round 3 task:', err);
    res.status(500).json({ error: 'Failed to draw Round 3 problem statement task' });
  }
});

// 2. Admin Auth
app.post('/api/admin/login', authLimiter, async (req: Request, res: Response) => {
  const { passcode } = req.body;
  if (!passcode || String(passcode).trim() !== ADMIN_PASSCODE) {
    res.status(401).json({ error: 'Invalid admin passcode' });
    return;
  }

  const token = await new SignJWT({ isAdmin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('12h')
    .sign(ADMIN_SESSION_SECRET_KEY);

  res.cookie('pw_admin_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000
  });

  res.json({ success: true, isAdmin: true });
});

app.get('/api/admin/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies.pw_admin_session;
    if (!token) {
      res.status(401).json({ isAdmin: false });
      return;
    }
    await jwtVerify(token, ADMIN_SESSION_SECRET_KEY);
    res.json({ isAdmin: true });
  } catch {
    res.status(401).json({ isAdmin: false });
  }
});

app.post('/api/admin/logout', (_req: Request, res: Response) => {
  res.clearCookie('pw_admin_session');
  res.json({ success: true });
});

// 3. Prompt Analysis (Rate Limited)
app.post('/api/check-prompt', geminiLimiter, async (req: Request, res: Response) => {
  try {
    const { promptText } = req.body;
    if (!promptText || typeof promptText !== 'string') {
      res.status(400).json({ error: 'Missing promptText' });
      return;
    }

    const result = await evaluatePromptWithGemini(promptText);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to analyze prompt' });
  }
});

// 4. Event State (GET public, POST requireAdmin)
app.get('/api/event-state', async (_req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('event_state').select('*').eq('id', 1).maybeSingle();
      if (!error && data) {
        eventState = {
          activeRound: data.active_round as 1 | 2 | 3,
          timerSecondsRemaining: data.timer_seconds_remaining,
          isTimerRunning: data.is_timer_running,
          currentThemeRound1: data.current_theme_round1,
          scenarioChitsRound2: data.scenario_chits_round2 || eventState.scenarioChitsRound2,
          productRequirementsRound3: data.product_requirements_round3 || eventState.productRequirementsRound3,
          announcements: data.announcements || eventState.announcements,
          isLeaderboardPublished: data.is_leaderboard_published !== undefined ? data.is_leaderboard_published : eventState.isLeaderboardPublished,
          publishedRounds: data.published_rounds || eventState.publishedRounds,
          isRoundActive: data.is_round_active !== undefined ? data.is_round_active : eventState.isRoundActive,
          roundStatuses: data.round_statuses || eventState.roundStatuses
        };
      }
    } catch (err) {
      console.warn('Supabase event_state fetch error:', err);
    }
  }

  res.json(eventState);
});

app.post('/api/event-state', requireAdmin, async (req: Request, res: Response) => {
  const updates = req.body;
  eventState = { ...eventState, ...updates };

  if (supabase) {
    try {
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.activeRound !== undefined) payload.active_round = updates.activeRound;
      if (updates.timerSecondsRemaining !== undefined) payload.timer_seconds_remaining = updates.timerSecondsRemaining;
      if (updates.isTimerRunning !== undefined) payload.is_timer_running = updates.isTimerRunning;
      if (updates.currentThemeRound1 !== undefined) payload.current_theme_round1 = updates.currentThemeRound1;
      if (updates.announcements !== undefined) payload.announcements = updates.announcements;
      if (updates.isLeaderboardPublished !== undefined) payload.is_leaderboard_published = updates.isLeaderboardPublished;
      if (updates.publishedRounds !== undefined) payload.published_rounds = updates.publishedRounds;
      if (updates.isRoundActive !== undefined) payload.is_round_active = updates.isRoundActive;
      if (updates.roundStatuses !== undefined) payload.round_statuses = updates.roundStatuses;

      await supabase.from('event_state').update(payload).eq('id', 1);
    } catch (err) {
      console.warn('Supabase update event_state error:', err);
    }
  }

  res.json({ success: true, eventState });
});

// 5. Submissions Endpoints

// GET /api/submissions/mine (Participant's own submissions)
app.get('/api/submissions/mine', requireParticipant, async (req: AuthenticatedRequest, res: Response) => {
  const participant = req.participant!;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('participant_id', participant.id)
        .order('round_id', { ascending: true });

      if (!error && data) {
        return res.json(data.map(mapSubmissionFromDb));
      }
    } catch (err) {
      console.warn('Supabase submissions/mine error:', err);
    }
  }

  const userSubs = memorySubmissions.filter(s => s.participantId === participant.id);
  res.json(userSubs);
});

// GET /api/submissions (Admin only)
app.get('/api/submissions', requireAdmin, async (req: Request, res: Response) => {
  const { round, status, participantId } = req.query;

  if (supabase) {
    try {
      let query = supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
      if (round) query = query.eq('round_id', parseInt(round as string, 10));
      if (status) query = query.eq('status', status as string);
      if (participantId) query = query.eq('participant_id', participantId as string);

      const { data, error } = await query;
      if (!error && data) return res.json(data.map(mapSubmissionFromDb));
    } catch (err) {
      console.warn('Supabase submissions query error:', err);
    }
  }

  let filtered = [...memorySubmissions];
  if (round) filtered = filtered.filter(s => s.roundId === parseInt(round as string, 10));
  if (status) filtered = filtered.filter(s => s.status === status);
  if (participantId) filtered = filtered.filter(s => s.participantId === participantId);

  filtered.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  res.json(filtered);
});

// POST /api/submissions (Participant submit route)
app.post('/api/submissions', requireParticipant, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const participant = req.participant!;
    const {
      roundId,
      assignedThemeOrChit,
      promptText,
      aiToolUsed,
      generatedOutputSummary,
      screenshotUrl,
      demoUrl,
      repoUrl
    } = req.body;

    const requestedRound = Number(roundId) as 1 | 2 | 3;

    if (!requestedRound || !promptText || !assignedThemeOrChit) {
      res.status(400).json({ error: 'Missing required submission fields (roundId, promptText, assignedThemeOrChit)' });
      return;
    }

    // 1. Enforce active round & round started status
    const roundStatuses = eventState.roundStatuses || { round1: true, round2: false, round3: false };
    const isRoundStarted = roundStatuses[`round${requestedRound}` as keyof typeof roundStatuses];

    if (isRoundStarted === false) {
      res.status(400).json({ error: `Round 0${requestedRound} is currently STOPPED by competition referees. Submissions are closed.` });
      return;
    }

    // 2. Prerequisite checks & Qualification Cutoff enforcement
    if (requestedRound === 2) {
      let r1Sub = false;
      if (supabase) {
        const { data } = await supabase.from('submissions').select('id').eq('participant_id', participant.id).eq('round_id', 1).maybeSingle();
        if (data) r1Sub = true;
      } else {
        r1Sub = memorySubmissions.some(s => s.participantId === participant.id && s.roundId === 1);
      }
      if (!r1Sub) {
        res.status(400).json({ error: 'Prerequisite missing: You must complete Round 01 submission before entering Round 02.' });
        return;
      }

      // Qualification Cutoff: Top 30 ranks from Round 1 qualify for Round 2
      let allR1Parts: { id: string; round1Score: number }[] = [];
      if (supabase) {
        const { data } = await supabase.from('participants').select('id, round1_score');
        if (data) allR1Parts = data.map(d => ({ id: d.id, round1Score: Number(d.round1_score) || 0 }));
      } else {
        allR1Parts = memoryParticipants.map(p => ({ id: p.id, round1Score: p.round1Score || 0 }));
      }

      const participantR1Score = allR1Parts.find(p => p.id === participant.id)?.round1Score || 0;
      // Standard competition rank: 1 + number of participants with strictly higher score
      const higherCountR1 = allR1Parts.filter(p => p.round1Score > participantR1Score).length;
      const r1Rank = higherCountR1 + 1;

      if (r1Rank > 30) {
        res.status(403).json({
          error: `Round 2 Qualification Cutoff: Only the Top 30 ranks from Round 01 qualify for Round 02. Your Round 01 rank is #${r1Rank}.`
        });
        return;
      }
    } else if (requestedRound === 3) {
      let r1Sub = false;
      let r2Sub = false;
      if (supabase) {
        const { data: d1 } = await supabase.from('submissions').select('id').eq('participant_id', participant.id).eq('round_id', 1).maybeSingle();
        const { data: d2 } = await supabase.from('submissions').select('id').eq('participant_id', participant.id).eq('round_id', 2).maybeSingle();
        if (d1) r1Sub = true;
        if (d2) r2Sub = true;
      } else {
        r1Sub = memorySubmissions.some(s => s.participantId === participant.id && s.roundId === 1);
        r2Sub = memorySubmissions.some(s => s.participantId === participant.id && s.roundId === 2);
      }
      if (!r1Sub || !r2Sub) {
        res.status(400).json({ error: 'Prerequisite missing: You must complete Round 01 and Round 02 submissions before entering Round 03.' });
        return;
      }

      // Qualification Cutoff: Top 10 ranks from Round 2 qualify for Round 3 Finale
      let allR2Parts: { id: string; round2Score: number }[] = [];
      if (supabase) {
        const { data } = await supabase.from('participants').select('id, round2_score');
        if (data) allR2Parts = data.map(d => ({ id: d.id, round2Score: Number(d.round2_score) || 0 }));
      } else {
        allR2Parts = memoryParticipants.map(p => ({ id: p.id, round2Score: p.round2Score || 0 }));
      }

      const participantR2Score = allR2Parts.find(p => p.id === participant.id)?.round2Score || 0;
      // Standard competition rank: 1 + number of participants with strictly higher score
      const higherCountR2 = allR2Parts.filter(p => p.round2Score > participantR2Score).length;
      const r2Rank = higherCountR2 + 1;

      if (r2Rank > 10) {
        res.status(403).json({
          error: `Round 3 Qualification Cutoff: Only the Top 10 ranks from Round 02 qualify for Round 03 Finale. Your Round 02 rank is #${r2Rank}.`
        });
        return;
      }
    }

    if (requestedRound !== eventState.activeRound) {
      res.status(400).json({ error: `Submissions are currently only accepted for active Round 0${eventState.activeRound}` });
      return;
    }



    // 3. Duplicate check for this participant and round
    if (supabase) {
      const { data: existing, error: existingErr } = await supabase
        .from('submissions')
        .select('id')
        .eq('participant_id', participant.id)
        .eq('round_id', requestedRound)
        .maybeSingle();

      if (!existingErr && existing) {
        res.status(409).json({ error: `You have already submitted an entry for Round 0${requestedRound}. Only one submission per round is allowed.` });
        return;
      }
    } else {
      const existing = memorySubmissions.find(s => s.participantId === participant.id && s.roundId === requestedRound);
      if (existing) {
        res.status(409).json({ error: `You have already submitted an entry for Round 0${requestedRound}. Only one submission per round is allowed.` });
        return;
      }
    }

    const subId = `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Upload screenshot to Supabase Storage if Base64
    let finalScreenshotUrl = screenshotUrl;
    if (screenshotUrl && screenshotUrl.startsWith('data:image/')) {
      finalScreenshotUrl = await uploadScreenshotToStorage(screenshotUrl, subId);
    }

    const authenticity = await evaluatePromptWithGemini(promptText);

    const newSubmission: Submission = {
      id: subId,
      roundId: requestedRound,
      participantId: participant.id,
      participantName: participant.name,
      college: participant.college || 'Participant Institute',
      registrationId: participant.registrationId,
      email: participant.email,
      assignedThemeOrChit: assignedThemeOrChit || 'Open Challenge Theme',
      promptText,
      aiToolUsed: aiToolUsed || 'Permitted AI Suite',
      generatedOutputSummary,
      screenshotUrl: finalScreenshotUrl,
      demoUrl,
      repoUrl,
      authenticity,
      status: authenticity.isAiGenerated ? 'flagged_ai' : 'pending',
      submittedAt: new Date().toISOString()
    };

    if (supabase) {
      const { error: subErr } = await supabase.from('submissions').insert({
        id: newSubmission.id,
        round_id: newSubmission.roundId,
        participant_id: participant.id,
        participant_name: participant.name,
        college: participant.college,
        registration_id: participant.registrationId,
        email: participant.email,
        assigned_theme_or_chit: newSubmission.assignedThemeOrChit,
        prompt_text: newSubmission.promptText,
        ai_tool_used: newSubmission.aiToolUsed,
        generated_output_summary: newSubmission.generatedOutputSummary,
        screenshot_url: newSubmission.screenshotUrl,
        demo_url: newSubmission.demoUrl,
        repo_url: newSubmission.repoUrl,
        authenticity: newSubmission.authenticity,
        status: newSubmission.status,
        submitted_at: newSubmission.submittedAt
      });

      if (subErr) {
        if (subErr.code === '23505') {
          res.status(409).json({ error: `You have already submitted an entry for Round 0${requestedRound}.` });
          return;
        }
        throw new Error(subErr.message);
      }

      // Update participant submissions count & authenticity bonus in Supabase
      const newSubCount = participant.submissionsCount + 1;
      const bonusEarned = calculateAuthenticityBonus(authenticity.authenticityScore);
      const newBonusTotal = participant.authenticityBonusTotal + bonusEarned;
      const partUpdates: any = {
        submissions_count: newSubCount,
        authenticity_bonus_total: newBonusTotal,
        updated_at: new Date().toISOString()
      };
      if (requestedRound === 1 && !participant.round1Task) {
        partUpdates.round1_task = { title: assignedThemeOrChit, brief: assignedThemeOrChit };
      }
      if (requestedRound === 2 && !participant.round2Task) {
        partUpdates.round2_task = { title: 'Assigned Scenario Sprint', scenario: assignedThemeOrChit };
      }
      if (requestedRound === 3 && !participant.round3Task) {
        partUpdates.round3_task = { title: 'Assigned Problem Statement', problemStatement: assignedThemeOrChit };
      }
      await supabase.from('participants').update(partUpdates).eq('id', participant.id);
    } else {
      memorySubmissions.unshift(newSubmission);
      participant.submissionsCount += 1;
      participant.authenticityBonusTotal += calculateAuthenticityBonus(authenticity.authenticityScore);
      if (requestedRound === 1 && !participant.round1Task) {
        participant.round1Task = { id: 1, category: 'General', title: assignedThemeOrChit, brief: assignedThemeOrChit };
      }
      if (requestedRound === 2 && !participant.round2Task) {
        participant.round2Task = { id: 1, title: 'Assigned Scenario Sprint', scenario: assignedThemeOrChit };
      }
      if (requestedRound === 3 && !participant.round3Task) {
        participant.round3Task = { id: 1, title: 'Assigned Problem Statement', problemStatement: assignedThemeOrChit, category: 'Web Application', theme: 'Grand Finale', mandatoryFeatures: [] };
      }
    }

    res.status(201).json({
      success: true,
      submission: newSubmission
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to process submission' });
  }
});

async function saveAndApplySubmissionScores(sub: Submission, scores: SubmissionScores): Promise<Submission> {
  sub.scores = scores;
  sub.status = 'evaluated';

  if (supabase) {
    await supabase.from('submissions').update({
      scores: sub.scores,
      status: 'evaluated'
    }).eq('id', sub.id);

    // Fetch participant to update aggregate score
    const { data: partData } = await supabase.from('participants').select('*').eq('id', sub.participantId).single();
    if (partData) {
      const participant = mapParticipantFromDb(partData);
      if (sub.roundId === 1) participant.round1Score = scores.totalScore;
      if (sub.roundId === 2) participant.round2Score = scores.totalScore;
      if (sub.roundId === 3) participant.round3Score = scores.totalScore;

      // Recalculate participant authenticity bonus total from all evaluated submissions
      const { data: allSubs } = await supabase.from('submissions').select('scores, authenticity').eq('participant_id', participant.id);
      let totalBonus = 0;
      if (allSubs) {
        for (const s of allSubs) {
          if (s.scores && typeof s.scores.authenticityBonus === 'number') {
            totalBonus += s.scores.authenticityBonus;
          } else if (s.authenticity && typeof s.authenticity.authenticityScore === 'number') {
            totalBonus += calculateAuthenticityBonus(s.authenticity.authenticityScore);
          }
        }
      }
      participant.authenticityBonusTotal = totalBonus;

      participant.totalScore = participant.round1Score + participant.round2Score + participant.round3Score;
      if (participant.round3Score > 0) participant.status = 'champion';
      else if (participant.round2Score > 0) participant.status = 'qualified_r3';
      else if (participant.round1Score > 0) participant.status = 'qualified_r2';

      await supabase.from('participants').update({
        round1_score: participant.round1Score,
        round2_score: participant.round2Score,
        round3_score: participant.round3Score,
        authenticity_bonus_total: participant.authenticityBonusTotal,
        total_score: participant.totalScore,
        status: participant.status,
        updated_at: new Date().toISOString()
      }).eq('id', participant.id);
    }
  } else {
    const participant = memoryParticipants.find(p => p.id === sub.participantId);
    if (participant) {
      if (sub.roundId === 1) participant.round1Score = scores.totalScore;
      if (sub.roundId === 2) participant.round2Score = scores.totalScore;
      if (sub.roundId === 3) participant.round3Score = scores.totalScore;

      const userSubs = memorySubmissions.filter(s => s.participantId === participant.id);
      let totalBonus = 0;
      for (const s of userSubs) {
        if (s.scores && typeof s.scores.authenticityBonus === 'number') {
          totalBonus += s.scores.authenticityBonus;
        } else if (s.authenticity && typeof s.authenticity.authenticityScore === 'number') {
          totalBonus += calculateAuthenticityBonus(s.authenticity.authenticityScore);
        }
      }
      participant.authenticityBonusTotal = totalBonus;
      participant.totalScore = participant.round1Score + participant.round2Score + participant.round3Score;
      memoryParticipants.sort((a, b) => b.totalScore - a.totalScore);
      memoryParticipants.forEach((p, idx) => { p.rank = idx + 1; });
    }
  }

  return sub;
}

// PATCH /api/submissions/:id/grade (Require Admin)
app.patch('/api/submissions/:id/grade', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { promptQuality, outputRelevance, creativity, technicalExecution, feedback, gradedBy } = req.body;

    let sub: Submission | null = null;

    if (supabase) {
      const { data, error } = await supabase.from('submissions').select('*').eq('id', id).single();
      if (!error && data) {
        sub = mapSubmissionFromDb(data);
      }
    } else {
      sub = memorySubmissions.find(s => s.id === id) || null;
    }

    if (!sub) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const authenticityBonus = calculateAuthenticityBonus(sub.authenticity.authenticityScore);
    const totalScore = Math.min(100,
      (Number(promptQuality) || 0) +
      (Number(outputRelevance) || 0) +
      (Number(creativity) || 0) +
      (Number(technicalExecution) || 0) +
      authenticityBonus
    );

    const scores: SubmissionScores = {
      promptQuality: Number(promptQuality) || 0,
      outputRelevance: Number(outputRelevance) || 0,
      creativity: Number(creativity) || 0,
      technicalExecution: Number(technicalExecution) || 0,
      authenticityBonus,
      totalScore,
      gradedBy: gradedBy || 'Panel Judge',
      feedback: feedback || '',
      gradedAt: new Date().toISOString()
    };

    const updatedSub = await saveAndApplySubmissionScores(sub, scores);
    res.json({ success: true, submission: updatedSub });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to grade submission' });
  }
});

// POST /api/submissions/:id/ai-grade (Require Admin - Gemini AI Multimodal Grade Single Submission)
app.post('/api/submissions/:id/ai-grade', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let sub: Submission | null = null;

    if (supabase) {
      const { data, error } = await supabase.from('submissions').select('*').eq('id', id).single();
      if (!error && data) {
        sub = mapSubmissionFromDb(data);
      }
    } else {
      sub = memorySubmissions.find(s => s.id === id) || null;
    }

    if (!sub) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const aiScores = await evaluateSubmissionWithGeminiMultimodal(sub);
    const updatedSub = await saveAndApplySubmissionScores(sub, aiScores);

    res.json({
      success: true,
      submission: updatedSub,
      scores: aiScores
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Gemini AI evaluation failed' });
  }
});

// Generic Batch Autograde Handler for any Round (1, 2, or 3)
async function autoGradeRoundBatch(roundId: 1 | 2 | 3) {
  let pendingSubs: Submission[] = [];

  if (supabase) {
    const { data, error } = await supabase.from('submissions').select('*').eq('round_id', roundId);
    if (!error && data) {
      pendingSubs = data.map(mapSubmissionFromDb);
    }
  } else {
    pendingSubs = memorySubmissions.filter(s => s.roundId === roundId);
  }

  if (pendingSubs.length === 0) {
    return {
      success: true,
      gradedCount: 0,
      message: `No Round 0${roundId} submissions found to grade.`
    };
  }

  // Process all pending submissions concurrently
  const gradedResults = await Promise.all(
    pendingSubs.map(async (sub) => {
      const aiScores = await evaluateSubmissionWithGeminiMultimodal(sub);
      await saveAndApplySubmissionScores(sub, aiScores);
      return sub;
    })
  );

  // Automatically publish the autograded round on leaderboard
  if (roundId === 1) eventState.publishedRounds.round1 = true;
  if (roundId === 2) eventState.publishedRounds.round2 = true;
  if (roundId === 3) eventState.publishedRounds.round3 = true;

  if (supabase) {
    await supabase.from('event_state').update({
      published_rounds: eventState.publishedRounds,
      updated_at: new Date().toISOString()
    }).eq('id', 1);
  }

  return {
    success: true,
    gradedCount: gradedResults.length,
    message: `Successfully evaluated ${gradedResults.length} Round 0${roundId} submissions with Gemini AI and updated Round 0${roundId} leaderboard!`
  };
}

// POST /api/admin/auto-grade-round1 (Require Admin - Batch Autograde Round 1 & Update Leaderboard)
app.post('/api/admin/auto-grade-round1', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await autoGradeRoundBatch(1);
    res.json(result);
  } catch (err: any) {
    console.error('Auto-grade Round 1 error:', err);
    res.status(500).json({ error: err?.message || 'Batch autograding failed for Round 1' });
  }
});

// POST /api/admin/auto-grade-round2 (Require Admin - Batch Autograde Round 2 & Update Leaderboard)
app.post('/api/admin/auto-grade-round2', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await autoGradeRoundBatch(2);
    res.json(result);
  } catch (err: any) {
    console.error('Auto-grade Round 2 error:', err);
    res.status(500).json({ error: err?.message || 'Batch autograding failed for Round 2' });
  }
});

// POST /api/admin/auto-grade-round3 (Require Admin - Batch Autograde Round 3 & Update Leaderboard)
app.post('/api/admin/auto-grade-round3', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await autoGradeRoundBatch(3);
    res.json(result);
  } catch (err: any) {
    console.error('Auto-grade Round 3 error:', err);
    res.status(500).json({ error: err?.message || 'Batch autograding failed for Round 3' });
  }
});

// POST /api/admin/auto-grade (Require Admin - Generic Batch Autograde)
app.post('/api/admin/auto-grade', requireAdmin, async (req: Request, res: Response) => {
  try {
    const roundId = (Number(req.body?.roundId || req.query?.round) || 1) as 1 | 2 | 3;
    const result = await autoGradeRoundBatch(roundId);
    res.json(result);
  } catch (err: any) {
    console.error('Auto-grade error:', err);
    res.status(500).json({ error: err?.message || 'Batch autograding failed' });
  }
});

// 6. Public Leaderboard
app.get('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const roundParam = req.query.round ? String(req.query.round).toLowerCase() : '1';
    const adminToken = req.cookies.pw_admin_session;
    let isAdmin = false;
    if (adminToken) {
      try {
        await jwtVerify(adminToken, ADMIN_SESSION_SECRET_KEY);
        isAdmin = true;
      } catch { }
    }

    let rawParticipants: Participant[] = [];

    if (supabase) {
      const { data, error } = await supabase.from('participants').select('*').order('total_score', { ascending: false });
      if (!error && data) {
        rawParticipants = data.map(mapParticipantFromDb);
      }
    } else {
      rawParticipants = [...memoryParticipants];
    }

    // Refresh eventState
    if (supabase) {
      const { data: stData } = await supabase.from('event_state').select('*').eq('id', 1).maybeSingle();
      if (stData) {
        eventState.isLeaderboardPublished = Boolean(stData.is_leaderboard_published);
        eventState.publishedRounds = stData.published_rounds || eventState.publishedRounds;
      }
    }

    const { isLeaderboardPublished, publishedRounds } = eventState;

    // Standard competition ranking (1224 ranking with ties)
    const computeRanks = (list: Participant[], scoreKey: 'round1Score' | 'round2Score' | 'round3Score' | 'totalScore') => {
      const sorted = [...list].sort((a, b) => b[scoreKey] - a[scoreKey]);
      const rankMap = new Map<string, number>();
      let currentRank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i][scoreKey] < sorted[i - 1][scoreKey]) {
          currentRank = i + 1;
        }
        rankMap.set(sorted[i].id, currentRank);
      }
      return rankMap;
    };

    const r1RankMap = computeRanks(rawParticipants, 'round1Score');
    const r2RankMap = computeRanks(rawParticipants, 'round2Score');
    const r3RankMap = computeRanks(rawParticipants, 'round3Score');

    const sanitized = rawParticipants.map(p => {
      const r1Score = Number(p.round1Score || 0);
      const r2Score = Number(p.round2Score || 0);
      const r3Score = Number(p.round3Score || 0);
      const totalScore = r1Score + r2Score + r3Score;

      const r1Rank = r1RankMap.get(p.id) || 1;
      const r2Rank = r2RankMap.get(p.id) || 1;
      const r3Rank = r3RankMap.get(p.id) || 1;

      // Top 30 from Round 1 qualify for Round 2; Top 10 from Round 2 qualify for Round 3
      const isQualifiedR2 = r1Rank <= 30;
      const isQualifiedR3 = r2Rank <= 10;

      return {
        id: p.id,
        name: p.name,
        college: p.college,
        avatar: p.avatar,
        registrationId: (isLeaderboardPublished || isAdmin) ? p.registrationId : undefined,
        round1Score: r1Score,
        round2Score: r2Score,
        round3Score: r3Score,
        authenticityBonusTotal: p.authenticityBonusTotal,
        totalScore,
        rank: p.rank,
        round1Rank: r1Rank,
        round2Rank: r2Rank,
        round3Rank: r3Rank,
        isQualifiedR2,
        isQualifiedR3,
        status: p.status,
        submissionsCount: p.submissionsCount
      };
    });

    // Filter and sort depending on requested round filter (only include evaluated participants with score > 0)
    let result = sanitized;
    if (roundParam === '1') {
      result = sanitized.filter(p => Number(p.round1Score || 0) > 0);
      result.sort((a, b) => b.round1Score - a.round1Score);
      result.forEach((p, idx) => { p.rank = idx + 1; p.round1Rank = idx + 1; });
    } else if (roundParam === '2') {
      result = sanitized.filter(p => Number(p.round2Score || 0) > 0);
      result.sort((a, b) => b.round2Score - a.round2Score);
      result.forEach((p, idx) => { p.rank = idx + 1; p.round2Rank = idx + 1; });
    } else if (roundParam === '3') {
      result = sanitized.filter(p => Number(p.round3Score || 0) > 0);
      result.sort((a, b) => b.round3Score - a.round3Score);
      result.forEach((p, idx) => { p.rank = idx + 1; p.round3Rank = idx + 1; });
    } else {
      result.sort((a, b) => b.totalScore - a.totalScore);
      let cur = 1;
      result.forEach((p, idx) => {
        if (idx > 0 && p.totalScore < result[idx - 1].totalScore) cur = idx + 1;
        p.rank = cur;
      });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate leaderboard' });
  }
});

// 7. Seed Reset (Non-prod & Admin required)
app.post('/api/seed-reset', requireAdmin, async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Database seed reset is disabled in production' });
    return;
  }

  memoryParticipants = [...INITIAL_PARTICIPANTS];
  memorySubmissions = [];
  eventState = { ...INITIAL_EVENT_STATE };

  if (supabase) {
    try {
      await supabase.from('submissions').delete().neq('id', 'keep-all');
      await supabase.from('participants').delete().neq('id', 'keep-all');

      const dbRows = INITIAL_PARTICIPANTS.map(p => ({
        id: p.id,
        registration_id: p.registrationId,
        name: p.name,
        college: p.college,
        email: p.email,
        avatar: p.avatar,
        status: p.status || 'active',
        submissions_count: 0,
        round1_score: 0,
        round2_score: 0,
        round3_score: 0,
        total_score: 0
      }));
      await supabase.from('participants').insert(dbRows);

      await supabase.from('event_state').update({
        active_round: 1,
        timer_seconds_remaining: 600,
        is_timer_running: true,
        is_leaderboard_published: false,
        published_rounds: { round1: false, round2: false, round3: false }
      }).eq('id', 1);
    } catch (err) {
      console.warn('Supabase reset error:', err);
    }
  }

  res.json({ success: true, message: 'Database reset cleanly to fresh 85-participant state' });
});

// ------------------- SERVER SETUP -------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Prompt Wars server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
export { app };
