import { HELP_TEXT, readVersion } from "./help.js"
import { lint } from "./lint.js"
import { CliArgumentError, parseCliArgs } from "./options.js"
import type { ParsedCli } from "./options.js"
import { ExitCode } from "./types.js"
import type { CliResult } from "./types.js"

/**
 * Entry point for in-process invocation. Parses `argv`, dispatches to the
 * requested command, and returns a fully-rendered {@link CliResult} with
 * the computed exit code. This function never writes to the process
 * streams and never calls `process.exit` — the bin shim does both.
 *
 * Every error path (bad flags, missing target, runtime exception) is
 * caught and converted into a `CliResult` with a human-readable message,
 * so the caller can rely on a non-throwing contract.
 *
 * @param argv The argument vector without the node binary and script path.
 * @param importMetaUrl The `import.meta.url` of the calling module, used
 *   to locate the CLI `package.json` for `--version`.
 */
export async function runCli(argv: readonly string[], importMetaUrl: string): Promise<CliResult> {
  let parsed: ParsedCli
  try {
    parsed = parseCliArgs(argv)
  } catch (err: unknown) {
    if (err instanceof CliArgumentError) {
      return { exitCode: ExitCode.Unexpected, stdout: "", stderr: `${err.message}\n` }
    }
    return {
      exitCode: ExitCode.Unexpected,
      stdout: "",
      stderr: `${unexpectedMessage(err)}\n`,
    }
  }

  if (parsed.command === "help") {
    return { exitCode: ExitCode.Success, stdout: HELP_TEXT, stderr: "" }
  }
  if (parsed.command === "version") {
    const version = readVersion(importMetaUrl)
    return { exitCode: ExitCode.Success, stdout: `${version}\n`, stderr: "" }
  }

  // parseCliArgs guarantees path is non-null when command === "check".
  const target = parsed.path ?? ""
  return lint(target, parsed.options)
}

function unexpectedMessage(err: unknown): string {
  if (err instanceof Error && err.message.length > 0) {
    return `Unexpected error: ${err.message}`
  }
  return `Unexpected error: ${String(err)}`
}
