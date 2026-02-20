#!/usr/bin/env node
/**
 * PreCompact hook — reminds to compound before context compression.
 * Windows-compatible: pure Node.js, no bash required.
 */

const message = [
  'IMPORTANT: Context is about to be compacted.',
  '',
  'Run the compound procedure before compaction:',
  '1. Extract new gotchas/patterns → .context/patterns.md',
  '2. Record FINDINGs and LEARNEDs in beads (bd comment)',
  '3. Update beads task state (bd update/close/create)',
  '4. Update .designs/ if any FINDINGs affect contracts',
  '',
  'Load skill @skills/compound for the full procedure.',
  'Only compact after all steps are complete.',
].join('\n');

console.log(JSON.stringify({ systemMessage: message }));
