---
name: compound
description: Knowledge extraction for persistence. Use when switching between unrelated tasks, ending a long session, after any debugging session that produced significant findings, or when context is getting large. The PreCompact hook provides an automated safety net, but this skill is the thorough manual procedure. The cost of writing is near-zero, the cost of forgetting is high.
---

# Compound Before Compact

Extract knowledge into files before compressing context.
A new session with loaded files has full continuity. A compacted session loses nuance.

## The Procedure

Do not skip steps.

### Step 1 — Extract New Knowledge

Review the current session for discoveries:

- API/SDK behaviors observed during probes
- Workarounds used (even "temporary" ones)
- Bugs found and their root causes
- Patterns confirmed by testing

For each item, decide where it goes:

| What | Where |
|------|-------|
| Probe result (exact data) | `bd comments add {ID} "FINDING [tag]: ..."` |
| Generalized conclusion | `bd comments add {ID} "LEARNED [tag]: ..."` **AND** `.context/patterns.md` |
| Contract change discovered | Update `.designs/{module}.md` |

**LEARNED goes to both storages — always.**
Beads: searchable by labels (`bd search --label com`).
patterns.md: loaded at session start before any bead is opened.

**Only save verified knowledge** — confirmed by testing or observed failure, not speculation.

**Entry format for patterns.md:**
```markdown
### Title
What happens and why.
```
// WRONG:
// CORRECT:
```
**Verified:** Month Year, [context]
**Source:** LEARNED from bead {ID}
```

### Step 2 — Update Beads Task State

Record the stopping point before compacting:

```bash
# If stopping mid-work:
bd update {ID} --notes "Stopping: {what state the work is in, what's left}"

# If task is complete:
bd close {ID}

# If new work was discovered:
bd create "Description" --deps {current-ID}
```

Check `bd ready` to confirm task state is accurate.
The next session will run `bd prime` to recover this state.

### Step 3 — Update Design Docs

If any FINDING from this session affects a contract in `.designs/`:
- Minor change (clarification, typo) → update in place, add FINDING reference
- Breaking change (new field, type change) → create bead in integration-repo

## After Compact — Session Continuity

When compaction happens (manual `/compact` or automatic), the PreCompact hook
scans the session transcript and reminds about unsaved knowledge.
Compound + PreCompact work together: compound is the thorough manual procedure,
PreCompact is the automated safety net.

The next session loads context from:

1. **CLAUDE.md** — auto-loaded (always)
2. **Beads** — `bd prime` injected by session-start hook
3. **patterns.md** — reminded by session-start hook if has content

## When to Compound (Without /compact)

Write to patterns.md immediately when:
- A session is ending
- Switching to a very different task
- You find a gotcha that took significant debugging
- The user explicitly asks to save knowledge

The cost of writing is near-zero. The cost of forgetting is high.

## Common Mistakes

**Too vague:** "Fixed SDK issue" → useless in future sessions.
**Too speculative:** "This might be a thread issue" → only save after confirming.
**Deferred:** "I'll write this up later" → often forgotten.
**Duplicated:** New entry instead of updating existing one.
**Skipping beads:** Forgetting to record stopping point — next session starts blind.
**One storage only:** Writing LEARNED to patterns.md but not beads (loses label search), or to beads but not patterns.md (invisible at session start).
