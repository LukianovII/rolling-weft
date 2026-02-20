#!/usr/bin/env node
/**
 * PreToolUse (Bash) hook — reminds to update beads before git commit.
 * Only fires when the bash command looks like a git commit.
 * Windows-compatible: pure Node.js, no bash required.
 */

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cmd = (data?.tool_input?.command || '').toLowerCase();

    if (cmd.includes('git commit')) {
      const message = [
        'About to commit. Checklist:',
        '- Did you update beads task state? (bd update {ID} --notes "..." or bd close {ID})',
        '- Were any new gotchas found? → add LEARNED to beads + .context/patterns.md',
        '- Do any FINDINGs affect .designs/ contracts? → update or flag as breaking',
      ].join('\n');

      console.log(JSON.stringify({ systemMessage: message }));
    }
  } catch {
    // Not JSON or unexpected input — silent exit
  }
});
