#!/usr/bin/env node
/**
 * SessionStart hook — loads project context into Claude's session.
 * 1. Runs `bd prime` if beads is initialized.
 * 2. Runs `bd ready` to show available tasks.
 * 3. Reminds to check .context/patterns.md if it has content.
 * 4. Suggests context recovery if resuming work on a node.
 * Windows-compatible: pure Node.js, no bash required.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
const parts = [];

const beadsDir = path.join(cwd, '.beads');

// 0. Windows: ensure dolt sql-server is running before any bd calls.
//    On Unix, beads auto-starts dolt. On Windows, Setpgid is not supported
//    so beads cannot do it — we do it here instead.
if (process.platform === 'win32' && fs.existsSync(beadsDir)) {
  const portCheck = () => spawnSync('node', ['-e', [
    'const n=require("net"),s=new n.Socket();',
    's.setTimeout(500);',
    's.on("connect",()=>{s.destroy();process.exit(0)});',
    's.on("timeout",()=>{s.destroy();process.exit(1)});',
    's.on("error",()=>process.exit(1));',
    's.connect(3307,"127.0.0.1");',
  ].join('')], { stdio: 'pipe', timeout: 1500 });

  if (portCheck().status !== 0) {
    const doltCwd = process.env.USERPROFILE || process.env.TEMP || 'C:\\';
    spawnSync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command',
       'Start-Process -FilePath dolt -ArgumentList @("sql-server","--port","3307") -WindowStyle Hidden'],
      { stdio: 'pipe', cwd: doltCwd }
    );
    // Poll for readiness (up to 10 s)
    for (let i = 0; i < 10; i++) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
      if (portCheck().status === 0) break;
    }
  }
}

// 1. Beads context
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

// 2. Available tasks (bd ready)
if (fs.existsSync(beadsDir)) {
  try {
    const ready = execSync('bd ready', {
      encoding: 'utf8',
      cwd,
      timeout: 8000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (ready) {
      parts.push('Available tasks:\n' + ready);
    }
  } catch {
    // bd not installed or bd ready failed — skip silently
  }
}

// 3. Patterns reminder
const patternsPath = path.join(cwd, '.context', 'patterns.md');
if (fs.existsSync(patternsPath)) {
  const size = fs.statSync(patternsPath).size;
  if (size > 200) {
    parts.push('Check .context/patterns.md for domain-specific gotchas before starting work.');
  }
}

// 4. Context recovery hint
if (fs.existsSync(beadsDir)) {
  parts.push(
    'If resuming work on a specific task, run `bd show {ID}` to recover context.\n' +
    'Check for existing FINDING/ASSUMPTION records before starting new probes.'
  );
}

// 5. Shared-contracts submodule change detection
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
