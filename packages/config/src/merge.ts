import { DEFAULT_CONFIG } from "./defaults.js"
import type { PromptlintConfig, PromptlintConfigInput } from "./schema.js"

/**
 * Merge a user-supplied `PromptlintConfigInput` over {@link DEFAULT_CONFIG},
 * producing a fully-resolved, immutable `PromptlintConfig`.
 *
 * Scalar fields (`failOn`, `format`) fall back to the default when the
 * user omits them. The `ignore` array is replaced wholesale. The
 * `rules` record is shallow-merged over the (currently empty) default
 * so a user can add or override individual entries without losing
 * future default rules.
 *
 * Every call produces a fresh container for `ignore` / `rules` so the
 * caller can safely hold on to the result without aliasing defaults.
 *
 * Accepting `PromptlintConfigInput` means callers don't have to supply
 * every top-level field just to pass a `rules` override.
 */
export function mergeConfig(userConfig: PromptlintConfigInput): PromptlintConfig {
  const userIgnore = userConfig.ignore ?? (DEFAULT_CONFIG.ignore as readonly string[])
  const ignore: string[] = [...userIgnore]

  const userRules = userConfig.rules ?? {}
  const rules: NonNullable<PromptlintConfig["rules"]> = {
    ...DEFAULT_CONFIG.rules,
    ...userRules,
  }

  return {
    failOn: userConfig.failOn ?? DEFAULT_CONFIG.failOn,
    format: userConfig.format ?? DEFAULT_CONFIG.format,
    ignore,
    rules,
  }
}
