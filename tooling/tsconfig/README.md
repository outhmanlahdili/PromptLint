# @promptlint/tsconfig

Shared TypeScript configurations for PromptLint packages.

Three presets are exported:

- `@promptlint/tsconfig/base.json` — base strict config used for typechecking.
- `@promptlint/tsconfig/build.json` — extends base, enables emit / declaration / sourcemaps.
- `@promptlint/tsconfig/test.json` — extends base, includes Vitest globals.

Each workspace package extends one of these via its local `tsconfig.json`.
