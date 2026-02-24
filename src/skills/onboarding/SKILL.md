---
name: onboarding
description: Project inception session — establishes what the project is before any code is written. Use once, at project start, to fill CLAUDE.md Project Context, seed constitution.md, sketch .designs/index.md, and create the root bead. Not a form — a conversation.
---

# Onboarding

This is an inception session, not a task. The goal is to understand the project
well enough to give the agent durable context for all future work.

The format is a conversation: agent asks, user answers as much or as little as
they know. Answers don't have to be complete — partial knowledge is still useful.
Gaps are recorded as open questions.

## When to Use

- After `setup.js`, when CLAUDE.md Project Context is still a placeholder
- When adding a major new module that needs its own context (re-run scoped to module)

## Conversation Guide

Open with:
> "Let's establish what we're building. I'll ask a few questions — answer what
> you know, skip what you don't. We'll capture what emerges and fill gaps later."

Then work through the areas below. Don't ask all questions at once — listen to
each answer and ask follow-up questions based on what's unclear or interesting.
The sequence is a guide, not a script.

### 1. Purpose and Ideal Result

Start here. Everything else follows from what the project is actually for.

- What are we building, and for whom?
- What does this project fit into — what larger system or process does it serve?
- **IFR question:** If there were no technical constraints, no legacy, no budget —
  what would this project do in its ideal form? What's the simplest imaginable
  version of success?
- What does "done" look like for this project? How will we know it works?

The IFR answer is mandatory. It becomes the SCOPE of the root bead.
Even a rough answer is better than none — it can be revised.

### 2. Tensions and Constraints

Problems exist because of tensions between requirements. Surface them early.

- What makes this project hard? What will push back?
- What are the non-negotiables — things that cannot be sacrificed?
- Are there known contradictions? (fast vs. reliable, maintainable vs. fast to ship,
  isolated vs. integrated)

Tensions that cannot be resolved become constitution gates.
Tensions that can be resolved suggest architectural decisions to make early.

### 3. System Context

Understand what the project connects to.

- What external systems does this integrate with?
  (proprietary APIs, legacy systems, databases, message brokers)
- What's the deployment environment? What platform and runtime?
- What does the team already have that this project can rely on?
  (existing libraries, infrastructure, established patterns)

External systems with poor documentation → candidates for early investigation beads.

### 4. Stack and Known Constraints

- Platform: Windows / Linux / both?
- Runtime: .NET / Rust / Node.js / other?
- Are there known constraints of the chosen stack?
  (COM threading, async restrictions, specific serialization requirements)

Known constraints become constitution gates immediately.

### 5. Open Questions

After the conversation, list anything that came up but couldn't be answered:
- Missing documentation
- Unclear system boundaries
- Unresolved technical choices

These become investigation beads — work to do before or alongside the first feature.

---

## After the Conversation

### Fill the Documents

**CLAUDE.md — Project Context section:**
Synthesize from the conversation. Keep it concise — this loads every session.

```markdown
## Project Context

**Domain:** {what the project does, one sentence}
**Platform:** {platform and runtime}
**Key constraint:** {the most important non-negotiable, one sentence}
**External systems:** {list}
**Reference:** `.context/patterns.md` for known gotchas
**Constitution:** `constitution.md` for architectural gates
```

**constitution.md:**
Fill Platform & Stack and any gates that are already clear from the conversation.
For everything else: call `@skills/constitution` to work through it properly.
Incomplete constitution is fine — it grows as the project grows.

**`.designs/index.md`:**
Sketch the top-level system map based on what's known. Even one node is enough
to start. Use what emerged from "System Context" above.

### Create the Root Bead

```
bd create "Project: {title}"
```

Then record the IFR as mandatory SCOPE:

```
bd comment {ID} "SCOPE: IFR — {what ideal success looks like without constraints}.
  Real constraints: {what actually limits us — stack, legacy, environment}.
  Done when: {observable definition of done}.
  Open questions: {what we don't know yet}"
```

This bead is the project's root epic. All future feature beads are its children.
Future sessions can `bd prime` from any task and trace back to this context.

### Record Open Questions as Investigation Beads

For each open question from step 5:

```
bd create "Investigate: {question}" --parent {root-ID}
```

These can be worked in any order, before or alongside feature work.

### Commit the Initial State

```
git add CLAUDE.md constitution.md .designs/index.md
git commit -m "Add project context and initial gates"
```

---

## Signs the Conversation Went Well

- IFR is written down, even roughly
- At least one tension is named
- External systems are listed (even partially)
- Platform and runtime are confirmed
- Root bead exists with SCOPE
- You know what you don't know (open questions are listed)

## Signs to Revisit

- Project Context section still has placeholder text after onboarding
- Root bead has no SCOPE comment
- No tensions identified (almost always means they weren't surfaced, not that they don't exist)

---

## Acknowledgements

The conversation structure in this skill draws on four concepts from TRIZ
(Theory of Inventive Problem Solving, Genrich Altshuller):

- **IFR (Ideal Final Result)** — formulating the goal unconstrained by current limitations
- **Contradictions** — tensions between requirements that shape architectural decisions
- **System levels** — understanding supersystem, system, and subsystem context
- **Resources** — inventory of what already exists before inventing new solutions

TRIZ was designed for engineering invention; these four concepts transfer
cleanly to software project inception. The full TRIZ methodology (40 inventive
principles, 39×39 contradiction matrix, Su-Field analysis) is not used.
