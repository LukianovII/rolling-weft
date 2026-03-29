---
name: consolidation
description: Project entropy reduction — audit beads, design docs, code patterns, and naming for staleness, drift, and inconsistency. Use after completing a wave of features, when the codebase feels "messy" despite working code, or when patterns.md and .designs/ have drifted from reality. This is a meta-activity that spans multiple beads.
---

# Consolidation

Reduce project entropy. After a wave of features, the codebase accumulates:
- Beads with stale descriptions (scope changed during work)
- Design docs that don't match the code
- Duplicate patterns solving the same problem differently
- Naming inconsistencies from evolving understanding
- DRY violations from parallel feature work

Consolidation is a deliberate pause to clean this up.

## When to Consolidate

- **After a feature wave** — 5+ features landed, time to audit
- **Before a major pivot** — clean house before changing direction
- **When naming feels inconsistent** — sign that concepts crystallized unevenly
- **When patterns.md is noisy** — too many entries, duplicates, stale items
- **User explicitly asks** — "let's clean up", "audit the codebase"

Consolidation is an **epic**. Create it as a bead, because the activity produces
FINDINGs, LEARNEDs, and code patterns worth tracking. Individual audit steps
(code pattern fixes, design doc updates, naming alignment) become child beads.

```
bd create "Consolidation: post-{wave} audit" --labels refactor,consolidation
bd comments add {ID} "SCOPE: entropy reduction after {wave description}.
  Areas: beads, designs, code patterns, patterns files, naming."
```

## The Procedure

### Step 1 — Beads Audit

Review open and recently closed beads:

```
bd ready                        → what's still open?
bd search --status all          → recent history
```

For each open bead:
- Is the description still accurate? Update if scope shifted.
- Is it still relevant? If not → close with reason.
- Are dependencies correct? Resolved deps that weren't removed?
- Labels current? Domain tags matching actual work?

**Output:** list of beads to close, update, or reclassify.

### Step 2 — Design Doc Audit

Review all files in `.designs/`:

For each design doc:
- Does the YAML contract match actual code? (field names, types, error codes)
- Are Mermaid diagrams current?
- Have modules been renamed, merged, or split since the doc was written?
- Are there modules WITHOUT design docs that should have them?

**Actions:**
- Stale doc, module still exists → update to match code
- Stale doc, module replaced → move to `.designs/legacy/`, write new doc
- Missing doc for important boundary → create it
- Orphan doc for removed module → move to `.designs/legacy/`

### Step 3 — Code Pattern Audit

Scan the codebase for inconsistencies:

- **DRY violations:** same logic implemented differently in multiple places
- **Naming drift:** same concept called different names
- **Pattern divergence:** two modules solving similar problems with different approaches
- **Error handling:** inconsistent error types, missing error propagation
- **Constants:** magic numbers, duplicated string literals

For each finding:
```
bd create "Consolidation: {description}" --parent {consolidation-epic-ID} --labels refactor,{domain}
```

**Do not fix inline.** Create child beads for fixes — they go through normal lifecycle.

### Step 4 — Patterns Hygiene

Review `.context/patterns/` files:

- **Stale entries:** verified long ago, still true? Re-verify or mark uncertain.
- **Duplicates:** multiple entries about the same gotcha → merge into one.
- **Organization:** if a file exceeds ~100 entries, split by sub-domain.
- **Dead entries:** patterns for removed code or abandoned approaches → remove.
- **Missing entries:** recent LEARNEDs not yet in patterns → add.

### Step 5 — Naming Review

Check for naming evolution signals (renames = understanding deepening):

- Are recent renames consistent across the codebase? (all references updated?)
- Are there old names still in comments, docs, or variable names?
- Do module names match their current responsibility?

Record significant renames:
```
bd comments add {epic-ID} "LEARNED [naming]: {OldName} → {NewName}.
  Reason: {concept that crystallized}."
```

### Step 6 — Summary

Present findings to user:

```
## Consolidation Results

**Beads:** {N} closed as stale, {N} updated, {N} new created
**Design docs:** {N} updated, {N} moved to legacy, {N} new created
**Code patterns:** {N} issues found → beads created
**Patterns files:** {N} entries pruned, {N} merged, {N} added
**Naming:** {N} inconsistencies found

**Created beads for fixes:**
- {ID}: {title}
- {ID}: {title}
```

## Scope

Consolidation reviews — it does not fix. Code changes happen through normal
bead lifecycle. The exception: trivial fixes (typos, comment updates, import
cleanup) that don't warrant their own bead can be done inline during consolidation.

## Frequency

No fixed schedule. Signals that consolidation is overdue:
- More than 20 beads closed since last consolidation
- Naming confusion in discussions ("is it Buffer or Queue?")
- New team member would struggle to navigate the codebase
- patterns.md has entries contradicting each other
- Design docs referenced in discussions don't match code behavior
