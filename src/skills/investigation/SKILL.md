---
name: investigation
description: Investigation-first discipline — deep research, vendor docs, sub-agent delegation, knowledge lookup. Use before writing code for unfamiliar APIs, proprietary systems, or complex integrations.
---

# Investigation

Research before code. For unfamiliar APIs, proprietary systems, or anything where
"it should work like this" might not match reality — investigate first.

## When to Use

- Unfamiliar SDK, API, or proprietary system
- Cross-module interaction with unclear contracts
- Bug with unclear root cause
- Any task where probe without investigation risks wasted iterations

## Investigation Protocol

### 1. Check Existing Knowledge

Before doing any new research, check what's already known:

```
bd show {ID}          → FINDINGs from previous iterations on this task
bd prime                     → context from related tasks
bd search --label learned:{tag}  → LEARNEDs from other tasks in this domain
```
Then check project files:
- `.context/patterns.md` — known gotchas for this domain
- `.designs/{module}.md` — current contract definitions
- `constitution.md` — applicable architectural gates

If a SCOPE record exists from the Discover phase (see `@skills/node-lifecycle`),
use it to focus the investigation on confirmed systems, constraints, and goals.

### 2. Read External Sources

Documentation, forums, vendor references. **Do not load large docs into main context.**

**For targeted questions (< 5 files):** use Grep/Read directly.

**For large reads (> 5 files, vendor docs, log analysis):** delegate to sub-agent:

```
Task tool, subagent_type: Explore

Question: [precise question — what you need to know]
Look in: [paths, URLs, file patterns]
Return: structured markdown, max 3KB
  - exact field names/types
  - error codes relevant to the task
  - threading/lifecycle constraints
  - known limitations
```

**Cost/benefit rule:**

| Scale | Approach |
|-------|----------|
| 1-3 files, targeted grep | Read directly in main context |
| 4-10 files, structured question | Sub-agent (Explore) |
| >10 files or docs >50KB | Always sub-agent, save summary |

### 3. Root Cause Tracing (for bugs)

When investigating a bug, trace backward through the call chain:

1. Start from the symptom (error, crash, wrong output)
2. Identify the immediate cause (which call returned unexpected result)
3. Trace one level deeper — why did that call behave that way?
4. Repeat until you reach the root cause or an external system boundary
5. Record each level as a FINDING

This prevents fixing symptoms while the root cause persists.

### 4. Present Findings

Investigation ends with findings presented to user:

```
## Investigation Results

**Goal:** {what we needed to understand}

**Findings:**
1. {finding with exact details}
2. {finding with exact details}

**Risks:**
- {risk identified during investigation}

**Proposed Approach:** {what to try in the first probe}

**Open Questions:**
- {question that investigation didn't answer}
```

After user reviews → transition to **discuss** phase (see `@skills/node-lifecycle`).

## Vendor Documentation Pattern

For proprietary SDKs with poor documentation:

1. **Never trust documentation blindly** — probe to verify
2. Delegate doc reading to sub-agent with targeted question
3. Save extracted summary to patterns.md or relevant design-doc
4. Reference the summary in future sessions — don't re-read original
5. Mark unverified claims as ASSUMPTION

```
Task tool, subagent_type: Explore

Read the {VendorX} SDK documentation at {path}.
Extract:
  1. How {specific operation} works (parameters, return types, error codes)
  2. Threading/lifecycle constraints
  3. Batch limits, rate limits, known issues
Return as structured markdown with exact field names and types.
```

## Sub-Agent Escalation

If a sub-agent hits a decision point during investigation:

```
bd comment {ID} "BLOCKED: investigation found two possible approaches:
  A) {approach A — pros/cons}
  B) {approach B — pros/cons}
  Need user decision before proceeding."
```

Sub-agent returns control. Main agent presents the question to user.
