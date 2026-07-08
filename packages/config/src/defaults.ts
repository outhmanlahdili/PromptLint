import type { PromptlintConfig } from "./schema.js"

export const DEFAULT_CONFIG: Readonly<PromptlintConfig> = Object.freeze({
  failOn: "warning",
  format: "human",
  ignore: [],
  rules: {},
})
