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
  INITIAL_EVENT_STATE,
  ROUNDS_INFO
} from './src/data/mockData.ts';
import { Submission, Participant, EventState, PromptAuthenticityResult, SubmissionScores } from './src/types/index.ts';
import { ROUND1_TASKS, Round1Task } from './src/data/round1Tasks.ts';
import { ROUND2_TASKS, Round2Task } from './src/data/round2Tasks.ts';

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
let memoryParticipants: Participant[] = [];
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
    round2Task: row.round2_task ? (typeof row.round2_task === 'string' ? JSON.parse(row.round2_task) : row.round2_task) : null
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

const KNOWN_AI_CLICHES = [
  'masterpiece', '8k', 'photorealistic', 'hyperrealistic', 'ultra-realistic', 'octane render',
  'unreal engine', 'trending on artstation', 'cinematic lighting', 'volumetric lighting',
  'highly detailed', 'intricate detail', 'sharp focus', 'studio lighting', 'depth of field',
  'ray tracing', 'act as an expert', 'act as a senior', 'provide step-by-step', 'as an ai language model'
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

  const detectedMarkers: string[] = [];
  for (const phrase of KNOWN_AI_CLICHES) {
    const regex = new RegExp(`\\b${phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) detectedMarkers.push(phrase);
  }

  const words = clean.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const uniqueWords = new Set(words);
  const vocabularyDiversity = words.length > 0 ? Math.min(100, Math.round((uniqueWords.size / words.length) * 100)) : 50;

  const sentences = clean.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  let burstiness = 70;
  if (sentences.length > 1) {
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
    burstiness = Math.min(100, Math.round((Math.sqrt(variance) / (avg || 1)) * 50 + 40));
  }

  const clichéPenalty = Math.min(75, detectedMarkers.length * 15);
  let authenticityScore = Math.round(100 - clichéPenalty + (vocabularyDiversity * 0.1) + (burstiness * 0.1));
  authenticityScore = Math.max(12, Math.min(98, authenticityScore));

  const isAiGenerated = authenticityScore < 50;
  let verdict: 'Human Crafted (Self-Made)' | 'Likely AI Generated / Boilerplate' | 'Hybrid / AI-Assisted' = 'Human Crafted (Self-Made)';
  if (authenticityScore <= 45) verdict = 'Likely AI Generated / Boilerplate';
  else if (authenticityScore < 75) verdict = 'Hybrid / AI-Assisted';

  return {
    authenticityScore,
    isAiGenerated,
    aiProbability: parseFloat(((100 - authenticityScore) / 100).toFixed(2)),
    verdict,
    confidence: 88,
    metrics: { burstiness, entropyScore: 80, formulaicMarkersCount: detectedMarkers.length, vocabularyDiversity },
    detectedMarkers,
    flaggedPhrases: detectedMarkers,
    reasoning: `Authenticity calculated at ${authenticityScore}%. ${detectedMarkers.length} AI markers detected.`,
    improvementTips: detectedMarkers.length > 0 ? [`Remove formulaic words: ${detectedMarkers.slice(0, 2).join(', ')}.`] : ["Strong human-authored composition."],
    analyzedAt: new Date().toISOString()
  };
}

async function evaluatePromptWithGemini(promptText: string): Promise<PromptAuthenticityResult> {
  const heuristicResult = analyzePromptHeuristically(promptText);
  if (!geminiClient) return heuristicResult;

  try {
    const systemPrompt = `You are an AI referee for PROMPT WARS 2026. Respond ONLY in valid JSON:
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
      contents: `Analyze contestant prompt:\n"""\n${promptText}\n"""`,
      config: { systemInstruction: systemPrompt, responseMimeType: 'application/json' }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      authenticityScore: Math.round(parsed.authenticityScore ?? heuristicResult.authenticityScore),
      isAiGenerated: Boolean(parsed.isAiGenerated ?? heuristicResult.isAiGenerated),
      aiProbability: Number(parsed.aiProbability ?? heuristicResult.aiProbability),
      verdict: parsed.verdict || heuristicResult.verdict,
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
  const authenticityBonus = Math.min(10, Math.round(sub.authenticity.authenticityScore * 0.1));

  // Heuristic default scores as fallback
  const wordCount = sub.promptText.trim().split(/\s+/).length;
  const promptQuality = Math.min(25, Math.max(14, Math.round(15 + (wordCount / 10))));
  const outputRelevance = Math.min(25, Math.max(16, Math.round(18 + (sub.assignedThemeOrChit ? 4 : 0))));
  const creativity = Math.min(25, Math.max(15, Math.round(16 + (sub.authenticity.authenticityScore * 0.08))));
  const technicalExecution = 21;
  const totalScore = promptQuality + outputRelevance + creativity + technicalExecution + authenticityBonus;

  const fallbackScores: SubmissionScores = {
    promptQuality,
    outputRelevance,
    creativity,
    technicalExecution,
    authenticityBonus,
    totalScore,
    gradedBy: geminiClient ? 'Gemini 2.0 Flash AI Evaluator' : 'Heuristic Auto-Referee',
    feedback: sub.authenticity.isAiGenerated
      ? 'Evaluated entry. Prompt contains repetitive AI formulaic keywords. Originality bonus partial.'
      : `Evaluated entry. Strong prompt structure aligning well with task "${sub.assignedThemeOrChit.slice(0, 30)}...".`,
    gradedAt: new Date().toISOString()
  };

  if (!geminiClient) {
    return fallbackScores;
  }

  try {
    const systemPrompt = `You are the Official AI Lead Evaluator for PROMPT WARS 2026.
Grade the contestant's submission by evaluating how accurately and creatively their prompt addresses their assigned tournament task brief.

Rate the submission strictly in JSON format:
{
  "promptQuality": number (0-25),
  "outputRelevance": number (0-25),
  "creativity": number (0-25),
  "technicalExecution": number (0-25),
  "authenticityBonus": number (0-10),
  "totalScore": number (0-110),
  "feedback": string (2-3 sentences of concise, constructive critique on prompt engineering quality and alignment with the task)
}`;

    const promptText = `
EVALUATION REQUEST:
- Contestant Name: ${sub.participantName} (${sub.registrationId})
- Round: 0${sub.roundId}
- Assigned Task Brief: "${sub.assignedThemeOrChit}"
- Contestant's Exact Prompt: "${sub.promptText}"
- AI Tool Used: "${sub.aiToolUsed}"
- Output Summary: "${sub.generatedOutputSummary || 'None'}"

Evaluate prompt quality, prompt-to-task alignment, creativity, and technical execution. Do not analyze image files. Return JSON only.`;

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
    const tot = pq + oRel + cr + te + ab;

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
      } catch {}
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
      } catch {}
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
        console.warn('Supabase round2_task update warning:', error.message);
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
      const newBonusTotal = participant.authenticityBonusTotal + Math.round(authenticity.authenticityScore * 0.1);
      await supabase.from('participants').update({
        submissions_count: newSubCount,
        authenticity_bonus_total: newBonusTotal,
        updated_at: new Date().toISOString()
      }).eq('id', participant.id);
    } else {
      memorySubmissions.unshift(newSubmission);
      participant.submissionsCount += 1;
      participant.authenticityBonusTotal += Math.round(authenticity.authenticityScore * 0.1);
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

      participant.totalScore = participant.round1Score + participant.round2Score + participant.round3Score;
      if (participant.round3Score > 0) participant.status = 'champion';
      else if (participant.round2Score > 0) participant.status = 'qualified_r3';
      else if (participant.round1Score > 0) participant.status = 'qualified_r2';

      await supabase.from('participants').update({
        round1_score: participant.round1Score,
        round2_score: participant.round2Score,
        round3_score: participant.round3Score,
        total_score: participant.totalScore,
        status: participant.status,
        updated_at: new Date().toISOString()
      }).eq('id', participant.id);

      // Recompute ranks in DB
      const { data: allParts } = await supabase.from('participants').select('id, total_score').order('total_score', { ascending: false });
      if (allParts) {
        for (let i = 0; i < allParts.length; i++) {
          await supabase.from('participants').update({ rank: i + 1 }).eq('id', allParts[i].id);
        }
      }
    }
  } else {
    const participant = memoryParticipants.find(p => p.id === sub.participantId);
    if (participant) {
      if (sub.roundId === 1) participant.round1Score = scores.totalScore;
      if (sub.roundId === 2) participant.round2Score = scores.totalScore;
      if (sub.roundId === 3) participant.round3Score = scores.totalScore;
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

    const authenticityBonus = Math.min(10, Math.round(sub.authenticity.authenticityScore * 0.1));
    const totalScore = (Number(promptQuality) || 0) + 
                       (Number(outputRelevance) || 0) + 
                       (Number(creativity) || 0) + 
                       (Number(technicalExecution) || 0) + 
                       authenticityBonus;

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

// POST /api/admin/auto-grade-round1 (Require Admin - Batch Autograde Round 1 & Update Leaderboard)
app.post('/api/admin/auto-grade-round1', requireAdmin, async (_req: Request, res: Response) => {
  try {
    let pendingSubs: Submission[] = [];

    if (supabase) {
      const { data, error } = await supabase.from('submissions').select('*').eq('round_id', 1);
      if (!error && data) {
        pendingSubs = data.map(mapSubmissionFromDb);
      }
    } else {
      pendingSubs = memorySubmissions.filter(s => s.roundId === 1);
    }

    let gradedCount = 0;
    for (const sub of pendingSubs) {
      const aiScores = await evaluateSubmissionWithGeminiMultimodal(sub);
      await saveAndApplySubmissionScores(sub, aiScores);
      gradedCount++;
    }

    // Automatically publish Round 1 on leaderboard
    eventState.publishedRounds.round1 = true;
    if (supabase) {
      await supabase.from('event_state').update({
        published_rounds: eventState.publishedRounds,
        updated_at: new Date().toISOString()
      }).eq('id', 1);
    }

    res.json({
      success: true,
      gradedCount,
      message: `Successfully evaluated ${gradedCount} Round 1 submissions with Gemini AI and updated leaderboard!`
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Batch autograding failed' });
  }
});

// 6. Public Leaderboard
app.get('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const roundParam = req.query.round ? String(req.query.round).toLowerCase() : 'overall';
    const adminToken = req.cookies.pw_admin_session;
    let isAdmin = false;
    if (adminToken) {
      try {
        await jwtVerify(adminToken, ADMIN_SESSION_SECRET_KEY);
        isAdmin = true;
      } catch {}
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
      const r1Allowed = isLeaderboardPublished || Boolean(publishedRounds?.round1);
      const r2Allowed = isLeaderboardPublished || Boolean(publishedRounds?.round2);
      const r3Allowed = isLeaderboardPublished || Boolean(publishedRounds?.round3);

      const r1Score = r1Allowed ? p.round1Score : 0;
      const r2Score = r2Allowed ? p.round2Score : 0;
      const r3Score = r3Allowed ? p.round3Score : 0;
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

    // Sort depending on requested round filter
    if (roundParam === '1') {
      sanitized.sort((a, b) => {
        if (b.round1Score !== a.round1Score) return b.round1Score - a.round1Score;
        return b.totalScore - a.totalScore;
      });
      sanitized.forEach((p) => { p.rank = p.round1Rank; });
    } else if (roundParam === '2') {
      sanitized.sort((a, b) => {
        if (b.round2Score !== a.round2Score) return b.round2Score - a.round2Score;
        return b.totalScore - a.totalScore;
      });
      sanitized.forEach((p) => { p.rank = p.round2Rank; });
    } else if (roundParam === '3') {
      sanitized.sort((a, b) => {
        if (b.round3Score !== a.round3Score) return b.round3Score - a.round3Score;
        return b.totalScore - a.totalScore;
      });
      sanitized.forEach((p) => { p.rank = p.round3Rank; });
    } else {
      sanitized.sort((a, b) => b.totalScore - a.totalScore);
      let cur = 1;
      sanitized.forEach((p, idx) => {
        if (idx > 0 && p.totalScore < sanitized[idx - 1].totalScore) cur = idx + 1;
        p.rank = cur;
      });
    }

    res.json(sanitized);
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

  memoryParticipants = [];
  memorySubmissions = [];
  eventState = { ...INITIAL_EVENT_STATE };

  if (supabase) {
    try {
      await supabase.from('submissions').delete().neq('id', 'keep-all');
      await supabase.from('participants').delete().neq('id', 'keep-all');
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

  res.json({ success: true, message: 'Database reset cleanly to fresh state' });
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
