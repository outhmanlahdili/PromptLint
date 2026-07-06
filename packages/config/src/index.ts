import { z } from "zod"

/**
 * Schema for the V1 `.promptlintrc.json` configuration file.
 *
 * Validation is intentionally permissive in V1: unknown top-level keys are
 * ignored, and most settings have safe defaults. Phase 1 implements the
 * loader that parses the user's file and merges defaults before handing
 * the result to the engine.
 *
 * This schema is the only place the configuration surface is defined.
 */
export const promptlintConfigSchema = z
  .object({
    /** Glob patterns to include beyond the default prompt file extensions. */
    include: z.array(z.string()).optional(),
    /** Glob patterns to exclude, gitignore syntax. */
    exclude: z.array(z.string()).optional(),
    /** Map from rule id to severity override or `off` to disable. */
    rules: z
      .record(
        z.string(),
        z.union([
          z.enum(["off", "info", "warning", "error"]),
          z.array(z.union([z.enum(["off", "info", "warning", "error"]), z.unknown()])),
        ]),
      )
      .optional(),
    /** Map from rule id to per-rule options object. */
    options: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    /** Reporter to use when none is specified on the CLI. */
    reporter: z.enum(["human", "json"]).optional(),
  })
  .strict()

/** Validated, fully resolved configuration shape used at runtime. */
export type PromptlintConfig = z.infer<typeof promptlintConfigSchema>

/** Default configuration, applied when no `.promptlintrc.json` exists. */
export const DEFAULT_CONFIG: PromptlintConfig = Object.freeze({
  reporter: "human",
})

/**
 * Public surface of `@promptlint/config`.
 *
 * Implements the loader in Phase 1. Phase 0 ships the schema and the
 * default config so the rest of the workspace can import them.
 */
export { promptlintConfigSchema }
export type { PromptlintConfig }
export { DEFAULT_CONFIG }
