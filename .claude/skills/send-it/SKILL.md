---
name: send-it
description: Ship the current branch. Triggers on "send it", "ship it", "push it up", "let's get this up", "make the PR", or /send-it. Rebase onto the default branch, run checks CI doesn't, commit, push, open a PR with auto-merge and watch the first CI run; in a direct-to-main repo (b9-ankeny-owner-portal) push straight to main after the local check instead. Also used by the tackle lanes to ship an issue.
---

# "Send it" — ship the current branch

When I have uncommitted or unpushed work on a non-default branch and I say
**"send it"** (or anything clearly meaning the same — "ship it", "push it up",
"let's get this up", "make the PR"), treat that as authorization to run the
whole publish sequence without asking again:

1. **Sync with the default branch.** Detect it (`git symbolic-ref
   refs/remotes/origin/HEAD`, falling back to `main` then `master`), fetch, and
   rebase the current branch onto it. If there are conflicts, resolve them
   yourself (see "Merge conflicts" in this skill), then continue.
2. **Don't run checks CI already runs.** Read the repo's CI config and let it
   be the judge of anything it runs on a pull request. Run locally only what CI
   doesn't cover — and if the repo has no CI on PRs at all, run its checks
   yourself before pushing, because then there's nothing else to catch it.
3. **Commit** the working tree with a message describing the actual change, in
   the style of the repo's recent commits.
4. **Push** to `origin`, setting upstream if needed.
5. **Open a PR** with `gh pr create` against the default branch — a real title
   and a body that says what changed and why. Return the PR URL.
6. **Enable auto-merge** — `gh pr merge --auto`, using the repo's default merge
   method. If the repo doesn't allow auto-merge, say so and leave the PR open;
   don't merge it by hand instead.
7. **Watch the first CI run, then stop.** `gh pr checks --watch` through the
   run that started when you opened the PR:
   - **Failing checks** — read the failure (`gh run view --log-failed`), fix
     the cause, push, and watch the run that fix triggers. Fix the code, not
     the check.
   - **Merge conflicts** — resolve them as in step 1 (see "Merge conflicts").
   - **A required review** — say so and stop. Never approve it yourself.
   - **Green, with auto-merge enabled** — stop there. Don't wait for the
     merge itself.
   The moment the PR is green and auto-merging, the session's job is done —
   report the PR URL and move on, even if the PR is currently `BEHIND` the
   default branch. That's not yours to fix: a repo-level updater owns
   bringing behind-but-mergeable auto-merge PRs up to date on its own push to
   the default branch, so never run `gh pr update-branch` or a rebase-and-
   force-push here to chase it. A run that gets cancelled because of that
   (the concurrency group, or a head-behind stop) is not a failure and not
   yours to re-trigger — the updater's next pass covers it.

Notes:

- If I'm on the default branch, branch first (descriptive name), then proceed.
- If there's genuinely nothing to send (clean tree, already pushed, PR exists),
  say so rather than creating an empty commit or duplicate PR.
- Ambiguous context beats a wrong guess: if "send it" plausibly referred to
  something other than the code (an email, a message), ask which I meant.
- **Merge conflicts — resolve, then diagnose.** Resolve them yourself, keeping
  the intent of both sides. Before pushing, confirm the result still passes
  whatever CI would run on it (build/typecheck/tests for the touched code; if CI
  covers it, let CI judge after the push). Stop and tell me only if a conflict
  is *semantic* — the same logic changed two incompatible ways, and keeping both
  intents isn't possible — or if the tests fail after the merge and the fix
  isn't obvious. Then, in the PR body or your report, add a short **Conflict
  note**: which files, what landed on the default branch to cause it, and
  whether it was inevitable (parallel work in the same area) or preventable
  (e.g. two changes to the same hot file, docs sections everyone appends to,
  work that should have been sequenced). Don't propose rules to prevent
  conflicts in general; only call out patterns that recur, so we can change how
  we organize work or architecture.
- Two strikes on the same check: if a fix doesn't clear it and it fails the
  same way again, stop and tell me. A third attempt is guessing.
- A repo without the behind-PR updater workflow doesn't get this shortcut:
  fall back to the old behavior there — bring the PR up to date yourself
  (`gh pr update-branch`, or rebase and force-push with `--force-with-lease`)
  and stay with it until it actually merges.

### Direct-to-main — ONLY b9-ankeny-owner-portal

Decided 2026-09-29 (issue #178 in b9-ankeny-owner-portal). In these repos
"send it" **never creates a PR** and never enables auto-merge:

- `nicholastanderson/b9-ankeny-owner-portal`

Sequence: (1) fetch and rebase onto `origin/main` (resolve conflicts per
"Merge conflicts" in this skill); (2) run the repo's fast local checks — the repo's
`npm run check` once it exists (#180), otherwise lint + typecheck + test +
build; CI is *not* a pre-merge gate here, so the local run is the gate;
(3) commit — when the work is for an issue, the message ends with
`Closes #<n>`, because there is no PR body to close it; (4) `git push origin
HEAD:main`; (5) report the commit SHA and watch the push-triggered workflow
run, fixing forward (or `git revert`) if it goes red. Never force-push. If the
push is rejected — non-fast-forward: rebase, re-run the local checks and
retry; ruleset/branch-protection: the migration (#179/#181) isn't done — stop
and tell me. **Do not fall back to opening a PR.**

Deploy runs share one concurrency group, so pushes close together queue and
GitHub cancels an older pending run when a newer one queues. A cancelled run
is not a failure: watch the newest run that contains your SHA.

**One exception:** issue #179 (gate deploy on tests) ships as a normal PR
(full "send it" PR flow, auto-merge) because the ruleset still requires one;
it's the last PR in this repo. Everything after it goes direct.

**Every other repo keeps the full PR flow above, unchanged** — this section does not apply to it.
