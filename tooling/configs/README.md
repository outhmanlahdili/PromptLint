# @promptlint/configs

Shared Vite / Vitest configuration for PromptLint packages.

Usage in a package `vitest.config.ts`:

```ts
import { createVitestConfig } from "@promptlint/configs/vitest";

export default createVitestConfig();
```

(Phase 0 ships a preset; the `createVitestConfig` factory is introduced in
Phase 1 if export-shape divergence between packages becomes a need.)
