#!/usr/bin/env node
/**
 * PostToolUse (Bash) hook — captures LEARNED entries into knowledge.jsonl.
 * Detects: bd comment {BEAD_ID} "LEARNED: ..."
 * Extracts knowledge into .beads/memory/knowledge.jsonl for future recall.
 * Windows-compatible: pure Node.js, no bash required.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cmd = data?.tool_input?.command || '';

    // Only process bd comment commands with LEARNED
    if (!cmd.includes('bd') || !cmd.includes('comment') || !cmd.includes('LEARNED:')) {
      return;
    }

    // Extract bead ID: bd comment {ID} "LEARNED: ..."
    const beadMatch = cmd.match(/bd\s+comment\s+([\w.-]+)\s+/);
    if (!beadMatch) return;
    const beadId = beadMatch[1];

    // Extract comment body (content between quotes)
    const bodyMatch = cmd.match(/["'](.+?)["']\s*$/s);
    if (!bodyMatch) return;
    const body = bodyMatch[1];

    // Extract LEARNED content
    const learnedMatch = body.match(/LEARNED:\s*(.*)/s);
    if (!learnedMatch) return;
    const content = learnedMatch[1].trim();
    if (!content) return;

    // Extract tags from brackets: [com, vendorx]
    const tags = [];
    const tagMatch = body.match(/LEARNED\s*\[([^\]]+)\]/);
    if (tagMatch) {
      tagMatch[1].split(',').forEach(t => {
        const tag = t.trim().toLowerCase();
        if (tag) tags.push(tag);
      });
    }
    tags.push('learned');

    // Generate key from content
    const slug = content.substring(0, 60)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const key = `learned-${slug}`;

    const entry = JSON.stringify({
      key,
      type: 'learned',
      content,
      tags,
      ts: Math.floor(Date.now() / 1000),
      bead: beadId,
    });

    // Resolve memory directory
    const cwd = process.env.CLAUDE_PROJECT_ROOT || process.cwd();
    const memoryDir = path.join(cwd, '.beads', 'memory');

    // Create directory if needed
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }

    const knowledgeFile = path.join(memoryDir, 'knowledge.jsonl');

    // Append entry
    fs.appendFileSync(knowledgeFile, entry + '\n');

    // Tag the bead with learned:{domain} labels for native bd search
    const domainTags = tags.filter(t => t !== 'learned');
    for (const tag of domainTags) {
      try {
        spawnSync('bd', ['label', 'add', beadId, `learned:${tag}`], {
          cwd,
          timeout: 5000,
          stdio: 'ignore',
        });
      } catch {
        // bd not available or label failed — not critical
      }
    }

    // Rotation: archive oldest 500 when file exceeds 1000 lines
    try {
      const lines = fs.readFileSync(knowledgeFile, 'utf8').split('\n').filter(Boolean);
      if (lines.length > 1000) {
        const archiveFile = path.join(memoryDir, 'knowledge.archive.jsonl');
        const toArchive = lines.slice(0, 500);
        const toKeep = lines.slice(500);
        fs.appendFileSync(archiveFile, toArchive.join('\n') + '\n');
        fs.writeFileSync(knowledgeFile, toKeep.join('\n') + '\n');
      }
    } catch {
      // Rotation failed — not critical, skip
    }
  } catch {
    // Parse error or unexpected input — silent exit
  }
});
