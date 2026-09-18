# Repository skills

[Task map](../docs/product/spec.md) · [Root rules](../AGENTS.md)

## Purpose and inputs

Own reusable agent skills requested for this repository. Read root rules,
[project structure](../docs/architecture/project-structure.md), and the selected
skill before working here. This folder stores skill sources; its presence alone
does not establish automatic discovery by an agent application.

Read [folder instructions](AGENTS.md) and the
[official GitHub Flow guide](https://docs.github.com/en/get-started/using-github/github-flow)
for GitHub collaboration tasks.

## Tasks

| Request | Process | Output |
| --- | --- | --- |
| Prepare or perform a GitHub push | Read [github-push](github-push/SKILL.md), resolve scope, validate, and publish only when authorized. | Reviewed changes and verifiable publication status. |
| Follow GitHub Flow | Follow the collaboration lifecycle below and use the push skill for each publication step. | A focused branch, reviewed pull request, and verified status for the authorized steps. |
| Maintain a skill | Update its instructions and official references; validate metadata and links. | A focused skill folder containing `SKILL.md`. |

## GitHub Flow

The official guide describes a branch-based collaboration lifecycle:

1. Create a descriptive branch for a focused change; keep unrelated work separate.
2. Make changes, then commit and push them with descriptive messages.
3. Open a pull request describing the problem and changes; use a draft for early feedback.
4. Address review comments, push revisions, and resolve failing checks or conflicts.
5. Merge after approval and satisfaction of applicable branch protections.
6. Delete the completed branch after merging.

The local command sequence within step 2 remains `git status` → `git add` →
`git commit -m` → `git push`, as detailed in the
[push skill](github-push/SKILL.md#execute-in-order-add-commit-push).
GitHub Flow covers the broader collaboration lifecycle; the command sequence
performs its publication step.

Apply repository-specific destinations and release requirements from the
[deployment specification](../docs/product/operations/deployment.md#automated-releases).
Documenting this lifecycle does not authorize running it. Execute only the steps
covered by the current request; preserve existing authorization and do not infer
merge, deployment, or branch-deletion permission from a push-only request.

### Source decision

Recorded: 2026-09-18. Source: the owner asked to read `Skill/AGENTS.md`, which
links the official GitHub Flow guide and instructs adding it to `CONTEXT.md`.
Decision: record the guide in this folder's context and distinguish the full
lifecycle from the push command sequence. Reason: the folder instruction names
GitHub's documentation as the source. Assumption: `CONTEXT.md` means this owning
folder context, already linked from the workspace map. Supersedes: none; the
required add/commit/push order remains. Acceptance: a collaboration request can
reach the official lifecycle and the detailed push procedure from this context.
Evidence: source-reviewed against the official guide; this documentation update
does not establish a completed review, merge, or deployment.

## Boundaries and verification

Keep skill content in English. Skill creation does not authorize executing its
external actions. Keep product rules in their existing specifications. Validate
skill metadata, relative links, and the scoped diff; distinguish document
validation from an actual GitHub push.

## Placement decision

Recorded: 2026-09-18. Source: the owner requested a GitHub push skill in the Skill
folder, using standards directly from GitHub. Decision: store it at
`Skill/github-push/` and cite official GitHub documentation. Assumption: "Skill"
means a folder in this workspace; no global installation was requested. Reason:
the owner explicitly requested GitHub as the source. Supersedes: None.
Acceptance: the linked skill supplies a scoped push procedure and official
references. Evidence level: source-reviewed; live publication is unverified.
