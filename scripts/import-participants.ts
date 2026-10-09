import fs from 'fs';
import path from 'path';
import * as XLSXModule from 'xlsx';
const XLSX = (XLSXModule as any).default || XLSXModule;
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface ParticipantRecord {
  rowNumber: number;
  name: string;
  email: string;
  registrationId: string;
  college?: string;
}

interface Rejection {
  rowNumber: number;
  reason: string;
  data: Partial<ParticipantRecord>;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const filePathArg = args.find(a => !a.startsWith('--'));
  return { isDryRun, filePathArg };
}

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith('http')) {
    return null;
  }
  return createClient(url, key);
}

function matchHeader(headers: string[]): { nameKey?: string; emailKey?: string; regKey?: string; collegeKey?: string } {
  let nameKey: string | undefined;
  let emailKey: string | undefined;
  let regKey: string | undefined;
  let collegeKey: string | undefined;

  for (const h of headers) {
    const cleanH = h.trim().toLowerCase();
    if (!nameKey && (cleanH.includes('name') || cleanH === 'leader name' || cleanH === 'participant name' || cleanH === 'full name')) {
      nameKey = h;
    } else if (!emailKey && (cleanH.includes('email') || cleanH.includes('e-mail') || cleanH === 'leader email')) {
      emailKey = h;
    } else if (!regKey && (cleanH.includes('registration') || cleanH.includes('reg') || cleanH === 'id')) {
      regKey = h;
    } else if (!collegeKey && (cleanH.includes('college') || cleanH.includes('institute') || cleanH.includes('university') || cleanH === 'leader college')) {
      collegeKey = h;
    }
  }

  return { nameKey, emailKey, regKey, collegeKey };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function run() {
  const { isDryRun, filePathArg } = parseArgs();

  if (!filePathArg) {
    console.error('Usage: npx tsx scripts/import-participants.ts <excel-file-path> [--dry-run]');
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePathArg);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found at ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`\n---------------------------------------------------------`);
  console.log(`PROMPT WARS 2026 — PARTICIPANT IMPORT SCRIPT`);
  console.log(`File: ${resolvedPath}`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (No DB modifications)' : 'LIVE IMPORT'}`);
  console.log(`---------------------------------------------------------\n`);

  const workbook = XLSX.readFile(resolvedPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

  if (rawRows.length === 0) {
    console.error('Error: Excel sheet is empty.');
    process.exit(1);
  }

  const headers = Object.keys(rawRows[0]);
  const { nameKey, emailKey, regKey, collegeKey } = matchHeader(headers);

  if (!nameKey || !emailKey || !regKey) {
    console.error('Error: Could not auto-detect required columns.');
    console.error(`Headers found in sheet: ${JSON.stringify(headers)}`);
    console.error(`Missing mappings for: ${!nameKey ? 'Name ' : ''}${!emailKey ? 'Email ' : ''}${!regKey ? 'Registration ID' : ''}`);
    process.exit(1);
  }

  console.log(`Matched Headers:`);
  console.log(`  Name ➔ "${nameKey}"`);
  console.log(`  Email ➔ "${emailKey}"`);
  console.log(`  Registration ID ➔ "${regKey}"`);
  if (collegeKey) console.log(`  College ➔ "${collegeKey}"`);
  console.log('');

  const validRecords: ParticipantRecord[] = [];
  const rejections: Rejection[] = [];

  const seenRegIdsInSheet = new Set<string>();
  const seenEmailsInSheet = new Set<string>();

  const supabase = getSupabaseClient();
  let dbRegIds = new Set<string>();
  let dbEmails = new Set<string>();

  if (supabase) {
    try {
      const { data: existing, error } = await supabase.from('participants').select('registration_id, email');
      if (!error && existing) {
        existing.forEach(row => {
          if (row.registration_id) dbRegIds.add(String(row.registration_id).trim().toUpperCase());
          if (row.email) dbEmails.add(String(row.email).trim().toLowerCase());
        });
      }
    } catch (e) {
      console.warn('Notice: Unable to query Supabase pre-existing records:', e);
    }
  }

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i + 2; // Excel line number (1 is header)

    const rawName = String(row[nameKey] || '').trim();
    const rawEmail = String(row[emailKey] || '').trim().toLowerCase();
    const rawRegId = String(row[regKey] || '').trim().toUpperCase();
    const rawCollege = collegeKey ? String(row[collegeKey] || '').trim() : undefined;

    if (!rawName) {
      rejections.push({ rowNumber, reason: 'Name is empty', data: { name: rawName, email: rawEmail, registrationId: rawRegId } });
      continue;
    }
    if (!rawRegId) {
      rejections.push({ rowNumber, reason: 'Registration ID is empty', data: { name: rawName, email: rawEmail, registrationId: rawRegId } });
      continue;
    }
    if (!rawEmail) {
      rejections.push({ rowNumber, reason: 'Email is empty', data: { name: rawName, email: rawEmail, registrationId: rawRegId } });
      continue;
    }

    if (!isValidEmail(rawEmail)) {
      rejections.push({ rowNumber, reason: `Invalid email format (${rawEmail})`, data: { name: rawName, email: rawEmail, registrationId: rawRegId } });
      continue;
    }

    if (seenRegIdsInSheet.has(rawRegId)) {
      rejections.push({ rowNumber, reason: `Duplicate Registration ID in sheet (${rawRegId})`, data: { name: rawName, email: rawEmail, registrationId: rawRegId } });
      continue;
    }
    if (seenEmailsInSheet.has(rawEmail)) {
      rejections.push({ rowNumber, reason: `Duplicate Email in sheet (${rawEmail})`, data: { name: rawName, email: rawEmail, registrationId: rawRegId } });
      continue;
    }

    seenRegIdsInSheet.add(rawRegId);
    seenEmailsInSheet.add(rawEmail);

    validRecords.push({
      rowNumber,
      name: rawName,
      email: rawEmail,
      registrationId: rawRegId,
      college: rawCollege
    });
  }

  console.log(`Processing Summary:`);
  console.log(`  Total Rows Read: ${rawRows.length}`);
  console.log(`  Valid Records:   ${validRecords.length}`);
  console.log(`  Rejected Rows:   ${rejections.length}`);
  console.log('');

  if (rejections.length > 0) {
    console.log(`--- REJECTED ROWS REPORT ---`);
    rejections.forEach(r => {
      console.log(`  Row ${r.rowNumber}: [${r.reason}] (ID: ${r.data.registrationId || 'N/A'}, Email: ${r.data.email || 'N/A'})`);
    });
    console.log('----------------------------\n');
  }

  if (isDryRun) {
    console.log(`[DRY-RUN COMPLETED] No changes were written to the database.`);
    return;
  }

  if (validRecords.length === 0) {
    console.log(`No valid records to import.`);
    return;
  }

  if (!supabase) {
    const port = process.env.PORT || 3000;
    try {
      const res = await fetch(`http://localhost:${port}/api/admin/import-participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: validRecords })
      });
      if (res.ok) {
        console.log(`[IN-MEMORY MODE] Upserted ${validRecords.length} records into local dev server!`);
        return;
      }
    } catch {}
    console.error(`Error: Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are not set. Cannot perform live import.`);
    process.exit(1);
  }

  console.log(`Upserting ${validRecords.length} records into Supabase 'participants' table...`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const rec of validRecords) {
    const isUpdate = dbRegIds.has(rec.registrationId);
    let id = `p-${rec.registrationId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    if (supabase && isUpdate) {
      const { data: existingRow } = await supabase
        .from('participants')
        .select('id')
        .eq('registration_id', rec.registrationId)
        .maybeSingle();

      if (existingRow?.id) {
        id = existingRow.id;
      }
    }

    const payload = {
      id,
      registration_id: rec.registrationId,
      name: rec.name,
      email: rec.email,
      college: rec.college || 'Participant Institute',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('participants').upsert(payload, { onConflict: 'registration_id' });

    if (error) {
      console.error(`Failed to upsert Row ${rec.rowNumber} (${rec.registrationId}):`, error.message);
      rejections.push({ rowNumber: rec.rowNumber, reason: error.message, data: rec });
    } else {
      if (isUpdate) updatedCount++;
      else insertedCount++;
    }
  }

  console.log(`\nImport Completed Successfully:`);
  console.log(`  Inserted: ${insertedCount}`);
  console.log(`  Updated:  ${updatedCount}`);
  console.log(`  Failed:   ${rejections.length}`);
}

run().catch(err => {
  console.error('Fatal error in import script:', err);
  process.exit(1);
});
