import { z } from "zod"

export const ruleSeveritySchema = z.enum(["off", "info", "warning", "error"])

export const ruleConfigSchema = z.union([
  ruleSeveritySchema,
  z
    .object({
      severity: ruleSeveritySchema.optional(),
      options: z.record(z.string(), z.unknown()).optional(),
    })
    .strict(),
])

/**
 * Raw schema for `promptlint.config.{ts,json}`.
 *
 * All top-level keys are optional in the source document so users can
 * start with an empty `{}` and grow it incrementally. Validation is
 * `.strict()` so unknown keys raise a clear error rather than being
 * silently ignored.
 *
 * The inferred input type is `PromptlintConfigInput`. The fully-resolved
 * `PromptlintConfig` type is built by {@link resolveConfigInput}.
 */
export const promptlintConfigSchema = z
  .object({
    failOn: z.enum(["warning", "error"]).optional(),
    format: z.enum(["human", "json"]).optional(),
    ignore: z.array(z.string()).optional(),
    rules: z.record(z.string(), ruleConfigSchema).optional(),
  })
  .strict()

/** Permissive shape: every field is optional, matches the on-disk file. */
export type PromptlintConfigInput = z.input<typeof promptlintConfigSchema>

/** Strict, fully-populated shape: every field is required. */
export type PromptlintConfigOutput = z.output<typeof promptlintConfigSchema>

/**
 * Public, fully-resolved configuration shape used at runtime.
 *
 * Aliasing the zod output type keeps the public surface tied to the
 * schema: if the schema ever gains a field, this type picks it up and
 * the {@link DEFAULT_CONFIG} / {@link mergeConfig} paths are forced to
 * stay in sync.
 */
export type PromptlintConfig = PromptlintConfigOutput

export type RuleConfig = z.infer<typeof ruleConfigSchema>
export type RuleSeverity = z.infer<typeof ruleSeveritySchema>
