export {
  promptlintConfigSchema,
  ruleConfigSchema,
  ruleSeveritySchema,
} from "./schema.js"
export type {
  PromptlintConfig,
  PromptlintConfigInput,
  PromptlintConfigOutput,
  RuleConfig,
  RuleSeverity,
} from "./schema.js"
export { loadConfig } from "./loader.js"
export type { LoadConfigResult } from "./loader.js"
export { mergeConfig } from "./merge.js"
export { DEFAULT_CONFIG } from "./defaults.js"
export { ConfigError } from "./errors.js"
export { createIgnoreMatcher } from "./matchers.js"
export type { IgnoreMatcher } from "./matchers.js"
export { resolveRules, resolveRulesAgainstManifest } from "./resolve.js"
export type { ResolvedRules, UnknownRuleReference } from "./resolve.js"
