import { parseArgs } from "node:util"
import type { FailOn, Format, ResolvedOptions } from "./types.js"

/**
 * Error raised when the user supplies an invalid combination of flags or
 * values. The CLI catches this, prints the message to stderr, and exits
 * with code 2 (`Unexpected`) — never letting the exception escape.
 */
export class CliArgumentError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = "CliArgumentError"
  }
}

const ALLOWED_FORMATS: readonly Format[] = ["human", "json"]
const ALLOWED_FAIL_ON: readonly FailOn[] = ["warning", "error"]

/**
 * Raw shape returned by `node:util` `parseArgs`. Declared locally so the
 * option set is documented in one place and `strict: true` rejects
 * anything outside it.
 */
interface ParsedArgs {
  readonly positionals: readonly string[]
  readonly values: {
    readonly help?: boolean
    readonly version?: boolean
    readonly format?: string
    readonly "fail-on"?: string
    readonly quiet?: boolean
    readonly "no-color"?: boolean
  }
}

const PARSE_CONFIG = {
  allowPositionals: true,
  strict: true,
  options: {
    help: { type: "boolean", short: "h", default: false },
    version: { type: "boolean", short: "V", default: false },
    format: { type: "string" },
    "fail-on": { type: "string" },
    quiet: { type: "boolean", short: "q", default: false },
    "no-color": { type: "boolean", default: false },
  },
} as const

/**
 * Result of parsing the raw argument vector. The dispatcher (`runCli`)
 * inspects `command` and `path` to decide what to run; `options` is the
 * fully-resolved, validated option set.
 */
export interface ParsedCli {
  readonly command: "check" | "help" | "version" | null
  readonly path: string | null
  readonly options: ResolvedOptions
}

/**
 * Parse and validate the raw CLI argument vector.
 *
 * `strict: true` means unknown flags are rejected by `parseArgs` itself.
 * This function layers on semantic validation (known enum values, the
 * `check` subcommand presence, single-path argument) and translates every
 * error into a {@link CliArgumentError} so callers only need one catch.
 *
 * @param argv The argument vector without the node binary and script path
 *   (i.e. `process.argv.slice(2)`).
 */
export function parseCliArgs(argv: readonly string[]): ParsedCli {
  let parsed: ParsedArgs
  try {
    parsed = parseArgs({ ...PARSE_CONFIG, args: [...argv] }) as unknown as ParsedArgs
  } catch (err: unknown) {
    throw toCliArgumentError(err)
  }

  const options = resolveOptions(parsed)

  if (parsed.values.help) {
    return { command: "help", path: null, options }
  }
  if (parsed.values.version) {
    return { command: "version", path: null, options }
  }

  const positionals = [...parsed.positionals]
  const command = positionals.shift() ?? null
  if (command !== "check") {
    throw new CliArgumentError(
      command === null
        ? "No command given. Run `promptlint --help` for usage."
        : `Unknown command "${command}". Expected "check". Run \`promptlint --help\` for usage.`,
    )
  }

  if (positionals.length === 0) {
    throw new CliArgumentError(
      "`promptlint check` requires a path argument. Run `promptlint --help` for usage.",
    )
  }
  if (positionals.length > 1) {
    throw new CliArgumentError(
      `\`promptlint check\` accepts a single path argument but received ${positionals.length}. Run \`promptlint --help\` for usage.`,
    )
  }

  const target = positionals[0]
  if (target === undefined) {
    throw new CliArgumentError("Internal error: missing positional after length check.")
  }
  return { command: "check", path: target, options }
}

/**
 * Turn the raw `parseArgs` values into a fully-resolved, validated
 * {@link ResolvedOptions}. Throws {@link CliArgumentError} for any value
 * outside the allowed enum sets.
 */
function resolveOptions(parsed: ParsedArgs): ResolvedOptions {
  const format = validateEnum(parsed.values.format, ALLOWED_FORMATS, "--format", "human")
  const failOn = validateEnum(parsed.values["fail-on"], ALLOWED_FAIL_ON, "--fail-on", "warning")

  return {
    format,
    failOn,
    quiet: parsed.values.quiet ?? false,
    noColor: parsed.values["no-color"] ?? false,
  }
}

function validateEnum<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
  flag: string,
  fallback: T,
): T {
  if (raw === undefined) {
    return fallback
  }
  const match = allowed.find((value) => value === raw)
  if (match === undefined) {
    throw new CliArgumentError(
      `Invalid value "${raw}" for ${flag}. Expected one of: ${allowed.join(", ")}.`,
    )
  }
  return match
}

/**
 * Normalize the various errors `parseArgs` can throw (which differ between
 * Node versions) into a single {@link CliArgumentError}.
 */
function toCliArgumentError(err: unknown): CliArgumentError {
  if (err instanceof Error) {
    const tail = err.message.includes("for more information") ? "" : " Run `promptlint --help`."
    return new CliArgumentError(`${err.message}${tail}`)
  }
  return new CliArgumentError(String(err))
}
