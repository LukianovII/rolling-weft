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

  // dolt (optional — only needed for server mode; embedded mode is built into bd ≥0.63)
  const doltCheck = spawnSync('dolt', ['version'], { stdio: 'pipe', shell: true });
  if (doltCheck.status === 0) {
    console.log('  [✓] dolt ' + (doltCheck.stdout || '').toString().trim().replace(/^dolt version\s*/i, '') + '  (optional — for server mode)');
  } else {
    console.log('  [·] dolt not found  (optional — embedded mode works without it)');
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

  // Plugins (non-blocking — warn only)
  const mermaidSkillDir = path.join(projectRoot, '.claude', 'skills', 'mermaid-diagram');
  if (fs.existsSync(path.join(mermaidSkillDir, '.git'))) {
    console.log('  [✓] mermaid-skill (git clone)');
  } else {
    console.log('  [!] mermaid-skill not found — re-run setup or: git clone --depth 1 https://github.com/WH-2099/mermaid-skill.git .claude/skills/mermaid-diagram/');
  }

  const claudeCliCheck = spawnSync('claude', ['--version'], { stdio: 'pipe', shell: true });
  if (claudeCliCheck.status === 0) {
    const pluginList = spawnSync('claude', ['plugin', 'list'], {
      stdio: 'pipe',
      shell: true,
      timeout: 10000,
    });
    const pluginOutput = (pluginList.stdout || '').toString();
    for (const name of ['feature-dev', 'pr-review-toolkit']) {
      if (pluginOutput.includes(name)) {
        console.log('  [✓] plugin: ' + name);
      } else {
        console.log('  [!] plugin: ' + name + ' not found (recommended: claude plugin install ' + name + ')');
      }
    }
  } else {
    console.log('  [!] claude CLI not found — cannot check marketplace plugins');
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
console.log('[1/5] Copying templates...');

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
console.log('[2/5] Updating skills and hooks...');

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
console.log('[3/5] Initializing beads...');

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
    console.log('  !  bd not found. Install beads first:');
    console.log('     go install github.com/steveyegge/beads/cmd/bd@latest');
    console.log('     Then run: bd init');
  } else {
    // bd ≥0.63 uses embedded Dolt by default — no external dolt binary needed.
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

// ---------------------------------------------------------------------------
// Step 4: Configure Claude Code hooks
// ---------------------------------------------------------------------------
console.log('');
console.log('[4/5] Configuring Claude Code hooks...');

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
// Step 5: Install Claude Code plugins
// ---------------------------------------------------------------------------
console.log('');
console.log('[5/5] Installing plugins...');

// mermaid-skill: git clone (no plugin manifest — pure reference files)
const mermaidDir = path.join(projectRoot, '.claude', 'skills', 'mermaid-diagram');
if (fs.existsSync(path.join(mermaidDir, '.git'))) {
  // Pull latest
  const pull = spawnSync('git', ['-C', mermaidDir, 'pull', '--ff-only'], {
    stdio: 'pipe',
    shell: true,
    timeout: 30000,
  });
  if (pull.status === 0) {
    console.log('  .  mermaid-skill  (updated)');
  } else {
    console.log('  .  mermaid-skill  (exists, pull failed — check manually)');
  }
} else {
  // Remove non-git dir if exists (e.g. leftover from partial clone)
  if (fs.existsSync(mermaidDir)) {
    fs.rmSync(mermaidDir, { recursive: true, force: true });
  }
  const clone = spawnSync('git', [
    'clone', '--depth', '1',
    'https://github.com/WH-2099/mermaid-skill.git',
    mermaidDir,
  ], { stdio: 'pipe', shell: true, timeout: 60000 });
  if (clone.status === 0) {
    console.log('  +  mermaid-skill  (cloned to .claude/skills/mermaid-diagram/)');
  } else {
    console.log('  !  mermaid-skill clone failed — run manually:');
    console.log('     git clone --depth 1 https://github.com/WH-2099/mermaid-skill.git');
    console.log('     into: .claude/skills/mermaid-diagram/');
  }
}

// Marketplace plugins: feature-dev, pr-review-toolkit
const claudeCheck = spawnSync('claude', ['--version'], {
  stdio: 'pipe',
  shell: true,
});

if (claudeCheck.status !== 0) {
  console.log('  !  claude CLI not found — install plugins manually:');
  console.log('     claude plugin install feature-dev');
  console.log('     claude plugin install pr-review-toolkit');
} else {
  const marketplacePlugins = [
    { arg: 'feature-dev', name: 'feature-dev' },
    { arg: 'pr-review-toolkit', name: 'pr-review-toolkit' },
  ];

  for (const plugin of marketplacePlugins) {
    const result = spawnSync('claude', ['plugin', 'install', plugin.arg], {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
      timeout: 30000,
    });
    if (result.status === 0) {
      console.log('  +  ' + plugin.name);
    } else {
      const output = (result.stderr || '').toString() + (result.stdout || '').toString();
      if (output.includes('already')) {
        console.log('  .  ' + plugin.name + '  (already installed)');
      } else {
        console.log('  !  ' + plugin.name + ' failed — run manually:');
        console.log('     claude plugin install ' + plugin.arg);
      }
    }
  }
}

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
