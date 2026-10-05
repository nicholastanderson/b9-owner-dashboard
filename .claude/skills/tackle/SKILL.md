---
name: tackle
description: Route one or more GitHub issues to the right model lane and start them. Triggers only on the word "tackle" directly followed by issue numbers (tackle 123, tackle #123 #124) or /tackle <n>; "tackle" in ordinary prose with no issue number does nothing. Reads, grades, orders, dispatches tackle-* agents in worktrees, parallel by default and sequenced where it saves cycles, relays results and answers "status".
---

# "tackle <issue>" — route an issue to the right model and start it

**Trigger:** the word **tackle** followed directly by one or more issue
numbers — `tackle 123`, `tackle #123`, `tackle 123 124`, `tackle #123, #124`.
"Tackle" inside a sentence with no issue number right after it ("we should
tackle the auth stuff next") is ordinary English; do nothing special.

For each issue named:

1. **Read it.** `gh issue view <n> --comments`. Don't start the work yourself.
2. **Grade it** against the rubric below. Say which lane and why in one line
   per issue. Rounding up is cheap; rounding down costs a wasted run.
3. **Order them** by business and technical priority, not by cost. Judge it
   from the issue itself: who it is for and what breaks for them, whether
   it affects production readers or coaches today, and whether it unblocks
   another issue in the batch (a dependency goes first). Print the order
   with a few words of reason per issue. Ties go to the smaller lane.
4. **Schedule it** under the budget rule below. Every dispatch is that lane's
   agent (`tackle-*`: `.claude/agents/` in the repo, falling back to `~/.claude/agents/` locally) with `isolation: "worktree"`,
   in the background, one agent per issue. The prompt is self-contained:
   issue number, title, full body and comments, and the instruction to run
   the `send-it` skill (`/send-it`) when done. A restart adds the branch name and says
   to resume from it.
5. **Relay** each result — PR URL (in a direct-to-main repo, the pushed SHA
   and its deploy run's state), or what blocked it. If an agent reports the
   issue was bigger than its lane, re-dispatch one lane up, once.
6. **On "status"** (or any ask about how it's going), list every issue in
   the batch, one line each, grouped: running (lane, what it's doing now),
   PR up (URL, waiting on what), done (merged), and **held** — with why
   (waiting on a dependency, a pilot, the one-at-a-time rule, or not
   dispatchable — name which). In a direct-to-main
   repo the middle groups are pushed (SHA, deploy queued / running / red)
   and done (deploy green, issue closed). A held issue that isn't mentioned
   looks like a forgotten one.

### Scheduling: parallel by default, sequenced by judgment

There is no fixed cap on how many issues run at once. Start everything that
can usefully run now, and hold an issue only for a reason you can name:

- **A dependency.** It needs another issue's work first; it starts when
  that lands.
- **A pilot.** Several issues share an untried approach (same pattern, same
  integration, same refactor). Run one first; fan the rest out once it has
  proved the approach, so a wrong guess costs one run instead of all of them.
- **A collision.** Two issues would edit the same code heavily enough that
  the second would mostly be rebasing onto the first.
- **A repo rule** below (direct-to-main: one infra, auth or storage issue at a
  time).

An issue whose PR is open and waiting on CI or auto-merge is not being
worked; in a direct-to-main repo a lane is done working when it reports its
push. When a lane finishes, re-check what's held and start whatever its
reason no longer applies to.

Before the first dispatch, print the plan: what starts now, and each held
issue with its reason and what releases it.

**Restarts cost little** because every lane commits work in progress to its
branch after each step, so a stopped issue loses at most the step it was in.
If you ever do stop a running issue (account usage genuinely runs out
mid-batch), the restart prompt names the branch; the lane checks it out and
continues.

(A usage-percentage-aware version of this — estimating cost per lane, stopping
the most expensive running issue before a 5-hour window fills, resuming after
reset — was tried and dropped: it depended on `~/.claude/tackle/usage.json`,
which only the terminal CLI's status line writes, so from the desktop app it
never had real data and a fixed cap of three ran every time anyway.
Don't rebuild it without that dependency solved first.)

### Direct-to-main repos

These apply on top of the above in a repo listed under "Direct-to-main":

- **Preflight, once per batch.** Before the first dispatch, read the default
  branch's protection and rulesets (`gh api repos/<owner>/<repo>/branches/
  <branch>/protection`, `.../rulesets`). If either would reject my direct
  push — a required PR, or required checks with no admin bypass — hold the
  batch and report that reason. Exempt, and dispatched first: an issue that
  ships by PR under a listed exception (#179), and an issue that changes the
  protection itself (#181).
- **Dependencies land first.** Hold a dependent issue until its dependency's
  commit is on the default branch, then dispatch it; don't run the two side
  by side.
- **One infra, auth or storage issue at a time.** Those go to production with
  no review step, so a second one is held until the first one's deploy is
  green.
- **A red deploy is the dispatcher's call.** A lane fixes forward only when
  the failure is clearly from its own commit. When the run holds several
  lanes' commits or the cause is unclear, the lane reports and you decide:
  which commit caused it, revert or fix forward, and which lane does it.
- **Check the issue closed.** A push closes it through `Closes #<n>` in the
  commit message; if an issue is still open after its deploy is green, close
  it with a comment naming the SHA.

### Rubric

Take the highest lane any signal hits.

- **`tackle-sonnet-low`** — the issue already names the diff: copy, docs,
  a rename, a config value, a one-function fix with a clear repro. One file
  or one module. Nothing below touches it.
- **`tackle-sonnet-high`** — a routine bug or feature in one area whose
  implementation needs a judgment call but not a design: a new field through
  a form, a test to add, a handler to extend. Two or three files.
- **`tackle-opus-xhigh`** — cross-cutting: two or more areas, infra
  (`infra/`, CDK, IAM, Lambda), auth or sessions, a data model or storage
  change, anything with a backfill, or the issue lists acceptance criteria
  the diff has to satisfy end to end.
- **`tackle-fable-high`** — no clear diff: a design question, a ranking or
  scoring model change, an editorial-gate or provenance rule, "figure out
  why", or an issue whose comments disagree about the approach.

