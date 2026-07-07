#!/usr/bin/env tsx
/**
 * PromptLint command-line entry point.
 *
 * This shim is intentionally tiny: it forwards `process.argv` to the
 * in-process `runCli` orchestrator, writes the rendered output to the
 * matching stream, and exits with the computed code. Every business
 * decision lives in `src/`, which keeps this file free of logic that
 * would need to be tested or would drift between runtimes.
 *
 * The `#!/usr/bin/env tsx` shebang runs the CLI from source via tsx so it
 * works in a pnpm workspace where the dependency packages export
 * TypeScript directly.
 */
import { runCli } from "../src/cli.js"

async function main(): Promise<void> {
  const result = await runCli(process.argv.slice(2), import.meta.url)
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout)
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr)
  }
  process.exit(result.exitCode)
}

// Top-level await is supported for ESM; the catch is the last-resort guard
// so no uncaught exception ever escapes the process (see Phase 4 error
// handling contract: "Never crash with an uncaught exception").
await main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`PromptLint crashed unexpectedly: ${message}\n`)
  process.exit(2)
})
