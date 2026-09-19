# Working together with fewer Git conflicts

## Ownership

The two frontend teammates primarily edit `frontend/`. The two backend teammates primarily edit `backend/`. Each application has a separate manifest, lockfile, environment file, and build configuration. Install packages from the correct application directory.

Within each team, claim feature files before editing. Folder separation reduces cross-team conflicts; it does not prevent two frontend developers from conflicting in the same layout file. Shared contracts, root files, and CI changes need a quick agreement before editing. The later backend work split is not assigned here.

## One feature branch per person

Start with a clean working tree. Commit your current work on its own branch before switching tasks.

```sh
git switch main
git pull --ff-only origin main
git switch -c frontend/goals-ui
```

Use a unique descriptive name such as `frontend/goals-ui`, `frontend/chat-layout`, or `backend/your-feature`. Do not have both teammates push to a shared `frontend` or `backend` branch. Keep `main` for integrated work.

While working, stage the files for your feature explicitly. Review `git diff` and `git diff --cached` before committing. Do not commit a teammate's unfinished changes from a shared machine.

```sh
git add frontend/src/features/goals
git commit -m "feat(frontend): add goal creation form"
git push -u origin frontend/goals-ui
```

Those feature names are examples; they are not assignments. Open a pull request into `main`, include what changed and which checks passed, and have another teammate review it. Keep PRs small enough to integrate several times during the hackathon. Prefer squash merging completed feature PRs, then start the next feature from updated `main`.

## Bringing in teammates' work

With your current feature work committed:

```sh
git fetch origin
git merge origin/main
```

Resolve conflicts in your branch, run checks, commit the merge if Git requests it, and push normally. Do not force-push `main`. If `git pull --ff-only` on `main` refuses, inspect the divergence instead of resetting or force-pushing.

Pulling updates the whole repo, including the other team's directory. Git merges committed changes; separate folders do not make separate repositories.

## Dependencies and lockfiles

- Frontend package changes belong in `frontend/package.json` and its lockfile.
- Backend package changes belong in `backend/package.json` and its lockfile.
- Use `npm ci` after pulling a dependency change.
- For a lockfile conflict, first agree on the manifest changes; regenerate that app's lockfile with Node 24 and `npm install`, then run its checks. Do not arbitrarily take one teammate's lockfile.
- Never add a root `package.json` or workspace-wide lockfile as a convenience script.
- Do not run repository-wide formatting in a feature PR.

## Shared contracts

Agree on request/response changes before using them. Include schema, example, and consumer updates in the same PR. Run both apps' checks for contract changes. Prefer compatible additions while another feature branch depends on the existing fields.

CI checks are configured, but GitHub branch protection and required reviewers are not changed by this setup. The workflow is a team convention unless repository settings enforce it.
