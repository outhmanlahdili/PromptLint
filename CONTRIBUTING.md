# Contributing to PromptLint

Thank you for your interest in contributing to PromptLint! This guide
describes how to set up a development environment, the workflow we
follow, and the conventions every PR is expected to honor.

## Code of Conduct

All participants are expected to follow our
[Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before
contributing.

## Development environment

### Prerequisites

- Node.js `>=20`
- pnpm `>=9` (the repo pins `pnpm@9.15.4` via `packageManager`)
- Git

### Setup

```bash
wwgit clone https://github.com/outhmanlahdili/PromptLint.git
cd PromptLint
pnpm install
pnpm prepare        # installs Husky hooks
pnpm verify         # runs format:check, lint, typecheck, test:run, build
```

You should see a green build locally before opening a pull request.

## Project layout

PromptLint is a [Turborepo](https://turbo.build/) + pnpm monorepo.
Workspaces live under `apps/`, `packages/`, `tooling/`, and
`examples/`. See the [README](./README.md) for the full layout.

Every workspace package follows the same conventions:

- `package.json` exposes `lint`, `lint:fix`, `typecheck`, `test`,
  `test:run`, `build`, `clean`, and `topo` scripts.
- `tsconfig.json` extends `@prompt-lint/tsconfig/base.json`.
- `tsconfig.build.json` extends `@prompt-lint/tsconfig/build.json`.
- `biome.json` extends `@prompt-lint/biome-config/biome.json`.
- `vitest.config.ts` configures Vitest for Node.

## Development workflow

1. Create a feature branch from `main`:
   ```bash
   git switch -c feat/my-change
   ```
2. Make your changes. Run `pnpm verify` early to surface errors.
3. Add a changeset with `pnpm changeset`. Choose the affected
   packages and pick `patch` / `minor` / `major` based on the
   public API impact.
4. Commit using a [Conventional Commits](https://www.conventionalcommits.org/)
   header (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `build:`,
   `ci:`, `chore:`, `revert:`). Headers are validated by
   commitlint in the Husky `commit-msg` hook.
5. Push your branch and open a pull request. The
   [PR template](./.github/pull_request_template.md) will guide you.

## Pull request checklist

Before requesting review, confirm:

- [ ] `pnpm format:check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:run` passes
- [ ] `pnpm build` passes
- [ ] New code has unit tests where applicable
- [ ] Public exports have JSDoc comments
- [ ] A changeset is included for any user-visible change

## Commit conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/).
The header **must** use one of these types:

- `feat:` — a new user-facing feature
- `fix:` — a bug fix
- `docs:` — documentation only
- `refactor:` — a change that neither fixes a bug nor adds a feature
- `perf:` — performance improvement
- `test:` — adding or correcting tests
- `build:` — build system or external dependency change
- `ci:` — CI configuration change
- `chore:` — tooling or maintenance that doesn't affect production code
- `revert:` — reverts a previous commit

The header is capped at 100 characters.

## Coding style

- TypeScript everywhere (CommonJS is not allowed in this workspace).
- Prefer `readonly` types and immutable data structures for public API
  surfaces.
- Avoid `any`. Use `unknown` and narrow it explicitly.
- Do not introduce new top-level dependencies without discussion.
- Document every public export with JSDoc.
- Don't leave `console.log`, `debugger`, or commented-out code in
  committed changes.

## Reporting issues

Use the GitHub issue templates:

- [Bug report](./.github/ISSUE_TEMPLATE/bug-report.md)
- [Feature request](./.github/ISSUE_TEMPLATE/feature-request.md)
- [Rule proposal](./.github/ISSUE_TEMPLATE/rule-proposal.md)

## Security

Please do **not** file public issues for security vulnerabilities. See
[SECURITY.md](./SECURITY.md) for the responsible disclosure process.

## License

By contributing, you agree that your contributions will be licensed
under the [MIT License](./LICENSE).
