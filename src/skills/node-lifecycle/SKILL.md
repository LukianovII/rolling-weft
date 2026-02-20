---
name: node-lifecycle
description: Core development workflow — task phases, findings, assumptions, and finalization rules. Use when working on any tracked task (bead).
---

# Node Lifecycle

Every task (bead) follows a lifecycle. Phases are context, not a strict sequence —
real work is nonlinear. But three rules are always enforced.

## Hard Rules

1. **Record after probe.** Every probe iteration must leave a FINDING.
   No probe without `bd comment {ID} "FINDING [tag]: ..."`.
   Unrecorded probes are lost knowledge.

2. **Review assumptions on finalize.** Before `bd close`, review every
   ASSUMPTION record: confirmed? contradicted? still unknown?
   Unreviewed assumptions are hidden risks.

3. **Verify blocking status on finalize.** Before closing or pausing, ask the user:
   - Where are we going next?
   - Does the next task **block** this one? (prerequisite discovered → `bd dep add`)
   - Or is this node **suspended**? (user switches to other work, returns later)
   A suspended node is not blocked, but continues to block its parent epic.

## Phases

### Plan
What are we solving? What are the risks? What existing knowledge applies?
- Check `bd show {ID}` for description and context
- Check `.designs/` for relevant contracts
- Check `constitution.md` for applicable gates

### Discover (optional)
After reading existing context (Plan), if the task description is ambiguous —
ask the user clarifying questions before starting investigation.

This is similar to how plan mode asks questions, but focused on **what the task is**
(not how to implement it). The goal: turn a vague request into a clear problem statement.

**When to discover:** the agent read the request and something is unclear —
scope, affected systems, expected behavior, constraints. Questions arise from
the specific ambiguity, not from a fixed checklist.

**Offer a choice:**
> "Before investigating, I'd like to clarify a few things — or I can start
> with a broader investigation. Which do you prefer?"

**If user answers** — record as scope context:
```
bd comment {ID} "SCOPE: user confirmed — only COM side, backend unchanged.
  Constraint: must work with existing int PK. Done = test passes on target machine."
```

**If user skips** — proceed directly to Investigate with a broader search.

Skip discovery when the task is already clear and narrow.

### Investigate
Read-only. Gather knowledge before touching code.
- If Discover produced SCOPE: use it to focus the search
- Read documentation, forums, existing FINDING/LEARNED from related beads
- Check `.context/patterns.md` for known gotchas
- Delegate heavy reads to sub-agent (see `@skills/investigation`)
- **Do not write code yet** — only collect information

### Retry Loop: discuss → approve → probe → record

**Discuss:** What approach do we try next?
- If there are existing FINDINGs: "Previous iterations found X, Y, Z — accounting for that..."
- If no FINDINGs: "First iteration, starting with approach A because..."
- Branching points:
  - **Prerequisite:** "We need X before we can continue" → new node, `bd dep add`
  - **Decomposition:** "This is too complex as one question" → current becomes epic, spawn N children

**Approve:** Decision made, proceeding with chosen approach.

**Probe:** Isolated trial — prototype, API call, test run, build.
Two modes:
- **Local:** Agent runs test directly → result → record FINDING
- **Air-gapped:** Agent prepares build, user transfers to isolated machine, returns logs.
  ```
  bd comment {ID} "PROBE-PREPARED: build abc123, run on {machine}, expect {what}"
  → [user transfers and returns logs]
  → agent analyzes logs → record FINDING
  ```

**Record:** Write what happened.
```
bd comment {ID} "FINDING [com, vendorx]: GetProducts returns Object[], not Product[].
  Cast works for <100 elements, ArrayTypeMismatchException for >100."
```

### Finalize
Work on this node is done (or abandoned). Checklist:

1. **Review assumptions:**
   ```
   bd show {ID}
   → scan for ASSUMPTION records
   → each one: confirmed? contradicted? still open?
   ```

2. **Write LEARNED** for gotchas discovered during this work:
   ```
   bd comment {ID} "LEARNED [com, vendorx]: batch limit 100 per call, undocumented.
     ~600ms latency per call. For >1000 elements use parallel batching."
   ```

3. **Update design-doc** if findings change a contract (see `@skills/design-docs`)

4. **Verify blocking status** (hard rule 3)

5. **Spawn new nodes** if finalize reveals new work:
   ```
   bd create "Implement batch fetcher with retry" --deps {current-ID}
   ```

6. Close:
   ```
   bd close {ID}
   ```

## Comment Convention

**Prefixes** — every beads comment starts with one:
- `FINDING:` — probe result (exact data: field names, error codes, actual behavior)
- `LEARNED:` — generalized gotcha (visible to neighbor nodes and future sessions)
- `ASSUMPTION:` — unverified decision (reviewed on finalize)
- `SUPERSEDED:` — previous knowledge replaced (keep original, mark what changed)
- `BLOCKED:` — sub-agent needs user decision (list options)
- `PROBE-PREPARED:` — air-gapped probe staged, waiting for user

**Tags** — domain/stack level, in brackets, 1-3 per record:
```
bd comment {ID} "FINDING [com, vendorx]: resultCode -1 without errorMessage"
bd comment {ID} "LEARNED [sql, vendorx]: code 810 for RUB, not 643 (ISO 4217)"
bd comment {ID} "ASSUMPTION [dotnet]: using int for PK (guid may be needed for merge)"
```

Tag examples: `[com]`, `[sql]`, `[dotnet]`, `[rust]`, `[kafka]`, `[rest]`, `[grpc]`, `[vendorx]`
No semantic tags like `[currency-conversion]` — keep to stack/domain level.

## Recovery Patterns

### Abandon
Research showed dead end. No successful result, but LEARNED is mandatory.
```
bd close {ID} --reason abandoned
bd comment {ID} "LEARNED [tag]: approach X doesn't work because Y.
  Alternatives: A (not tested), B (partially tested, see FINDING above)"
```

### Context Loss
Agent lost context (compact, crash, new session). Context must be recoverable from beads:
```
bd show {ID}
  → all FINDINGs (chronological = iteration history)
  → all ASSUMPTIONs (what's unverified)
  → all LEARNEDs (what's established)
  → dependencies, parent epic
```
**Self-checking property:** if `bd show {ID}` is insufficient to resume work,
record-discipline was violated — report what FINDING is missing.

### Revert
Merged code breaks another module.
```
bd create "Revert: {original title}" --deps {original-ID}
bd comment {new-ID} "FINDING: merge {commit} broke {what}. Root cause: {reason}"
→ revert commit → bd close {new-ID}
→ LEARNED in original node (or integration-repo if cross-module)
```

## Red Flags

Patterns that signal the process is stalling:

| Signal | Meaning | Action |
|--------|---------|--------|
| >7 retries without LEARNED | Repeating same thing | Decompose or change approach |
| ASSUMPTION > FINDING count | More guesses than tests | Strengthen investigate phase |
| >3 BLOCKED in a row | Stuck on external decisions | Review scope or dependencies |
| Node open >5 days, 0 FINDINGs | Idle, not researching | Prioritize or abandon |

## Retry Loop Detection

Before starting work on a bead, check for existing findings:
```
bd show {ID}
  → has FINDING comments? → "Previous iterations found X, Y, Z — using that"
  → no FINDING comments? → "First iteration, starting with investigate"
```
