---
name: claude-repo-setup
description: Set up or refresh Nick's personal Claude workflow in a repo so it works identically on the local CLI, the desktop app and claude.ai cloud sessions. Use when creating a new repo, when a repo lacks .claude/skills/send-it or .claude/agents/tackle-*, when "send it" or "tackle" isn't recognized in a cloud session, or on "set up claude in this repo" / "refresh the claude skills here".
---

# Set up the send-it / tackle workflow in a repo

Cloud sessions clone the repo onto a fresh VM and never see `~/.claude/`.
Only files committed to the repo (and skills enabled on the claude.ai
account) load there. So every repo carries its own copy of the workflow, and
the canonical copy lives in `~/.claude/skills/` and `~/.claude/agents/` on the
Mac. This skill copies canonical → repo. Never edit the repo copies by hand;
edit the canonical ones and re-run this.

## Steps

1. **Copy the skills and agents into the repo** (from the repo root):

   ```bash
   mkdir -p .claude/skills .claude/agents
   cp -R ~/.claude/skills/send-it ~/.claude/skills/tackle ~/.claude/skills/claude-repo-setup .claude/skills/
   cp ~/.claude/agents/tackle-*.md .claude/agents/
   ```

   On a refresh the same command overwrites stale copies; `git diff` shows
   what changed.

2. **Add the pointer block to the repo's `CLAUDE.md`** (create the file if
   the repo has none; keep it at the end, verbatim, so every repo reads the
   same):

   ```markdown
   ## Personal workflow skills

   "send it" / "ship it" → the `send-it` skill (`.claude/skills/send-it/SKILL.md`).
   "tackle <issue numbers>" → the `tackle` skill (`.claude/skills/tackle/SKILL.md`),
   which dispatches the `tackle-*` agents in `.claude/agents/`.
   These are copies of the canonical versions in `~/.claude/skills/` and
   `~/.claude/agents/`; refresh them with the `claude-repo-setup` skill, never
   by editing here. Lane signals a repo adds go in a "Tackle lane signals"
   section of this file; they add to the rubric and never remove from it.
   ```

3. **Decide the shipping mode.** Default is the PR flow in the `send-it`
   skill. Only `nicholastanderson/b9-ankeny-owner-portal` is direct-to-main;
   do not add a repo to that list without an explicit decision from Nick.

4. **Apply the merge policy** on a new repo: `~/.local/bin/repo-policy
   <owner>/<repo>` right after the first push, and again once the first PR's
   CI has run (skip for a direct-to-main repo).

5. **Commit** the `.claude/` files and the `CLAUDE.md` change with the repo's
   normal flow (`/send-it`). Message: `Claude: add send-it / tackle workflow
   skills and agents` (or `refresh` on a refresh).

6. **Cloud sessions:** after the commit is on the default branch, the skills
   load there automatically. For skills to also appear in cloud sessions of
   repos that have not been set up yet, enable `send-it` and `tackle` in the
   claude.ai account's skills settings (Nick does this once; it is not
   scriptable).

## When the canonical copy changes

Edit `~/.claude/skills/<name>/SKILL.md` or `~/.claude/agents/<lane>.md`, then
run this skill in every repo that carries copies:

```bash
for d in ~/bench/*/; do test -d "$d/.claude/skills/send-it" && echo "$d"; done
```

lists them. Refresh each and ship with `/send-it`.
