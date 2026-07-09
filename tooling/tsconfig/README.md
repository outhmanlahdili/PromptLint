# @prompt-lint/tsconfig

Shared TypeScript configurations for PromptLint packages.

Three presets are exported:

- `@prompt-lint/tsconfig/base.json` — base strict config used for typechecking.
- `@prompt-lint/tsconfig/build.json` — extends base, enables emit / declaration / sourcemaps.
- `@prompt-lint/tsconfig/test.json` — extends base, includes Vitest globals.

Each workspace package extends one of these via its local `tsconfig.json`.
