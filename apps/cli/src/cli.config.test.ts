import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { runCli } from "./cli.js"
import { ExitCode } from "./types.js"

/**
 * End-to-end tests for the CLI's configuration integration.
 *
 * These tests rely on `process.chdir()` to control the cwd that
 * `@promptlint/config`'s `loadConfig` uses for lookup. Each test resets
 * the cwd back to the original value in `afterEach` so subsequent
 * tests, other suites, and the host test runner are not affected.
 *
 * The CLI's `lint` function reads `process.cwd()` to find the
 * configuration, so chdir-based control is the natural seam to
 * exercise it without spawning the bin.
 */

const ORIGINAL_CWD = process.cwd()
const META_URL = "file:///apps/cli/src/cli.config.test.ts"

const CLEAN_PROMPT = `\
---
description: A clean prompt.
model: gpt-4o-mini
variables:
  - userMessage
outputSchema:
  type: object
  properties:
    reply:
      type: string
  required:
    - reply
---

You are a helpful assistant.

User: {{userMessage}}
`

/** Missing model on purpose - triggers `structure/missing-model` warning only. */
const PROMPT_MISSING_MODEL = `\
---
description: Missing model on purpose.
variables:
  - name
---

Hello {{name}}, please help.
`

let tmpRoot = ""
let cwd = ORIGINAL_CWD

beforeEach(async () => {
  tmpRoot = await mkdtemp(path.join(tmpdir(), "promptlint-cfg-"))
  cwd = process.cwd()
  process.chdir(tmpRoot)
})

afterEach(async () => {
  process.chdir(cwd)
  await rm(tmpRoot, { recursive: true, force: true })
})

async function writePrompt(relPath: string, content: string = CLEAN_PROMPT): Promise<string> {
  const abs = path.join(tmpRoot, relPath)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, content, "utf8")
  return abs
}

async function writeConfigJson(content: object, relDir = "."): Promise<void> {
  const dir = relDir === "." ? tmpRoot : path.join(tmpRoot, relDir)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, "promptlint.config.json"), JSON.stringify(content), "utf8")
}

describe("runCli — configuration lookup", () => {
  it("uses built-in defaults when no config file exists", async () => {
    // No config file at all.
    const file = await writePrompt("clean.prompt.md")
    const result = await runCli(["check", file, "--no-color"], META_URL)
    // The CLI has its own defaults; here we simply verify no
    // unknown-rule warning is reported on stderr (missing config in
    // the cwd shouldn't add warnings either).
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stderr).not.toContain("unknown rule")
  })

  it("applies a JSON config's `ignore` patterns to discovery", async () => {
    await writePrompt("clean.prompt.md")
    await writePrompt("ignored/should-skip.prompt.md", PROMPT_MISSING_MODEL)
    await writeConfigJson({ ignore: ["ignored/**"] })
    const result = await runCli(["check", tmpRoot, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("Scanned 1 file(s)")
  })

  it("applies a JSON config's rule 'off' to disable a rule", async () => {
    await writePrompt("warn.prompt.md", PROMPT_MISSING_MODEL)
    // Disable the rule that fires on the missing-model prompt.
    await writeConfigJson({ rules: { "structure/missing-model": "off" } })
    const result = await runCli(["check", tmpRoot, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("Scanned 1 file(s)")
    expect(result.stdout).toContain("No findings")
  })

  it("applies a JSON config's rule severity 'error' to a warning-level rule", async () => {
    await writePrompt("warn.prompt.md", PROMPT_MISSING_MODEL)
    // Escalate the warning to error so default --fail-on triggers.
    await writeConfigJson({ rules: { "structure/missing-model": "error" } })
    const result = await runCli(["check", tmpRoot, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
  })

  it("applies a rule option override to the engine", async () => {
    // `cost/high-token-estimate` fires when token count exceeds `maxTokens`.
    // The default threshold is 2000 tokens; with a small threshold the rule
    // fires on a short prompt that is otherwise clean. A prompt body of
    // 47 chars yields ~12 estimated tokens, well above `maxTokens: 5`.
    const file = await writePrompt("clean.prompt.md")
    await writeConfigJson({
      rules: {
        "cost/high-token-estimate": {
          severity: "warning",
          options: { maxTokens: 5 },
        },
      },
    })
    const result = await runCli(["check", file, "--format", "json", "--no-color"], META_URL)
    const parsed = JSON.parse(result.stdout) as { findings: Array<{ ruleId: string }> }
    expect(parsed.findings.some((f) => f.ruleId === "cost/high-token-estimate")).toBe(true)
    expect(result.exitCode).toBe(ExitCode.Failures)
  })

  it("lets `--fail-on` on the CLI command line override the config's failOn", async () => {
    await writePrompt("warn.prompt.md", PROMPT_MISSING_MODEL)
    await writeConfigJson({ failOn: "warning" })
    // Override: succeed even though there is a warning because --fail-on
    // error is in effect.
    const result = await runCli(["check", tmpRoot, "--fail-on", "error", "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
  })

  it("lets `--format` on the CLI command line override the config's format", async () => {
    await writePrompt("warn.prompt.md", PROMPT_MISSING_MODEL)
    await writeConfigJson({ format: "human" })
    const result = await runCli(["check", tmpRoot, "--format", "json", "--no-color"], META_URL)
    // Based on the override, output must be JSON, not the human block.
    expect(result.stdout.startsWith("{")).toBe(true)
  })

  it("walks upward to find a config in an ancestor directory", async () => {
    await writePrompt("a/b/c/clean.prompt.md")
    await writeConfigJson({
      rules: {
        "cost/high-token-estimate": {
          severity: "warning",
          options: { maxTokens: 5 },
        },
      },
    })
    // cwd stays at tmpRoot which contains `promptlint.config.json`.
    // Now chdir into a nested subdirectory and lint from there.
    process.chdir(path.join(tmpRoot, "a", "b", "c"))
    const result = await runCli(
      ["check", `${tmpRoot}/a/b/c/clean.prompt.md`, "--format", "json", "--no-color"],
      META_URL,
    )
    const parsed = JSON.parse(result.stdout) as { findings: Array<{ ruleId: string }> }
    expect(parsed.findings.some((f) => f.ruleId === "cost/high-token-estimate")).toBe(true)
  })

  it("reports invalid configuration with an exit code 2 and a clear message", async () => {
    await writePrompt("clean.prompt.md")
    // Unknown top-level key triggers strict validation.
    await writeConfigJson({ thisIsUnknown: true })
    const result = await runCli(["check", tmpRoot, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Unexpected)
    expect(result.stderr).toContain("Invalid configuration")
  })

  it("surfaces unknown rule references in the config as a stderr warning", async () => {
    await writePrompt("clean.prompt.md")
    await writeConfigJson({ rules: { "totally/unknown-rule": "warning" } })
    const result = await runCli(["check", tmpRoot, "--no-color"], META_URL)
    // scan proceeds, unknown rule is reported on stderr
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stderr).toContain("unknown rule")
    expect(result.stderr).toContain("totally/unknown-rule")
  })
})
