---
name: github-push
description: Publish scoped changes to GitHub in order using git add, git commit -m, and git push, following official GitHub guidance. Use for push or push-preparation requests; editing this skill alone does not authorize publication.
---

# GitHub Push

Publish the requested changes to the intended GitHub branch and verify the remote
result. Follow repository instructions and existing session authorization.

For new or modified files, the required order is `git add` → `git commit -m` →
`git push`. Complete and verify each step before proceeding. A push sends commits;
it does not include uncommitted working-tree changes. Updating this skill is a
local editing task unless the user also requests publication.

## Official basis

This procedure adapts official GitHub documentation; it is not a GitHub-issued
certification or a universal international standard. Source review: 2026-09-18.
Consult the relevant live page when requirements or errors need clarification:

- [Adding a file using the command line](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository#adding-a-file-to-a-repository-using-the-command-line): stage with `git add`, commit with `git commit -m`, then push.
- [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow): descriptive branches, focused commits, and pull requests for review.
- [Pushing commits](https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository): explicit remote/branch selection and blocked pushes.
- [Non-fast-forward errors](https://docs.github.com/en/get-started/using-git/dealing-with-non-fast-forward-errors): fetch and reconcile remote changes instead of overwriting them.
- [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): configured checks, reviews, signing, and history rules.

The safeguards below are this skill's operating procedure. Conventional Commits,
branch prefixes, a particular merge strategy, and signed commits are not universal
GitHub requirements. Follow them when the repository requires them.

## Establish scope and destination

1. Read applicable `AGENTS.md`, contribution guidance, and verification commands.
   Inspect `git status --short --branch`, `git branch -vv`, staged and unstaged
   diffs, and recent commits. Inspect untracked files only when in scope.
2. Resolve the intended repository, push remote, local branch, and destination
   branch from the request and Git configuration. Check push URLs as well as
   fetch URLs, but redact credentials before displaying any URL. Do not assume
   `origin` is writable or that the default branch is `main`. Resolve detached
   HEAD or ambiguous destinations before publication.
3. Use existing Git credentials. GitHub CLI is optional; when needed and available,
   use `gh auth status` without displaying tokens. Missing credentials require
   the user's normal authentication flow, never a token pasted into conversation.
4. Inspect repository rules and workflows where accessible, including push-triggered
   deployment. Honor protections. For new work, prefer a topic branch; preserve
   an explicitly requested destination if policy permits it. If blocked, explain
   the blocker before changing the publication target. A push request does not
   authorize separate deployments, merges, releases, tags, settings changes, or
   branch deletion.

## Prepare only the requested change

- Fetch the selected remote and inspect outgoing commits relative to the
  destination. For a new branch, compare with its intended base. Review all
  commits that will publish, including existing local commits, not just today's
  diff. Resolve unrelated outgoing history before pushing.
- Preserve unrelated working-tree and staged changes. Stage explicit paths or
  selected hunks; avoid blanket staging in a mixed working tree. A commit includes
  the entire index: isolate intended work without silently unstaging, stashing,
  discarding, or committing someone else's changes.
- Review outgoing changes for credentials, private customer data, runtime state,
  unintended generated files, and oversized binaries. Ignore rules do not remove
  tracked files or secrets in outgoing history. Never expose secret values in
  reports or bypass a secret-protection rejection.
- Run repository-required checks for the changed file types. Ensure checked
  content represents the commit being pushed; unrelated local edits can mask
  failures. Report failed or unavailable checks accurately.
- Inspect `git diff --cached --check` and the staged diff before committing.
  Create a focused descriptive commit only when needed and within scope. Preserve
  configured identity and signing rules; do not invent an author, disable hooks,
  or rewrite existing commits merely to standardize messages.

## Execute in order: add, commit, push

After the scope review and required checks above, run these steps sequentially.
Replace the example path and message with the reviewed files and actual change;
resolve and validate the remote and destination variables before execution.

1. Stage only the intended changes:

   ```sh
   git add -- path/to/reviewed-file
   git diff --cached --check
   git diff --cached
   ```

2. Once the staged diff is correct and checks pass, create the commit:

   ```sh
   git commit -m "Describe the completed change"
   git log -1 --oneline
   git status --short
   ```

3. Only after the commit succeeds, push that commit to the resolved destination:

   ```sh
   git push "$push_remote" "HEAD:refs/heads/$destination_branch"
   ```

If staging, verification, or commit fails, resolve it before pushing. If the user
explicitly asks to push an already-created commit and there are no new in-scope
changes, verify that commit instead of creating an empty or duplicate commit.
Report that the add/commit steps were completed previously.

Use the existing appropriate branch. A routine push request, including "follow
the flow," means this sequence; it does not by itself request a new branch, a
cherry-pick, or a pull request. Use a separate branch or PR when requested or
required by repository policy, while retaining the add/commit/push order.

## Authorization and remote verification

A request to push authorizes the scoped push; do not ask for repeated permission.
A preparation-only request ends with a reviewable diff, check results, and the
exact proposed destination. Ask only when material scope or authorization is
missing, after completing independent preparation.

Push one explicit branch ref; do not expand to all branches, tags, or a mirror.
After pushing, verify the remote commit:

```sh
git rev-parse HEAD
git ls-remote --exit-code "$push_remote" "refs/heads/$destination_branch"
```

An optional `git push --dry-run` belongs after the commit and before the actual
push; it does not prove server checks will accept publication. Set an upstream
only when appropriate for the branch's intended tracking relationship.

On non-fast-forward rejection, fetch and inspect divergence. Reconcile using the
repository's merge/rebase policy, preserve remote work, and rerun affected checks.
Do not automatically force-push. Rewriting published history requires specific
authorization and an explicit expected remote commit with a lease. For conflicts,
authentication failures, secret blocks, or policy rejection, stop repeated pushes
until the cause is resolved; never retry unchanged failures.

Verify the remote branch SHA matches the intended local commit. If it advanced
concurrently, fetch and verify ancestry before drawing conclusions. After a
network timeout, inspect the remote before retrying: publication may have succeeded.
Report commit, repository/branch, checks, and remaining local changes. Distinguish
publication, CI success, and deployment success; claim only observed results for
the pushed revision. If PR work is requested, follow the repository template and
report its URL; do not automatically merge it.

## Acceptance cases

- New or modified files: successful `git add`, reviewed staging, and successful
  `git commit -m` precede `git push`; a failed earlier step prevents publication.
- Skill update only: edit and validate locally without committing or pushing.
- Mixed unrelated edits: only selected work and intended outgoing commits publish.
- Existing clean commit: push without manufacturing another commit.
- Remote divergence: reconcile without losing remote commits.
- Required PR or secret block: respect the rejection and report a concrete next step.
- Preparation only: provide the proposed push without changing the remote.
- Successful push: remote evidence identifies the intended commit; unobserved CI
  or deployment remains unverified.

## Owner correction

Recorded: 2026-09-18. Source: the owner explicitly requested updating the skill to
stage first, then run `git commit -m`, then push, following GitHub documentation.
Decision: make that sequence explicit and primary. Reason stated: follow GitHub's
documented workflow. Interpretation: a routine flow request does not automatically
mean creating a PR. Supersedes: the ambiguous push-first command example.
Acceptance: the cases above distinguish new changes, existing commits, and a
skill-only edit. Evidence: the linked GitHub command-line guide confirms the
sequence; execution of this revised procedure remains unverified.
