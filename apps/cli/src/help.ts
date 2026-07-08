import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * The canonical `--help` text. Kept as a single string literal so the
 * output is deterministic for snapshot/assertion tests. Column-aligned
 * for readability in an 80-column terminal.
 */
export const HELP_TEXT = `\
PromptLint — lint your prompts. Catch regressions before your users do.

USAGE
  promptlint <command> [options] <path>

COMMANDS
  check <path>        Lint prompt files at the given file or directory path.

OPTIONS
  -h, --help          Show this help message and exit.
  -V, --version       Print the PromptLint version and exit.
  --format <format>   Output format: "human" (default) or "json".
  --fail-on <level>   Exit non-zero at or above this severity:
                      "warning" (default) or "error". "info" never fails.
  -q, --quiet         Suppress all output when the scan succeeds.
  --no-color          Disable ANSI color in human output.

ARGUMENTS
  <path>              A prompt file or a directory to scan recursively.

CONFIGURATION
  PromptLint automatically loads "promptlint.config.ts" or 
  "promptlint.config.json" from the target directory, walking upward 
  to the filesystem root if none is found.
  
  CLI flags (like --format or --fail-on) always override configuration settings.

BUILT-IN RULES CATALOG
  - structure/missing-model          - cost/high-token-estimate
  - structure/missing-description    - security/pii-pattern
  - structure/unused-variable        - security/instruction-override-pattern
  - structure/undefined-variable     - quality/missing-output-schema
  - convention/filename-naming       - quality/vague-quantifier-language

EXAMPLES
  promptlint check .
  promptlint check prompts/
  promptlint check prompts/example.prompt.md --format json
  promptlint check src/ --fail-on error --quiet

SUPPORTED FORMATS
  .prompt.md, .prompt.ts, .prompt.json

EXIT CODES
  0   No findings above the configured threshold.
  1   One or more findings at or above --fail-on.
  2   Invalid invocation, invalid configuration, or unexpected runtime error.

PromptLint ignores node_modules, .git, dist, build, and coverage when
scanning directories. See https://github.com/outhmanlahdili/PromtLint 
for the full guide and docs/rules.md for details of each rule.
`

/**
 * Read the CLI version from its own `package.json`. The version lives in
 * a single place (the manifest) and is surfaced through `--version` and
 * the help banner. Falls back to "0.0.0" if the manifest is unreadable,
 * which keeps `--version` from crashing in unusual install layouts.
 *
 * @param importMetaUrl The `import.meta.url` of the calling module, used
 *   to locate the sibling `package.json` regardless of the CWD.
 */
export function readVersion(importMetaUrl: string): string {
  try {
    const here = path.dirname(fileURLToPath(importMetaUrl))
    const manifestPath = path.resolve(here, "..", "package.json")
    const raw = readFileSync(manifestPath, "utf8")
    const parsed = JSON.parse(raw) as { version?: unknown }
    return typeof parsed.version === "string" ? parsed.version : "0.0.0"
  } catch {
    return "0.0.0"
  }
}
