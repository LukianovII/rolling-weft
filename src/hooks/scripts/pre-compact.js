#!/usr/bin/env node
/**
 * PreCompact hook — safety net before context compaction.
 * Reads transcript_path from stdin, filters out noise via streaming,
 * writes a clean temporary file, and instructs Claude (via systemMessage)
 * to spawn a subagent that analyzes it for unsaved knowledge.
 * Windows-compatible: pure Node.js, no bash required.
 *
 * Input (stdin): { session_id, transcript_path, trigger, custom_instructions, ... }
 * Output (stdout): { systemMessage: "..." }
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const NOISE_TYPES = new Set(['progress', 'queue-operation', 'file-history-snapshot']);

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', async () => {
  let transcriptPath = '';
  let trigger = 'unknown';

  try {
    const data = JSON.parse(input);
    transcriptPath = data.transcript_path || '';
    trigger = data.trigger || 'unknown';
  } catch {
    // stdin parse failed — continue with empty path
  }

  let filteredPath = '';

  if (transcriptPath && fs.existsSync(transcriptPath)) {
    try {
      filteredPath = await filterTranscript(transcriptPath);
    } catch {
      // Filtering failed — agent will read the original
      filteredPath = transcriptPath;
    }
  }

  const readPath = filteredPath || transcriptPath || '(not available)';

  const parts = [
    `Context compaction is about to start (trigger: ${trigger}).`,
    '',
    'BEFORE compaction proceeds, launch a subagent to scan the session transcript',
    'for knowledge that has not yet been persisted.',
    '',
    'Subagent task:',
    `  1. Read the filtered transcript: ${readPath}`,
    '     (noise entries and thinking blocks already removed by the hook)',
    '',
    '  2. Identify any discoveries, workarounds, bug root causes, or behavioral observations',
    '     that were made during this session — whether or not they were explicitly marked',
    '     as FINDING/LEARNED/ASSUMPTION.',
    '  3. Check what was already persisted:',
    '     - bd comments add calls (FINDINGs/LEARNEDs recorded in beads)',
    '     - Edits to .context/patterns.md',
    '     - bd update/close calls (task state)',
    '  4. Return a concise summary:',
    '     - Knowledge found but NOT yet persisted (with suggested text)',
    '     - Gaps: e.g. LEARNED in beads but missing from patterns.md, or vice versa',
    '     - Task state: was bd update/close called? If not, what should be recorded?',
    '',
    'After the subagent returns, persist any missing knowledge before allowing compaction.',
    'If the subagent finds nothing to save, compaction can proceed immediately.',
  ];

  console.log(JSON.stringify({ systemMessage: parts.join('\n') }));
});

/**
 * Stream-filter transcript: remove noise entries, isMeta entries, and thinking blocks.
 * Reads line-by-line (no full file in memory), writes to a temp file.
 * Returns the temp file path.
 */
async function filterTranscript(srcPath) {
  const tmpFile = path.join(os.tmpdir(), `rw-precompact-${Date.now()}.jsonl`);
  const writeStream = fs.createWriteStream(tmpFile);
  const rl = readline.createInterface({
    input: fs.createReadStream(srcPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Skip noise entry types
    if (NOISE_TYPES.has(entry.type)) continue;

    // Skip skill/command template expansions
    if (entry.isMeta) continue;

    // Strip thinking blocks from assistant messages (signatures are large)
    if (entry.message && Array.isArray(entry.message.content)) {
      entry.message.content = entry.message.content.filter(
        block => block.type !== 'thinking'
      );
    }

    writeStream.write(JSON.stringify(entry) + '\n');
  }

  // Wait for write stream to finish
  await new Promise((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on('error', reject);
  });

  return tmpFile;
}
