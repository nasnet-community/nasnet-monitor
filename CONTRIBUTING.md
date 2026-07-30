# Contributing to Nasnet Monitor

Thanks for your interest in improving Nasnet Monitor. This guide covers how to set up your
environment, the workflow we use, and the quality bar a change needs to meet before it lands.

## Getting set up

See the [README](./README.md) for the full quick-start. In short:

```bash
# Backend (from main/backend): API on :8080
cd main/backend
cargo run

# Frontend (from main): Vite dev server on :5173
cd main
npm install
npm run dev
```

**Mind the directory split:** frontend config lives at `main/` and the React source is in
`main/frontend/`, while the backend is a self-contained Rust crate at `main/backend/`. Run npm
commands from `main/` and run `cargo` from `main/backend/`.

## Workflow: a git worktree per task

We use **a dedicated git worktree per piece of work**, never committing directly on the main
checkout. From `main/` (the git root):

```bash
git worktree add ../onlymaj/FEATURE_BRANCH_NAME -b onlymaj/FEATURE_BRANCH_NAME
```

The worktree lands at `nasnet-monitor/onlymaj/FEATURE_BRANCH_NAME`, a sibling of `main/`. Replace
`FEATURE_BRANCH_NAME` with a short kebab-case description of the task.

`node_modules` is gitignored and not copied into the worktree. Symlink it from the worktree root:

```bash
ln -s ../../main/node_modules node_modules
```

Land work by merging the branch into `master`.

## Making changes

- **Match the surrounding code.** Follow the existing naming, structure, and comment density.
- **Backend layering.** Keep HTTP handlers and the response envelope in `src/api.rs`, and confine
  gRPC / prost-reflect usage to `src/starlink/`. New endpoints are registered in `router()` in
  `src/lib.rs`. The quality gate is `cargo fmt --check`, `cargo clippy --all-targets -- -D
  warnings`, and `cargo test`.
- **Frontend data logic.** Pure transforms from raw device JSON into view models live in
  `frontend/src/data/starlink.ts` and are unit-tested in `starlink.test.ts`. Add or update a test
  there when you change a transform.
- **Don't hardcode colors.** The theme is CSS custom properties switched by `[data-theme]`; use the
  existing tokens.

## Commit and pull requests

- Write clear, focused commits with descriptive messages.
- Keep a pull request scoped to a single concern; smaller is easier to review.
- Describe what changed and why, and note any testing you did.
- Make sure the quality gate passes and the branch is up to date before requesting review.

## Reporting issues

When filing a bug, include what you expected, what happened, steps to reproduce, and your
environment (OS, Rust and Node versions, and the dish/router firmware if relevant).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
