# PromptLint

> Lint your prompts. Catch regressions before your users do.

PromptLint is a static analyzer and linter for prompt files (`.prompt.md`,
`.prompt.ts`, `.prompt.json`). It ships as a TypeScript monorepo with shared
contracts, a rule manifest, pluggable reporters, and a command-line
interface.

## Status

This repository is at **Phase 4**. The CLI is wired end-to-end
(discovery → parsing → rule engine → reporting) and is usable from the
terminal via `pnpm promptlint check` (a workspace script that forwards
to `@promptlint/cli`'s tsx launcher while preserving the caller's
working directory). See
[`PROJECT-AUDIT.md`](./PROJECT-AUDIT.md) for the canonical milestone
log, and [`apps/cli/README.md`](./apps/cli/README.md) for usage of the
command-line interface.

| Phase | Focus                                                                                  | Status      |
| ----- | -------------------------------------------------------------------------------------- | ----------- |
| 0     | Public types, package contracts, rule manifest metadata, reporter interfaces.         | Completed   |
| 1     | Parser implementations, config loading, rule-engine dispatch.                         | Completed   |
| 2     | Rule engine foundation, sequential rule × file dispatch.                              | Completed   |
| 3     | Built-in rule implementations, helpers, and per-rule tests.                            | Completed   |
| 4     | CLI integration (discovery, arg parsing, reporting, exit codes), bin launcher.         | Completed   |

## Repository layout

```
.
├── apps/
│   ├── cli/         # PromptLint command-line interface (Phase 2)
│   └── docs/        # PromptLint documentation site      (Phase 2)
├── packages/
│   ├── config/                # Zod schema for .promptlintrc.json
│   ├── parser/                # Parser input/output contracts
│   ├── rule-engine/           # Engine input/output shapes + severity helpers
│   ├── rules/                 # RULES_MANIFEST catalog (metadata only)
│   ├── reporter-human/        # Human-readable formatter contract
│   ├── reporter-json/         # Deterministic JSON reporter contract
│   ├── test-utils/            # Test fixture helpers
│   └── types/                 # Shared types: PromptFile, Finding, etc.
├── tooling/
│   ├── biome-config/          # Shared Biome configuration
│   ├── configs/               # Shared Vitest configuration preset
│   └── tsconfig/              # Shared TypeScript configurations
└── examples/
    └── minimal/               # Minimal .promptlintrc + prompt for tests/docs
```

## Quick start

Prerequisites: Node.js `>=20`, pnpm `>=9`.

```bash
pnpm install
pnpm verify
```

`pnpm verify` runs `format:check`, `lint`, `typecheck`, `test:run`, and
`build` across the entire workspace via [Turborepo](https://turbo.build/).

### Useful scripts

| Script               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `pnpm build`         | Build every workspace package.                           |
| `pnpm lint`          | Lint every package with Biome.                           |
| `pnpm format:check`  | Verify formatting without writing changes.               |
| `pnpm format`        | Format the entire repo with Biome.                       |
| `pnpm typecheck`     | Type-check every workspace package.                      |
| `pnpm test:run`      | Run the Vitest suite once per package.                   |
| `pnpm verify`        | Run `format:check` + `lint` + `typecheck` + `test:run` + `build`. |
| `pnpm changeset`     | Add a changeset describing your change.                  |

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the development workflow,
commit message conventions (`feat:`, `fix:`, `chore:` …), and the
pull-request checklist. Please also read the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## Governance and security

- Governance: [`GOVERNANCE.md`](./GOVERNANCE.md)
- Security policy: [`SECURITY.md`](./SECURITY.md)
- License: [MIT](./LICENSE)

## Acknowledgements

This project is shaped by the TypeScript and Node.js open-source
ecosystem. Special thanks to the maintainers of Biome, Vitest, Turbo,
pnpm, Changesets, Husky, and lint-staged.
