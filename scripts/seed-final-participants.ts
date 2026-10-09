import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../src/data/final_participants.csv');
const rawCsv = fs.readFileSync(csvPath, 'utf8');

const lines = rawCsv.split('\n').map(l => l.trim()).filter(Boolean);
const headers = lines[0].split(',');

interface ParticipantRow {
  id: string;
  registration_id: string;
  name: string;
  college: string;
  email: string;
  avatar: string;
  status: string;
  submissions_count: number;
}

const participants: ParticipantRow[] = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;

  // Simple CSV split handling quotes
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let c of line) {
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  parts.push(current.trim());

  const regId = parts[0] ? parts[0] : `25${String(i).padStart(2, '0')}`;
  const name = parts[1] || 'Participant';
  const college = parts[2] || 'ADCET';
  const email = parts[6] || parts[5] || `${regId}@adcet.in`;

  participants.push({
    id: `part-${regId.toLowerCase()}`,
    registration_id: regId,
    name,
    college,
    email: email.toLowerCase(),
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face',
    status: 'active',
    submissions_count: 0
  });
}

console.log(`Parsed ${participants.length} final participants from CSV.`);

// Supabase sync
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (url && key && url.startsWith('http')) {
  const supabase = createClient(url, key);
  console.log(`Connected to Supabase at ${url}. Resetting participants table...`);

  // Clear existing submissions & participants
  await supabase.from('submissions').delete().neq('id', 'keep-all');
  await supabase.from('participants').delete().neq('id', 'keep-all');

  const { data, error } = await supabase.from('participants').insert(participants).select();
  if (error) {
    console.error('Supabase import error:', error.message);
  } else {
    console.log(`Successfully seeded ${data.length} final participants into Supabase!`);
  }
} else {
  console.log('Supabase env credentials not provided or running offline mode.');
}

// Generate TS data structure for mockData.ts
const mockParticipantsCode = participants.map((p) => ({
  id: p.id,
  registrationId: p.registration_id,
  name: p.name,
  college: p.college,
  email: p.email,
  avatar: p.avatar,
  round1Score: 0,
  round2Score: 0,
  round3Score: 0,
  authenticityBonusTotal: 0,
  totalScore: 0,
  rank: 1,
  status: 'active',
  submissionsCount: 0
}));

const mockDataPath = path.join(__dirname, '../src/data/mockData.ts');
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

const targetStr = `export const INITIAL_PARTICIPANTS: Participant[] = [];`;
const replacementStr = `export const INITIAL_PARTICIPANTS: Participant[] = ${JSON.stringify(mockParticipantsCode, null, 2)};`;

if (mockDataContent.includes(targetStr)) {
  mockDataContent = mockDataContent.replace(targetStr, replacementStr);
  fs.writeFileSync(mockDataPath, mockDataContent, 'utf8');
  console.log('Successfully updated INITIAL_PARTICIPANTS in src/data/mockData.ts!');
} else {
  console.warn('Could not find INITIAL_PARTICIPANTS target string in mockData.ts');
}
