---
name: node-lifecycle
description: Core development workflow — bead lifecycle from context load through finalization. Use when starting work on a bead, resuming after context loss, recording findings, reviewing assumptions, or closing/pausing work. Owns the beginning and end of every bead — feature-dev, probes, and other tools operate inside the work phase.
---

# Node Lifecycle

Every bead follows a lifecycle. The lifecycle **always owns the bead** — from context load
to finalize. Feature-dev, probes, investigation are tools called during the work phase,
not parallel workflows.

## Hard Rules

0. **`bd comment` is REMOVED (since v0.59).** Always use `bd comments add {ID} "..."`.

1. **Record after every iteration.** Every work iteration (probe, feature-dev cycle,
   fix attempt) must leave a FINDING. Unrecorded iterations are lost knowledge.
   ```
   bd comments add {ID} "FINDING [tag]: ..."
   ```

2. **Review assumptions on finalize.** Before `bd close`, review every ASSUMPTION:
   confirmed? contradicted? still unknown? Unreviewed assumptions are hidden risks.

3. **Verify blocking status on finalize.** Before closing or pausing, ask the user:
   - Where are we going next?
   - Does the next task **block** this one? → `bd dep add`
   - Or is this node **suspended**? (continues to block parent epic)

4. **One bead, one scope.** When separable new work surfaces — spawn immediately:
   ```
   bd create "The new thing" --deps {current-ID} --labels {domain}
   ```
   Do not absorb it. "We can do it while we're here" is scope creep.

5. **Claim before work, unclaim before switch.** One bead claimed at a time.
   - Start: `bd update {ID} --claim`
   - Switch away: `bd update {ID} --status open --assignee ""`
   - `bd show --current` always reflects current work.

6. **Lifecycle owns the bead, tools own the work.** Feature-dev, probes, investigation
   are called *within* the lifecycle — they do not replace it. The agent is always
   inside the lifecycle. After any tool completes, control returns to the lifecycle
   for assess → record → next iteration or finalize.

## Phases

### 1. Context Load (mandatory, every bead, every session)

Before any work — load full context. Not optional, not "check if needed."

```
bd show {ID}                    → full: description, comments, deps, parent epic
```

Then check project knowledge:
- `.designs/` — relevant contracts for this domain
- `constitution.md` — applicable architectural gates
- `.context/patterns/` — domain-specific gotchas
- `bd search --label {domain} --all` — related FINDINGs/LEARNEDs from other beads

If the bead has a parent epic:
```
bd show {epic-ID}               → epic scope, sibling beads, overall direction
```

**Output:** agent has full context. No work starts until this completes.

### 2. Business Logic Audit (mandatory)

The agent presents a synthesis of understanding — **always**, even if the bead has
rich context from prior sessions. Context drifts. Understanding shifts.

**Agent presents:**
- "Here's what this bead should accomplish in business terms: [synthesis]"
- "Open questions at the business level: [list]" (not code-level — business-level)
- "Assumptions I'm making: [list]"
- "Has anything changed since the last session?"

**User confirms / corrects / expands.**

Record the result:
```
bd comments add {ID} "SCOPE: [synthesis confirmed by user].
  Constraints: [list]. Done-criteria: [what success looks like]."
```

**Why mandatory every time:**
- Context from 3 sessions ago may be stale
- User's mental model may have shifted (learned something outside this session)
- Prior FINDINGs may have changed the scope (pivot discovered)
- Adjacent beads may have resolved dependencies or added constraints
- Cost: 2-3 minutes. Cost of building wrong thing: hours.

### 3. Scope Decision

Based on the audit, classify the work:

| Type | When | Work phase tool |
|------|------|-----------------|
| **Feature** | New functionality or significant enhancement | feature-dev (phases 2-7, summary = handoff) |
| **Probe** | Need to test an API, behavior, or hypothesis | Probe cycle |
| **Fix** | Known bug, clear root cause | Investigate → implement → verify |
| **Research** | Need to understand before deciding approach | Investigation skill |

Record the decision:
```
bd comments add {ID} "SCOPE-DECISION: {type} — {one-line rationale}"
```

**Probes are not always bead-bound.** A probe may serve multiple beads or inform
the entire architecture. If a probe's results are broader than the current bead:
- Record FINDING in the current bead
- Copy relevant LEARNEDs to affected beads: `bd comments add {other-ID} "LEARNED ..."`
- Consider: should the probe be its own bead? If results are reusable — yes.

### 4. Work Phase — Iteration Cycle

All work types follow the same iteration model. The tool changes, the cycle doesn't:

```
[tool → verify → assess → record]*
```

Verify differs by path: for features it's a review gate (external agents),
for probes it's the probe result itself, for fixes it's running tests.

#### Feature Path

```
feature-dev (phases 2-7)
  → Phase 7 summary = handoff point back to lifecycle
  → REVIEW GATE:
      pr-review-toolkit:code-reviewer     (quality, patterns — external perspective)
      pr-review-toolkit:silent-failure-hunter  (implicit bugs, hidden interactions)
      (future: test-verifier — executable business logic check)
  → ASSESS:
      Fix needed?      → discuss fix approach, new feature-dev iteration
      Agent paranoia?  → dismiss, record why
      Business logic mismatch? → return to Business Logic Audit (SCOPE drift)
      OK?              → record + done
  → RECORD:
      bd comments add {ID} "FINDING [tag]: review found X. Decision: Y."
```

Feature-dev enters at **code level** — business logic is already settled in the audit.

**How feature-dev phases map to lifecycle:**
- **Phase 1 (Discovery):** skipped or minimal — SCOPE already established in Business Logic Audit
- **Phases 2-5:** codebase exploration, clarifying questions, architecture, implementation —
  the core work. Feature-dev owns these fully.
- **Phase 6 (Quality Review):** feature-dev's own internal review. Catches obvious issues.
  This is NOT the review gate — it's part of the tool's work.
- **Phase 7 (Summary):** feature-dev presents what was done, what decisions were made,
  what trade-offs were accepted. This is the **handoff point** back to lifecycle.
  The summary is valuable — it documents the iteration's outcome. But it signals
  "tool finished its work", not "bead is done."

**After Phase 7 summary → lifecycle takes over:**
1. Review gate runs (external perspective: code-reviewer, silent-failure-hunter)
2. Assess: are review findings real problems or false alarms?
3. Record: FINDING from this iteration
4. Decision: another iteration (back to feature-dev) or done (proceed to finalize)

#### Probe Path

```
discuss → approve → probe → record
```

Probes are research instruments, not code delivery. Key discipline:
- **Verify against business logic before running.** A wrong instrument distorts the answer.
  Before probing, check: does the probe actually test what the SCOPE says we need to learn?
  A probe using the wrong API, wrong data shape, or wrong assumptions produces misleading FINDINGs.
- **Log everything.** Probes are ephemeral — if you don't capture the output, it's gone.
  Record raw data, not just conclusions.
- **Account for findings in subsequent work.** Probe results feed the iteration cycle.
  A FINDING from a probe may change the scope decision, invalidate assumptions,
  or reveal that the bead needs decomposition.

Two modes:
- **Local:** agent runs test directly → result → FINDING
- **Air-gapped:** agent prepares build, user transfers to isolated machine, returns logs.
  ```
  bd comments add {ID} "PROBE-PREPARED: build abc123, run on {machine}, expect {what}"
  → [user transfers and returns logs]
  → agent analyzes logs → FINDING
  ```

No formal review gate for probes — the probe result IS the verification.
But assess still applies: does the finding match business expectations?
If not → new iteration or scope revision.

#### Fix Path

```
investigate root cause → implement fix → verify (run tests / manual check) → record
```

Lightweight — no full feature-dev cycle needed for targeted fixes.

#### Research Path

Delegate to investigation skill (`@skills/investigation`). Returns with findings
presented to user → transition to discuss (may change scope decision).

#### Iteration Decisions

After each iteration, branching points:
- **Continue:** more iterations needed on current approach
- **Pivot:** approach works but not viable (see Recovery: Redirect)
- **Decompose:** too complex → current bead becomes epic, spawn children
- **Prerequisite:** need X before continuing → `bd create`, `bd dep add`
- **Scope expansion:** adjacent work discovered → `bd create` for it, continue current bead
- **Done:** work complete → proceed to finalize

### 5. Finalize (lightweight, every bead)

Quick checklist before closing. This is NOT compound — no patterns.md, no design
deep-dive. Just verify nothing is lost.

1. **FINDINGs complete?** Every iteration left a record?

2. **Review assumptions:**
   ```
   bd show {ID}
   → scan for ASSUMPTION records
   → each one: confirmed? contradicted? still open?
   ```

3. **Write LEARNED** for significant gotchas — to bead comments:
   ```
   bd comments add {ID} "LEARNED [tag]: ..."
   ```
   Note: patterns.md and design-doc updates happen during compound, not here.
   Exception — **breaking discoveries** go to patterns.md immediately: when reality
   fundamentally differs from what was assumed. Example: we assumed a method returns
   an array, but it returns an object requiring a cast — this is breaking, write it now.
   Don't try to predict what the "next bead" needs. Write immediately when
   the discovery changes how the system actually works vs. how it was understood.

4. **Verify blocking status** (hard rule 3)

5. **Spawn new nodes** if finalize reveals new work:
   ```
   bd create "Description" --deps {current-ID} --labels {domain}
   ```

6. **Close:**
   ```
   bd close {ID}
   ```

## Epics

Epics are beads with children. They emerge during work — a bead becomes an epic
when it's too complex for a single scope.

### When to Promote

- Task needs 3+ distinct sub-tasks with different approaches
- Cross-cutting concerns appear (e.g., "need resilience AND performance AND API redesign")
- Work will span multiple sessions and needs an anchor

### How to Promote

```
bd comments add {ID} "SCOPE: promoting to epic. Children: [list of sub-tasks]"
```
Then create children:
```
bd create "Sub-task 1" --parent {ID} --labels {domain}
bd create "Sub-task 2" --parent {ID} --labels {domain}
```

### Epic Lifecycle

- Epic stays open while children are in progress
- Epic's SCOPE comment describes the overall goal — children inherit context
- When all children close → review epic: is the goal met? New children needed?
- Close epic only when the business goal is achieved, not just when children are done

### Cross-Epic Dependencies

When a bead appears under multiple concerns:
```
bd dep add {bead-ID} {other-epic-ID}
```
The bead has one parent but can have dependency links to other epics.

## Comment Convention

**Prefixes** — every beads comment starts with one:
- `FINDING:` — iteration result (exact data: field names, error codes, actual behavior)
- `LEARNED:` — generalized gotcha (visible to neighbor nodes and future sessions)
- `ASSUMPTION:` — unverified decision (reviewed on finalize)
- `SCOPE:` — business logic synthesis from audit (confirmed by user)
- `SCOPE-DECISION:` — work type classification (feature/probe/fix/research)
- `SUPERSEDED:` — previous knowledge replaced (keep original, mark what changed)
- `BLOCKED:` — needs user decision (list options)
- `PROBE-PREPARED:` — air-gapped probe staged, waiting for user

**Tags** — domain/stack level, in brackets, 1-3 per record:
```
bd comments add {ID} "FINDING [com, vendorx]: resultCode -1 without errorMessage"
bd comments add {ID} "LEARNED [sql, vendorx]: code 810 for RUB, not 643 (ISO 4217)"
bd comments add {ID} "ASSUMPTION [dotnet]: using int for PK (guid may be needed for merge)"
```

Tag examples: `[com]`, `[sql]`, `[dotnet]`, `[rust]`, `[kafka]`, `[rest]`, `[grpc]`, `[vendorx]`
No semantic tags like `[currency-conversion]` — keep to stack/domain level.

**Labels** — bead-level metadata for search via `bd label list` / `bd ready`.
Same vocabulary as tags, applied to the bead itself.

Add at creation: `bd create "..." --labels com,vendorx`
Add during work: `bd label add {ID} sql`

Labels mirror comment tags. Keep updated — they enable `bd ready` filtering
and cross-bead search.

## Recovery Patterns

### Abandon
Dead end. LEARNED is mandatory.
```
bd close {ID} --reason abandoned
bd comments add {ID} "LEARNED [tag]: approach X doesn't work because Y.
  Alternatives: A (not tested), B (partially tested, see FINDING above)"
```

### Context Loss
Agent lost context (compact, crash, new session). Recovery = Context Load phase:
```
bd show {ID}
  → all FINDINGs (chronological = iteration history)
  → all ASSUMPTIONs (what's unverified)
  → all LEARNEDs (what's established)
  → SCOPE (business logic synthesis)
  → dependencies, parent epic
```
**Self-checking:** if `bd show {ID}` is insufficient to resume, record-discipline
was violated — report what FINDING is missing.

### Redirect (Pivot)
Feature works but isn't viable at scale, or requirements shifted.
Different from Abandon — the work has value, the direction changes.

```
bd comments add {ID} "FINDING [tag]: approach works for <N but not viable at scale.
  Performance: {measured}. Threshold: {required}. Root cause: {why it doesn't scale}."
bd comments add {ID} "LEARNED [tag]: {generalized lesson about the approach}"
```

Then:
- If the bead can be repurposed → update SCOPE, continue with new approach
- If fundamentally different work → close current, create new bead with dep link:
  ```
  bd close {ID} --reason redirected
  bd create "New approach: {title}" --deps {ID} --labels {domain}
  bd comments add {new-ID} "SCOPE: redirected from {ID}. Prior approach: {summary}.
    New direction: {what and why}."
  ```

Preserve the original bead's FINDINGs — they document what was tried.

### Revert
Merged code breaks another module.
```
bd create "Revert: {original title}" --deps {original-ID} --labels {domains}
bd comments add {new-ID} "FINDING: merge {commit} broke {what}. Root cause: {reason}"
→ revert commit → bd close {new-ID}
→ LEARNED in original node
```

### Sweep
Systematic scan of existing code for a specific class of problems (silent failures,
unchecked returns, naming inconsistencies). Not a bug fix — a dedicated audit pass.

```
bd create "Sweep: {what to find}" --labels {domain}
bd comments add {ID} "SCOPE: scanning {area} for {problem class}.
  Checklist: [specific things to look for]"
```

Each finding is recorded individually. Sweep bead closes when the scan is complete —
fixes may be separate beads spawned from the sweep.

## Red Flags

| Signal | Meaning | Action |
|--------|---------|--------|
| >5 iterations without LEARNED | Repeating same approach | Decompose or change approach |
| ASSUMPTION > FINDING count | More guesses than tests | More probes, fewer assumptions |
| >3 BLOCKED in a row | Stuck on external decisions | Review scope or dependencies |
| Node open >5 days, 0 FINDINGs | Idle, not researching | Prioritize or abandon |
| Implementing beyond original SCOPE | Absorbed adjacent tasks | Spawn bead, split commits |
| Feature-dev summary treated as bead close | Skipping review gate | Review gate is mandatory |
| No SCOPE comment after audit | Audit was skipped | Return to Business Logic Audit |
| Same review finding across 3+ iterations | Not learning from reviews | Pause, discuss pattern with user |

## Iteration History Check

Before starting work on a bead, check for existing context:
```
bd show {ID}
  → has SCOPE comment?   → "Business context established: [summary]"
  → has FINDING comments? → "Previous iterations found X, Y, Z — using that"
  → no SCOPE, no FINDING? → "First time on this bead — starting with Context Load"
```
