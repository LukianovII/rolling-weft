---
name: test-verifier
description: >
  Executable verification of business logic after feature implementation.
  Collects review context into a file, spawns a sub-agent that writes targeted tests,
  runs them, and writes results to disk. Returns file paths — analysis is the caller's job.
  Use after code-reviewer / silent-failure-hunter, or manually when you need executable proof.
---

# Test Verifier

Executable proof, not static guessing. Write tests → run them → report pass/fail.

**This skill is a two-layer orchestrator:**
1. You (the orchestrator) collect context into a file
2. You spawn a sub-agent that does all the work
3. Sub-agent writes results to files
4. You return paths to the caller

You do NOT analyze results. You do NOT fix bugs. You deliver facts.

---

## Step 1 — Collect Context

Create the directory `.verification/` at project root (if it doesn't exist).

Write `.verification/context.md` with everything the sub-agent will need:

```markdown
# Verification Context

## SCOPE / Business Logic
[Paste or summarize the bead SCOPE from Business Logic Audit.
If no SCOPE exists, paste relevant sections from constitution.md or patterns.md.]

## Review Findings
[Paste findings from code-reviewer and/or silent-failure-hunter.
If no review was run, write "No review findings available — verify from SCOPE only."]

## Diff Summary
[Run `git diff` (staged + unstaged) or `git diff main...HEAD`.
Paste a summary of what changed — files, functions, logic.]

## Stack Hints
[If you already know the language/framework/test runner, note it here.
Otherwise write "Auto-detect" and the sub-agent will figure it out.]
```

**Important:** do not dump raw multi-thousand-line diffs. Summarize: which files changed,
what logic was added/modified, what business rules are affected.

---

## Step 2 — Spawn Sub-Agent

Use the Agent tool (subagent_type: general-purpose) with this prompt structure:

```
You are a test-verifier agent. Your job: write targeted tests, run them, report results.

**Rules:**
- NEVER modify production code
- NEVER change test assertions to make failing tests pass
- NEVER run the full project test suite — only your verification tests
- Write tests for BUSINESS SCENARIOS, not method coverage

**Input:** read `.verification/context.md` for full context.

**Output:** write all results to `.verification/`:
- `report.md` — structured report (format below)
- Test files in `.verification/tests/` (language-appropriate structure)

## Your procedure:

### 1. Read Context
Read `.verification/context.md`. Extract:
- Business rules to verify
- Suspicious areas from review findings
- What changed in the diff

### 2. Detect Stack
If not specified in context, detect automatically:
- `package.json` → JS/TS, check for jest/vitest
- `pyproject.toml` / `requirements.txt` → Python, check for pytest
- `*.sln` / `*.csproj` → C#/.NET, check for xunit/nunit/mstest
- `pom.xml` / `build.gradle` → Java, check for junit
Record: language, test framework, runner command.

### 3. Plan Tests
Build a prioritized list (do NOT write code yet):
1. Areas flagged by silent-failure-hunter (highest priority)
2. Areas flagged by code-reviewer
3. Edge cases from SCOPE (boundary values, business rule thresholds)
4. Implicit interactions visible in the diff

For each test, record: scenario name, what to assert, source of suspicion.

If a business rule is ambiguous, record an ASSUMPTION and proceed.

### 4. Write Tests
Create `.verification/tests/` directory. Write test files there.

Rules:
- Test names = business scenarios: `batch_processing_fails_for_over_100_items`
- Each test is self-contained: own setup, own data, own assertions
- Use realistic values matching SCOPE thresholds (not "foo" or 42)
- Mark each test with a SOURCE comment:
  `# SOURCE: silent-failure-hunter — suspected overflow on batch > 100`
- If no suspicions exist, write at minimum 3 edge-case tests from the diff

### 5. Run Tests
Run ONLY the verification tests using the detected runner, scoped to `.verification/tests/`.

If runner fails to start (import error, missing dep): fix the mechanical issue (max 2 attempts).
Do NOT change assertions or test logic to make tests pass.
If unresolvable in 2 attempts, note it as a BLOCKER in the report.

### 6. Write Report
Write `.verification/report.md` in this exact format:

```
## Test Verifier Report

### Stack
Language: {language}
Framework: {framework}
Runner: {command used}

### Assumptions
{List all ASSUMPTION entries, or "None"}

### Results

#### {Business Scenario Name}
Status: PASS | FAIL | BLOCKER
Source: {code-reviewer | silent-failure-hunter | scope | diff-analysis}
{If FAIL: actual vs expected, stack origin}
{If BLOCKER: what prevented execution}

...repeat for each scenario...

### Summary
Total: {N} tests — {P} passed, {F} failed, {B} blocked

### Findings
{FINDING entries for failed tests, or "No findings."}

### Artifacts
Test files: .verification/tests/
```

Do not ask questions. Do not open a dialog. Write the report and finish.
```

---

## Step 3 — Return Paths

After the sub-agent finishes, return a brief message to the caller:

```
## Test Verification Complete

Results: `.verification/report.md`
Tests:   `.verification/tests/`

Summary: {N} tests — {P} passed, {F} failed, {B} blocked
```

That's it. Do not analyze. Do not recommend fixes. The caller decides what to do next:
- Read the report themselves
- Pass it to another agent for analysis
- Use findings in consolidation

---

## Cleanup

`.verification/` is ephemeral. It is NOT part of the permanent test suite.

After the caller has processed results:
- Tests that caught real bugs → move to main test suite (after fixing the bug)
- Tests that confirmed correct behavior → evaluate for permanent inclusion
- Everything else → delete `.verification/`

Add `.verification/` to `.gitignore` if not already there.

---

## Constraints

- **Never modify production code** — tests only
- **Never fix failing tests** — report, don't repair
- **Never run full test suite** — verification tests only
- **Never create trivially passing tests** — no `assert True`
- **Context file is the single source of truth** — sub-agent reads only that file
- **Results are files, not conversation** — report.md is the deliverable
