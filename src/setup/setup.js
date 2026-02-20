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

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const frameworkRoot = path.resolve(__dirname, '..');

// --- Resolve target project path ---
const targetArg = process.argv[2];
if (!targetArg) {
  console.error('ERROR: Target project path is required.');
  console.error('');
  console.error('Usage:');
  console.error('  node setup/setup.js <path-to-project>');
  console.error('');
  console.error('Example:');
  console.error('  node setup/setup.js C:\\projects\\my-app');
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

// Hook scripts → hooks/scripts/
copyDir(
  path.join(frameworkRoot, 'hooks', 'scripts'),
  path.join(projectRoot, 'hooks', 'scripts'),
  true
);
console.log('  +  hooks/scripts/');

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
    console.log('  !  bd not found. Install beads first:');
    console.log('     npm install -g @beads/bd');
    console.log('     Then run: bd init');
  } else {
    const result = spawnSync('bd', ['init'], {
      cwd: projectRoot,
      stdio: 'inherit',
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
console.log('  1. Edit CLAUDE.md — fill in ## Project Context');
console.log('  2. Edit constitution.md — or ask the agent to run @skills/constitution');
console.log('  3. Edit .designs/index.md — add your module graph');
console.log('  4. git add && git commit');
console.log('');
