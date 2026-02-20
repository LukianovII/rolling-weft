---
name: constitution
description: Guided setup and revision of constitution.md — turns the template into a real architectural gate document for the project. Use when setting up a new project, onboarding, or when new constraints are discovered.
---

# Constitution Setup

The constitution is a set of architectural gates — rules checked before
every significant technical decision. This skill helps turn the template
into a working document for a specific project.

## When to Use

- **Initial setup** — after `setup.js`, constitution.md is a template with placeholders
- **New constraint discovered** — a FINDING or LEARNED reveals a rule that should be permanent
- **Architecture review** — periodic check that gates match reality

## Process

### 1. Read Current State

Read `constitution.md` and classify each gate:
- **Filled** — has a real value (not a placeholder `{...}`)
- **Placeholder** — still contains `{...}` or `<!-- ... -->` markers
- **Irrelevant** — gate doesn't apply to this project's stack

### 2. Gather Project Context

Read existing project files to pre-fill what's already known:
- `CLAUDE.md` → Project Context section (platform, stack, external systems)
- `.designs/index.md` → module graph, protocols
- `.context/patterns.md` → known constraints from experience
- `constitution.md` → what's already filled in

### 3. Ask Clarifying Questions

For each section with placeholders, ask the user what applies.
Questions should be concrete and offer choices where possible:

**Don't ask:** "What are your concurrency constraints?"
**Ask:** "Your project uses COM interop. Do you have STA threading constraints?
Are there rules about mixing async and COM calls?"

Work through the template section by section. For each:
- If the project context already implies the answer → propose it, ask to confirm
- If unclear → ask with examples relevant to the detected stack
- If the section doesn't apply → suggest removing it

### 4. Add Domain-Specific Gates

After filling existing sections, ask:
> "Are there project-specific constraints not covered by the standard sections?
> For example: vendor API quirks, deployment rules, data handling requirements."

Common additions by domain:
- **COM interop:** STA rules, object lifetime, apartment threading
- **gRPC/Kafka:** message size limits, schema versioning, backwards compatibility
- **Financial:** decimal precision, currency code handling, audit trail
- **Multi-platform:** path handling, line endings, file system case sensitivity

### 5. Clean Up

- Remove all placeholder markers (`{...}`)
- Remove HTML comments (`<!-- ... -->`)
- Remove the trailing instruction comment
- Ensure every gate is a concrete, verifiable statement (not aspirational)

## Gate Quality Checklist

A good gate is:
- **Specific** — "gRPC timeout: 30s default, 120s max" not "use reasonable timeouts"
- **Verifiable** — can be checked during code review or by the agent
- **Actionable** — clear what to do if violated (see Violation Protocol)
- **Grounded** — comes from real experience, a FINDING, or a known constraint

A bad gate is:
- Vague ("follow best practices")
- Never violated (too obvious to be worth stating)
- Aspirational without enforcement ("we should eventually...")

## Updating Existing Constitution

When a new constraint is discovered during work:

```
bd comment {ID} "LEARNED [tag]: {constraint discovered}"
```

Then decide: is this a one-time gotcha (→ patterns.md) or a permanent
architectural rule (→ constitution.md)?

**Promote to constitution when:**
- The constraint affects all future work in this area
- Violating it causes hard-to-debug failures
- It's a platform/runtime limitation, not a coding preference

Add the new gate to the relevant section, referencing the FINDING that discovered it:
```markdown
- [ ] COM batch calls limited to 100 items (discovered: BD-042 FINDING)
```
