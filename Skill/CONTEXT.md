# Repository skills

[Task map](../docs/product/spec.md) · [Root rules](../AGENTS.md)

## Purpose and inputs

Own reusable agent skills requested for this repository. Read root rules,
[project structure](../docs/architecture/project-structure.md), and the selected
skill before working here. This folder stores skill sources; its presence alone
does not establish automatic discovery by an agent application.

## Tasks

| Request | Process | Output |
| --- | --- | --- |
| Prepare or perform a GitHub push | Read [github-push](github-push/SKILL.md), resolve scope, validate, and publish only when authorized. | Reviewed changes and verifiable publication status. |
| Maintain a skill | Update its instructions and official references; validate metadata and links. | A focused skill folder containing `SKILL.md`. |

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
