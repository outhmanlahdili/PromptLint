/**
 * Reusable helpers used across the built-in rule implementations.
 *
 * The helper layer exists so that rule files stay small, single-purpose,
 * and easy to audit. Every helper exported here is pure and stateless so
 * callers can compose them freely from `RuleContext`.
 */

export { estimateTokens } from "./tokens.js"
export {
  collectBodyVariables,
  collectDeclaredVariables,
  findVariableOccurrences,
  isVariableMissing,
} from "./variables.js"
export { extractPathBasename, isKebabCaseBasename } from "./filename.js"
export { compileWordPattern, compileWordRegex, findAllMatches } from "./regex.js"
export {
  PII_PATTERNS,
  detectPiiMatches,
} from "./pii.js"
export {
  INSTRUCTION_OVERRIDE_PATTERNS,
  findInstructionOverrideMatches,
} from "./instruction-override.js"
export { VAGUE_QUANTIFIER_TERMS, findVagueQuantifierMatches } from "./vague-quantifiers.js"
export {
  STRUCTURED_DATA_KEYWORDS,
  hasStructuredDataKeyword,
} from "./structured-data.js"
