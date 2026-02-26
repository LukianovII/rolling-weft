#!/usr/bin/env node
/**
 * Rolling Weft — setup script
 *
 * Usage (from the framework directory):
 *   node setup/setup.js <target-project-path>
 *
 * Idempotent: re-running on an existing project is safe.
 *   - Templates (*.template) → copy only if target doesn't exist
 *   - Skills, hooks → always overwrite (keeps current)
 *   - .designs/ → create directory if doesn't exist, don't touch files
 *   - .beads/ → bd init only if not initialized
 */

// Suppress DEP0190 (shell:true with args — unavoidable on Windows for .cmd wrappers)
process.noDeprecation = true;

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const frameworkRoot = path.resolve(__dirname, '..');

// --- Check mode: verify environment health ---
if (process.argv.includes('--check')) {
  const targetArg = process.argv.slice(2).find(a => a !== '--check');
  const projectRoot = targetArg ? path.resolve(targetArg) : process.cwd();

  console.log('Rolling Weft — environment check');
  console.log('  Project: ' + projectRoot);
  console.log('');

  let ok = true;

  // Node.js
  console.log('  [✓] Node.js ' + process.version);

  // bd
  const bdCheck = spawnSync('bd', ['--version'], { stdio: 'pipe', shell: true });
  if (bdCheck.status === 0) {
    console.log('  [✓] bd ' + (bdCheck.stdout || '').toString().trim().replace(/^bd\s+(version\s+)?/i, ''));
  } else {
    console.log('  [✗] bd not found — install: npm install -g @beads/bd');
    ok = false;
  }

  // dolt
  const doltCheck = spawnSync('dolt', ['version'], { stdio: 'pipe', shell: true });
  if (doltCheck.status === 0) {
    console.log('  [✓] dolt ' + (doltCheck.stdout || '').toString().trim().replace(/^dolt version\s*/i, ''));
  } else {
    console.log('  [✗] dolt not found — install: https://docs.dolthub.com/introduction/installation');
    ok = false;
  }

  // dolt sql-server
  const portCheck = spawnSync('node', ['-e', [
    'const n=require("net"),s=new n.Socket();',
    's.setTimeout(500);',
    's.on("connect",()=>{s.destroy();process.exit(0)});',
    's.on("timeout",()=>{s.destroy();process.exit(1)});',
    's.on("error",()=>process.exit(1));',
    's.connect(3307,"127.0.0.1");',
  ].join('')], { stdio: 'pipe', timeout: 1500 });
  if (portCheck.status === 0) {
    console.log('  [✓] dolt sql-server running (port 3307)');
  } else {
    console.log('  [✗] dolt sql-server not reachable on port 3307');
    ok = false;
  }

  // .beads/
  const beadsDir = path.join(projectRoot, '.beads');
  if (fs.existsSync(beadsDir)) {
    console.log('  [✓] .beads/ initialized');
  } else {
    console.log('  [✗] .beads/ not found — run: bd init');
    ok = false;
  }

  // .claude/settings.json with hooks
  const settingsPath = path.join(projectRoot, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (settings.hooks) {
        console.log('  [✓] .claude/settings.json has hooks configured');
      } else {
        console.log('  [✗] .claude/settings.json exists but has no hooks — re-run setup');
        ok = false;
      }
    } catch {
      console.log('  [✗] .claude/settings.json is not valid JSON — re-run setup');
      ok = false;
    }
  } else {
    console.log('  [✗] .claude/settings.json not found — run setup first');
    ok = false;
  }

  // .hooks/scripts/
  const hooksDir = path.join(projectRoot, '.hooks', 'scripts');
  if (fs.existsSync(hooksDir)) {
    const scripts = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js'));
    console.log('  [✓] .hooks/scripts/ (' + scripts.length + ' scripts)');
  } else {
    console.log('  [✗] .hooks/scripts/ not found — run setup');
    ok = false;
  }

  // CLAUDE.md
  if (fs.existsSync(path.join(projectRoot, 'CLAUDE.md'))) {
    console.log('  [✓] CLAUDE.md exists');
  } else {
    console.log('  [✗] CLAUDE.md not found — run setup');
    ok = false;
  }

  console.log('');
  if (ok) {
    console.log('All checks passed.');
  } else {
    console.log('Some checks failed — see above.');
  }
  process.exit(ok ? 0 : 1);
}

// --- Resolve target project path ---
const targetArg = process.argv[2];
if (!targetArg) {
  console.error('ERROR: Target project path is required.');
  console.error('');
  console.error('Usage:');
  console.error('  node setup/setup.js <path-to-project>');
  console.error('  node setup/setup.js --check [path-to-project]');
  console.error('');
  console.error('Example:');
  console.error('  node setup/setup.js C:\\projects\\my-app');
  console.error('  node setup/setup.js --check C:\\projects\\my-app');
  process.exit(1);
}

const projectRoot = path.resolve(targetArg);

console.log('Rolling Weft setup');
console.log('  Framework : ' + frameworkRoot);
console.log('  Project   : ' + projectRoot);
console.log('');

// --- Create target directory if needed ---
if (!fs.existsSync(projectRoot)) {
  fs.mkdirSync(projectRoot, { recursive: true });
  console.log('Created directory: ' + projectRoot);
  console.log('');
}

// --- Helpers ---
function copyDir(src, dest, overwrite) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, overwrite);
    } else if (overwrite || !fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Step 1: Copy template files (only if target doesn't exist)
// ---------------------------------------------------------------------------
console.log('[1/4] Copying templates...');

const templates = [
  ['templates/CLAUDE.md.template', 'CLAUDE.md'],
  ['templates/constitution.md.template', 'constitution.md'],
  ['templates/patterns.md.template', '.context/patterns.md'],
  ['templates/design-index.md.template', '.designs/index.md'],
];

for (const [src, dest] of templates) {
  const destPath = path.join(projectRoot, dest);
  const destDir = path.dirname(destPath);
  ensureDir(destDir);

  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(path.join(frameworkRoot, src), destPath);
    console.log('  +  ' + dest + '  <- fill in before committing');
  } else {
    console.log('  .  ' + dest + '  (exists, not overwritten)');
  }
}

// Design-slice template: copy to .designs/ as reference, but don't overwrite
const sliceTemplateDest = path.join(projectRoot, '.designs', '_template.md');
if (!fs.existsSync(sliceTemplateDest)) {
  fs.copyFileSync(
    path.join(frameworkRoot, 'templates', 'design-slice.md.template'),
    sliceTemplateDest
  );
  console.log('  +  .designs/_template.md  <- copy this for new module slices');
}

// ---------------------------------------------------------------------------
// Step 2: Copy skills and hooks (always overwrite — keeps current)
// ---------------------------------------------------------------------------
console.log('');
console.log('[2/4] Updating skills and hooks...');

// Skills → .claude/skills/
copyDir(
  path.join(frameworkRoot, 'skills'),
  path.join(projectRoot, '.claude', 'skills'),
  true
);
console.log('  +  .claude/skills/');

// Hook scripts → .hooks/scripts/
copyDir(
  path.join(frameworkRoot, 'hooks', 'scripts'),
  path.join(projectRoot, '.hooks', 'scripts'),
  true
);
console.log('  +  .hooks/scripts/');

// ---------------------------------------------------------------------------
// Step 3: Initialize beads
// ---------------------------------------------------------------------------
console.log('');
console.log('[3/4] Initializing beads...');

const beadsDir = path.join(projectRoot, '.beads');
if (fs.existsSync(beadsDir)) {
  console.log('  .  .beads/ already exists — skipping bd init');
} else {
  // Check if bd is available
  const bdCheck = spawnSync('bd', ['--version'], {
    cwd: projectRoot,
    stdio: 'pipe',
    shell: true,
  });

  if (bdCheck.status !== 0) {
    console.log('  !  bd not found. Install beads and dolt first:');
    console.log('     npm install -g @beads/bd');
    console.log('     dolt: https://docs.dolthub.com/introduction/installation');
    console.log('     Then run: bd init');
  } else {
    // Check if dolt is available (required by beads — SQLite backend was removed)
    const doltCheck = spawnSync('dolt', ['version'], {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
    });

    if (doltCheck.status !== 0) {
      console.log('  !  dolt not found. beads requires dolt as storage backend.');
      console.log('     Install from: https://docs.dolthub.com/introduction/installation');
      console.log('     Then run: bd init');
    } else {
      // Ensure dolt sql-server is running (beads cannot auto-start it on Windows)
      const portCheck = () => spawnSync('node', ['-e', [
        'const n=require("net"),s=new n.Socket();',
        's.setTimeout(500);',
        's.on("connect",()=>{s.destroy();process.exit(0)});',
        's.on("timeout",()=>{s.destroy();process.exit(1)});',
        's.on("error",()=>process.exit(1));',
        's.connect(3307,"127.0.0.1");',
      ].join('')], { stdio: 'pipe', timeout: 1500 });

      let serverReady = portCheck().status === 0;

      if (!serverReady) {
        console.log('  .  dolt sql-server not running — starting...');

        // On Windows, Start-Process creates a truly independent background process
        // that survives after setup exits. On Unix, detached spawn is sufficient.
        if (process.platform === 'win32') {
          // Start dolt in the user's home dir so it doesn't create config/log
          // files in the framework's setup/ directory.
          const doltCwd = process.env.USERPROFILE || process.env.TEMP || 'C:\\';
          spawnSync(
            'powershell',
            [
              '-NoProfile', '-NonInteractive', '-Command',
              'Start-Process -FilePath dolt -ArgumentList @("sql-server","--port","3307") -WindowStyle Hidden',
            ],
            { stdio: 'pipe', cwd: doltCwd }
          );
        } else {
          const srv = spawnSync('sh', ['-c', 'dolt sql-server --port 3307 &'], { stdio: 'pipe' });
          void srv; // fire-and-forget (sh exits immediately after forking)
        }

        // Poll for readiness (up to 10 s)
        for (let i = 0; i < 10; i++) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
          if (portCheck().status === 0) { serverReady = true; break; }
        }
      }

      if (!serverReady) {
        console.log('  !  dolt sql-server did not start.');
        console.log('     Run "dolt sql-server" in a separate terminal, then "bd init".');
      } else {
        // Pass empty stdin (pipe) so bd init sees a non-TTY and skips
        // the "Contributing to someone else's repo?" interactive prompt.
        const result = spawnSync('bd', ['init'], {
          cwd: projectRoot,
          input: '',
          stdio: ['pipe', 'inherit', 'inherit'],
          shell: true,
        });
        if (result.status !== 0) {
          console.log('  !  bd init failed — run "bd init" manually');
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Step 4: Configure Claude Code hooks
// ---------------------------------------------------------------------------
console.log('');
console.log('[4/4] Configuring Claude Code hooks...');

const claudeDir = path.join(projectRoot, '.claude');
ensureDir(claudeDir);

const settingsPath = path.join(claudeDir, 'settings.json');
let settings = {};

if (fs.existsSync(settingsPath)) {
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    console.log('  .  Merging into existing .claude/settings.json');
  } catch {
    console.log('  !  Could not parse existing settings.json — overwriting');
  }
}

// Read hooks.json from framework
const hooksConfig = JSON.parse(
  fs.readFileSync(path.join(frameworkRoot, 'hooks', 'hooks.json'), 'utf8')
);
settings.hooks = hooksConfig.hooks;

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log('  +  .claude/settings.json');

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
console.log('');
console.log('Setup complete.');
console.log('');
console.log('Next steps:');
console.log('  1. Open Claude Code and run: @skills/onboarding');
console.log('     This fills CLAUDE.md, seeds constitution.md, sketches .designs/index.md,');
console.log('     and creates your root bead — through a conversation.');
console.log('  2. git add && git commit');
console.log('');
