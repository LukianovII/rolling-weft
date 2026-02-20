#!/usr/bin/env node
/**
 * SessionStart hook — loads project context into Claude's session.
 * 1. Runs `bd prime` if beads is initialized.
 * 2. Reminds to check .context/patterns.md if it has content.
 * 3. Suggests context recovery if resuming work on a node.
 * Windows-compatible: pure Node.js, no bash required.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
const parts = [];

// 1. Beads context
const beadsDir = path.join(cwd, '.beads');
if (fs.existsSync(beadsDir)) {
  try {
    const prime = execSync('bd prime', {
      encoding: 'utf8',
      cwd,
      timeout: 8000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (prime) {
      parts.push(prime);
    }
  } catch {
    // bd not installed or bd prime failed — skip silently
  }
}

// 2. Patterns reminder
const patternsPath = path.join(cwd, '.context', 'patterns.md');
if (fs.existsSync(patternsPath)) {
  const size = fs.statSync(patternsPath).size;
  if (size > 200) {
    parts.push('Check .context/patterns.md for domain-specific gotchas before starting work.');
  }
}

// 3. Context recovery hint
if (fs.existsSync(beadsDir)) {
  parts.push(
    'If resuming work on a specific task, run `bd show {ID}` to recover context.\n' +
    'Check for existing FINDING/ASSUMPTION records before starting new probes.'
  );
}

// 4. Shared-contracts submodule change detection
const sharedDir = path.join(cwd, 'shared');
if (fs.existsSync(sharedDir)) {
  try {
    const markerPath = path.join(beadsDir, '.shared-last-seen');
    const currentHead = execSync('git rev-parse HEAD', {
      encoding: 'utf8',
      cwd,
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    let fromRef = null;
    if (fs.existsSync(markerPath)) {
      fromRef = fs.readFileSync(markerPath, 'utf8').trim();
    }

    if (fromRef && fromRef !== currentHead) {
      const diff = execSync(`git diff ${fromRef}..HEAD --name-only -- shared/`, {
        encoding: 'utf8',
        cwd,
        timeout: 5000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (diff) {
        const files = diff.split('\n').map(f => '  ' + f).join('\n');
        parts.push(
          'shared-contracts changed since last session:\n' + files +
          '\nCheck if these changes affect your module\'s .designs/ or code.'
        );
      }
    }

    // Update marker for next session
    fs.writeFileSync(markerPath, currentHead + '\n');
  } catch {
    // No git, no .beads/, or other error — skip silently
  }
}

if (parts.length > 0) {
  console.log(JSON.stringify({ systemMessage: parts.join('\n\n---\n\n') }));
}
