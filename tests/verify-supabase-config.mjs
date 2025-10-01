import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { SUPABASE_URL, SUPABASE_ANON_KEY, ROOM_ID } from '../supabase-config.js';

const EXPECTED_URL = 'https://eytswszeopdxmtxxbkrb.supabase.co';
const EXPECTED_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dHN3c3plb3BkeG10eHhiK3JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI5ODQsImV4cCI6MjA3NDEyODk4NH0.7skddGtrUoXluvK9JDS54bpmKCxVYeofzWATmJIgABE';
const EXPECTED_ROOM = 'TEST123';

assert.equal(
  SUPABASE_URL,
  EXPECTED_URL,
  'Supabase URL does not match the value from the original configuration.'
);

assert.equal(
  SUPABASE_ANON_KEY,
  EXPECTED_KEY,
  'Supabase anon key does not match the value from the original configuration.'
);

assert.equal(ROOM_ID, EXPECTED_ROOM, 'Room ID should remain the shared demo room.');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const htmlFiles = ['canvas.html', 'student.html', 'teacher.html'];

htmlFiles.forEach((filename) => {
  const filePath = path.join(projectRoot, filename);
  const contents = readFileSync(filePath, 'utf8');

  assert(
    contents.includes("import { initRealtimeCanvas } from './realtime-canvas.js';"),
    `${filename} should import the shared realtime canvas module.`
  );

  assert(
    !contents.includes('SUPABASE_ANON_KEY ='),
    `${filename} should not define its own Supabase anon key inline.`
  );

  assert(
    contents.includes('id="sessionId"'),
    `${filename} should expose the session identifier element for runtime updates.`
  );
});

console.log('Supabase configuration verified successfully for all canvases.');
