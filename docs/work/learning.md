# Turn dialogue into reusable work

[Continuity workflow](workflow.md) · [Folder map](../../CONTEXT.md) · [Work index](README.md)

## Trigger and purpose

Use this process when the owner corrects behavior, explains a constraint, changes
an earlier decision, or asks to retain a successful way of working. Also use it
when a completed task reveals a repeatable process. Capture the useful outcome
while doing the authorized task; do not require the owner to repeat the correction
or approve a clerical documentation update.

A request to remember a method updates documentation. It does not authorize
running that method against production or performing unrelated work.

## Extract only what the conversation supports

| Field | Record |
| --- | --- |
| Goal | The requested outcome and affected scope |
| Constraint or correction | What must hold, what was wrong, or what changed |
| Source | Date and a concise paraphrase of the owner's instruction, or a stable document/issue reference |
| Decision and reason | The chosen behavior and the reason actually stated; label an agent-inferred reason explicitly |
| Assumption | Any unresolved inference; do not silently turn it into an owner decision |
| Acceptance example | A concrete input/action and observable expected result |
| Evidence | What was inspected or run, its result, and what remains unverified |

Do not store complete chat transcripts, private customer details, attachment paths,
or hidden model reasoning. A short decision rationale is enough. If the source is
missing, say so. Code shows existing behavior; it does not prove user intent.
The hypothetical warranty correction used to explain this method is an example,
not a recovered historical owner instruction.

## Put each result in its owning document

| Result | Destination |
| --- | --- |
| Durable product behavior | Existing topic specification |
| Global working rule | Root AGENTS.md, with details linked to the owning workflow |
| Folder responsibility or architecture decision | Folder context or project structure document |
| Repeatable multi-step method | A focused document in `docs/work/procedures/` |
| Temporary question, attempted fix, or run evidence | The task's existing handoff |

Link the canonical decision from procedures and handoffs instead of repeating it.
For a material decision, add a compact record in the owning document:

```markdown
### <Decision title>

Recorded: YYYY-MM-DD
Source: <owner instruction paraphrase or document/issue reference>
Decision: <behavior and scope>
Reason: <stated rationale, or explicitly labeled inference>
Supersedes: <earlier decision, or None>
Acceptance: <observable example or link to a test/procedure>
Evidence: <link to dated results; do not imply unrun checks passed>
```

Skip a separate record for minor edits whose intent is already clear in the owning
text. If a decision changes, update the canonical rule and mark the old decision
superseded where retaining its rationale is useful. Remove stale instructions
from linked contexts/procedures. Ask only if a material conflict cannot be resolved
from the current request and existing evidence.

## Build a procedure from an actual task

1. State the trigger, task scope, prerequisites, and source of the requirement.
2. List the smallest set of input files and concrete entrypoints to inspect.
3. Write ordered steps with an expected intermediate result. Mark where an
   unresolved assumption prevents the next step.
4. Add representative success and failure cases, with observable expected results.
5. Identify existing tests or commands and state what each can and cannot prove.
6. Run the checks appropriate to the authorized work. Record date, environment,
   command, result, tested revision or working-tree identity, and limitations in
   the handoff. Never promote a method based only on its test filenames.
7. Link the procedure from the owning context and work index so a matching request
   can find it. Load only the matching procedure when the task recurs.

Use descriptive, stable names such as `warranty-status.md`. Procedures are durable
instructions; handoff status/version filenames apply only to dated work artifacts.
A procedure does not need a SKILL.md wrapper to be explicitly read through the
project's context links. Add automation only when a repeated deterministic step
has a demonstrated need and suitable verification.

## Evidence levels

| Level | Meaning |
| --- | --- |
| Proposed | Steps or expected behavior are written but not checked against implementation |
| Source-reviewed | Relevant code and specifications were inspected; execution is unverified |
| Partially verified | Named checks passed, with remaining paths or environments listed |
| Verified for the recorded scope | All acceptance checks for that scope passed in the stated environment |

These levels describe evidence, not owner approval or deployment. A narrow mocked
test can support a partially verified method without proving browser behavior,
real persistence, or production readiness. Later code or requirement changes can
invalidate earlier evidence; review it before reuse. If a check fails, record the
failure and revise the method instead of continuing to call it verified.

## Applying this workflow now

The first concrete procedure is [warranty status work](procedures/warranty-status.md).
Its current evidence belongs in the [warranty handoff](handoffs/handoff-warranty-review-v1.md).
The owner's request in this conversation authorizes documenting and clarifying
this process. It does not supply missing historical product decisions.
