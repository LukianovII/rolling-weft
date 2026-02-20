#!/usr/bin/env node
/**
 * PreToolUse (Bash) hook — reminds to review assumptions before bd close.
 * Only fires when the bash command looks like a bd close.
 * Windows-compatible: pure Node.js, no bash required.
 */

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cmd = (data?.tool_input?.command || '').toLowerCase();

    if (cmd.includes('bd') && cmd.includes('close')) {
      const message = [
        'About to close a bead. Finalize checklist:',
        '',
        '1. ASSUMPTIONS: Run `bd show {ID}` and review every ASSUMPTION record.',
        '   Each one: confirmed? contradicted? still unknown?',
        '',
        '2. BLOCKING STATUS: Ask the user:',
        '   - Where do we go next?',
        '   - Does the next task BLOCK this one? (prerequisite → bd dep add)',
        '   - Or is this node SUSPENDED? (user returns later)',
        '',
        '3. LEARNED: Write LEARNED for any gotchas discovered during this work.',
        '',
        '4. DESIGN-DOC DRIFT: Do any FINDINGs reveal design-doc inconsistencies?',
        '   If yes → update .designs/ (minor) or update shared/.designs/ + notify team (breaking).',
        '',
        '5. SPAWN: Does finalize reveal new work? → bd create with --deps',
      ].join('\n');

      console.log(JSON.stringify({ systemMessage: message }));
    }
  } catch {
    // Not JSON or unexpected input — silent exit
  }
});
