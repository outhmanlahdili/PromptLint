# Contributing to PromptLint

Thank you for your interest in contributing to PromptLint! We welcome all contributions, whether you're fixing a bug, proposing a new rule, or improving the documentation.

This guide describes how to set up your development environment, the workflow we follow, and the conventions expected for all pull requests.

## 📜 Code of Conduct

All participants are expected to follow our [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before contributing to ensure a welcoming and inclusive environment for everyone.

## 🛠 Development Environment

### Prerequisites

- **Node.js**: `>=20.0.0` (LTS recommended)
- **pnpm**: `>=9.0.0` (The repository pins `pnpm@9.15.4` via `packageManager`)
- **Git**: Latest stable version

### Setup

```bash
# Clone the repository
git clone https://github.com/outhmanlahdili/PromptLint.git
cd PromptLint

# Install dependencies
pnpm install

# Install Husky hooks
pnpm prepare

# Run full verification
pnpm verify
```

`pnpm verify` executes the complete quality gate: `format:check`, `lint`, `typecheck`, `test:run`, and `build`. You should see a green build locally before opening a pull request.

---

## 📂 Project Layout

PromptLint is a [Turborepo](https://turbo.build/) + pnpm monorepo. Workspaces are organized as follows:

- `apps/cli`: The core command-line interface.
- `apps/docs`: Documentation site and rule manifest.
- `packages/`: Core logic (parser, rule-engine, rules, types, reporters).
- `tooling/`: Shared configuration presets (biome, tsconfig).
- `examples/`: Minimal examples for testing and documentation.

### Workspace Conventions

Every workspace package follows a consistent script interface:
- `pnpm lint` / `pnpm lint:fix`: Biome-based linting.
- `pnpm typecheck`: TypeScript type validation.
- `pnpm test:run`: Vitest execution.
- `pnpm build`: Production artifact generation.

---

## 🚀 Development Workflow

1. **Create a Branch**: Start from `main` using a descriptive name.
   ```bash
   git switch -c feat/add-new-rule
   ```
2. **Implement Changes**: Make your changes. Run `pnpm verify` frequently to catch issues early.
3. **Manage Versions**: Use Changesets to track the impact of your change.
   ```bash
   pnpm changeset
   ```
   Select the affected packages and choose the semantic version bump (`patch`, `minor`, or `major`).
4. **Commit**: Use [Conventional Commits](https://www.conventionalcommits.org/).
   - `feat:` for new features.
   - `fix:` for bug fixes.
   - `docs:` for documentation changes.
   - `refactor:` for code changes that neither fix a bug nor add a feature.
   - `test:` for adding or correcting tests.
   - `chore:` for maintenance.
5. **Submit**: Push your branch and open a Pull Request using our [PR template](./.github/pull_request_template.md).

---

## ✅ Pull Request Checklist

Before requesting a review, please confirm the following:
- [ ] `pnpm verify` passes locally.
- [ ] New code is covered by unit tests.
- [ ] Public exports include JSDoc comments.
- [ ] A changeset has been added for all user-visible changes.
- [ ] Your commit messages follow the Conventional Commits specification.

---

## 🎨 Coding Style

- **TypeScript**: We use strict TypeScript throughout. CommonJS is not allowed.
- **Immutability**: Prefer `readonly` types and immutable data structures for public APIs.
- **Type Safety**: Avoid `any`. Use `unknown` and narrow types explicitly.
- **Documentation**: Every public export must be documented with JSDoc.
- **Cleanliness**: No `console.log`, `debugger`, or commented-out code in commits.

---

## 🐛 Reporting Issues

We encourage you to use our GitHub issue templates for structured reports:
- [Bug Report](./.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature Request](./.github/ISSUE_TEMPLATE/feature_request.md)
- [Rule Proposal](./.github/ISSUE_TEMPLATE/feature_request.md)

---

## 🛡 Security

Please **do not** report security vulnerabilities via public issues. Refer to our [SECURITY.md](./SECURITY.md) for the responsible disclosure process.

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
