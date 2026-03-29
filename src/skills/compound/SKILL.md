---
name: compound
description: Knowledge extraction and persistence at session boundaries or epic milestones. Use when ending a session, reaching a milestone in an epic, switching to unrelated work, or when context is getting large. Heavier than finalize — writes to patterns.md, updates designs, persists bead state. The cost of writing is near-zero, the cost of forgetting is high.
---

# Compound

Extract knowledge into persistent storage at session boundaries.
Compound is the **heavy** extraction — finalize (in `@skills/node-lifecycle`) is the
lightweight per-bead close. Compound runs less often but captures more.

## When to Compound

- **Session ending** — always compound before closing
- **Epic milestone** — completed a significant chunk of work within an epic
- **Context getting large** — before automatic compaction eats nuance
- **Switching domains** — moving from one area of work to a very different one
- **After debugging session** — significant findings that need persistence

**Not every bead close.** Inside an epic with many small beads, finalize handles
per-bead closing. Compound runs at natural boundaries.

## The Procedure

### Step 1 — Extract Knowledge to Persistent Storage

Review the current session for discoveries:

- API/SDK behaviors observed during probes
- Workarounds used (even "temporary" ones)
- Bugs found and their root causes
- Patterns confirmed by testing
- Review findings from code-reviewer / silent-failure-hunter

For each item, decide where it goes:

| What | Where |
|------|-------|
| Probe result (exact data) | `bd comments add {ID} "FINDING [tag]: ..."` |
| Generalized conclusion | `bd comments add {ID} "LEARNED [tag]: ..."` **AND** `.context/patterns/` |
| Contract change | Update `.designs/{module}.md` |

**LEARNED goes to both storages — always.**
- Beads: searchable by labels (`bd search --label com`)
- patterns/: loaded at session start before any bead is opened
- Neither replaces the other

**Only save verified knowledge** — confirmed by testing or observed failure, not speculation.

**Entry format for patterns files:**
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

### Step 2 — Patterns Hygiene

Before adding new entries, review existing patterns files for the affected domain:

- **Stale entries:** still true? If not, mark SUPERSEDED or remove
- **Duplicates:** new LEARNED already covered? Update existing entry instead
- **Split needed?** If a patterns file exceeds ~100 entries, split by sub-domain
- **Consolidate:** multiple similar entries → one generalized pattern

This prevents unbounded growth. Patterns files should be curated, not append-only.

### Step 3 — Update Beads Task State

Record the stopping point:

```bash
# If stopping mid-work:
bd update {ID} --notes "Stopping: {what state, what's left}"

# If task is complete:
bd close {ID}

# If new work discovered:
bd create "Description" --deps {current-ID}
```

Check `bd ready` to confirm state is accurate.

### Step 4 — Update Design Docs

If any FINDING from this session affects a contract in `.designs/`:
- Minor change (clarification, typo) → update in place, add FINDING reference
- Breaking change (new field, type change) → full procedure per `@skills/design-docs`

Check: do recent FINDINGs reveal design-doc drift? Code says one thing,
design says another → update design to match reality.

### Step 5 — Verify No Knowledge Lost

Quick scan: any significant discoveries from this session that aren't
captured in beads, patterns, or designs?

Common losses:
- Gotcha mentioned in conversation but not recorded as FINDING
- Workaround used but not documented
- Assumption made but not tagged as ASSUMPTION
- Review finding dismissed but not recorded why

## After Compact — Session Continuity

When compaction happens, the PreCompact hook scans the transcript and reminds
about unsaved knowledge. Compound + PreCompact work together: compound is the
thorough manual procedure, PreCompact is the automated safety net.

The next session loads context from:
1. **CLAUDE.md** — auto-loaded (always)
2. **Beads** — `bd prime` injected by session-start hook
3. **patterns/** — reminded by session-start hook if has content

## Common Mistakes

- **Too vague:** "Fixed SDK issue" → useless in future sessions
- **Too speculative:** "This might be a thread issue" → only save after confirming
- **Deferred:** "I'll write this up later" → often forgotten
- **Duplicated:** New entry instead of updating existing one
- **One storage only:** LEARNED to patterns but not beads, or vice versa
- **Skipping beads:** Forgetting to record stopping point — next session starts blind
- **Skipping hygiene:** Adding 5th entry about the same COM quirk instead of consolidating
- **Append-only patterns:** Never pruning or restructuring → patterns file becomes noise
