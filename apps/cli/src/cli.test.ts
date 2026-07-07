import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { runCli } from "./cli.js"
import { ExitCode } from "./types.js"

/**
 * Integration tests for the PromptLint CLI.
 *
 * These drive `runCli` end-to-end (parse → discover → parse files → run
 * engine → render) against hermetic temp-directory fixtures built per
 * test. `runCli` returns its rendered stdout/stderr and computed exit
 * code, so nothing here spawns a subprocess or touches the real process
 * streams — the subprocess launch is covered separately in
 * `bin.smoke.test.ts`.
 */

const META_URL = "file:///apps/cli/src/cli.test.ts"

/**
 * A prompt that satisfies every built-in rule: kebab-case filename,
 * declared model + description, declared variable that is referenced,
 * no PII, no override phrasing, no structured-output request without a
 * schema, and a short body under the token threshold.
 */
const CLEAN_PROMPT = `\
---
description: A clean example prompt with no findings.
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

You are a helpful assistant. Respond to the user message below.

User: {{userMessage}}
`

/** Triggers `structure/missing-model` (warning) only; no error-level findings. */
const PROMPT_WITH_WARNINGS = `\
---
description: Missing model on purpose.
variables:
  - name
---

Hello {{name}}, please help.
`

/** Triggers `structure/undefined-variable` at severity error. */
const PROMPT_WITH_ERROR = `\
---
description: Undefined variable on purpose.
model: gpt-4o-mini
---

Reply to {{missingVar}} now.
`

/** Frontmatter value has the wrong type → parser error. */
const PROMPT_WITH_PARSE_ERROR = `\
---
description: Clean.
model: 12345
---

Body.
`

let tmpRoot = ""

beforeEach(async () => {
  tmpRoot = await mkdtemp(path.join(tmpdir(), "promptlint-cli-"))
})

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

async function writeFixture(relPath: string, content: string): Promise<string> {
  const abs = path.join(tmpRoot, relPath)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, content, "utf8")
  return abs
}

describe("runCli — help and version", () => {
  it("renders the help text for --help", async () => {
    const result = await runCli(["--help"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("USAGE")
    expect(result.stdout).toContain("promptlint check")
    expect(result.stderr).toBe("")
  })

  it("renders the help text for -h", async () => {
    const result = await runCli(["-h"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("USAGE")
  })

  it("prints a version for --version", async () => {
    const result = await runCli(["--version"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toMatch(/^\d+\.\d+\.\d+/)
    expect(result.stderr).toBe("")
  })

  it("prints a version for -V", async () => {
    const result = await runCli(["-V"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toMatch(/^\d+\.\d+\.\d+/)
  })
})

describe("runCli — argument validation", () => {
  it("fails with exit code 2 when no command is given", async () => {
    const result = await runCli([], META_URL)
    expect(result.exitCode).toBe(ExitCode.Unexpected)
    expect(result.stderr).toContain("No command given")
    expect(result.stdout).toBe("")
  })

  it("fails with exit code 2 for an unknown command", async () => {
    const result = await runCli(["frobnicate"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Unexpected)
    expect(result.stderr).toContain('Unknown command "frobnicate"')
  })

  it("fails with exit code 2 when check has no path", async () => {
    const result = await runCli(["check"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Unexpected)
    expect(result.stderr).toContain("requires a path argument")
  })

  it("fails with exit code 2 when check has multiple paths", async () => {
    const result = await runCli(["check", "a", "b"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Unexpected)
    expect(result.stderr).toContain("single path argument")
  })

  it("fails with exit code 2 for an invalid --format value", async () => {
    const result = await runCli(["check", ".", "--format", "xml"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Unexpected)
    expect(result.stderr).toContain("--format")
    expect(result.stderr).toContain("xml")
  })

  it("fails with exit code 2 for an invalid --fail-on value", async () => {
    const result = await runCli(["check", ".", "--fail-on", "info"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Unexpected)
    expect(result.stderr).toContain("--fail-on")
  })

  it("fails with exit code 2 for an unknown flag", async () => {
    const result = await runCli(["check", ".", "--bogus"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Unexpected)
  })
})

describe("runCli — check on a single file", () => {
  it("exits 0 for a clean prompt file", async () => {
    const file = await writeFixture("hello.prompt.md", CLEAN_PROMPT)
    const result = await runCli(["check", file, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("No findings")
    expect(result.stdout).toContain("Scanned 1 file(s)")
  })

  it("exits 1 for a prompt file with warnings (default --fail-on warning)", async () => {
    const file = await writeFixture("warn.prompt.md", PROMPT_WITH_WARNINGS)
    const result = await runCli(["check", file, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
    expect(result.stdout).toContain("warning")
  })

  it("exits 1 for a prompt file with an error finding", async () => {
    const file = await writeFixture("err.prompt.md", PROMPT_WITH_ERROR)
    const result = await runCli(["check", file, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
    expect(result.stdout).toContain("error")
  })

  it("ignores a non-prompt file when given a directory path", async () => {
    const file = await writeFixture("notes.txt", "just a text file")
    const result = await runCli(["check", path.dirname(file), "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("No prompt files found")
  })
})

describe("runCli — check on a directory", () => {
  it("lints every prompt file under the directory recursively", async () => {
    await writeFixture("clean.prompt.md", CLEAN_PROMPT)
    await writeFixture("nested/warn.prompt.md", PROMPT_WITH_WARNINGS)
    const result = await runCli(["check", tmpRoot, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
    expect(result.stdout).toContain("Scanned 2 file(s)")
  })

  it("ignores the configured ignore-list directories", async () => {
    await writeFixture("clean.prompt.md", CLEAN_PROMPT)
    // A prompt inside node_modules must NOT be discovered.
    await writeFixture("node_modules/sneaky.prompt.md", PROMPT_WITH_ERROR)
    const result = await runCli(["check", tmpRoot, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("Scanned 1 file(s)")
    expect(result.stdout).not.toContain("node_modules")
  })

  it("ignores .git, dist, build, and coverage directories", async () => {
    await writeFixture("clean.prompt.md", CLEAN_PROMPT)
    await writeFixture(".git/x.prompt.md", PROMPT_WITH_ERROR)
    await writeFixture("dist/x.prompt.md", PROMPT_WITH_ERROR)
    await writeFixture("build/x.prompt.md", PROMPT_WITH_ERROR)
    await writeFixture("coverage/x.prompt.md", PROMPT_WITH_ERROR)
    const result = await runCli(["check", tmpRoot, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("Scanned 1 file(s)")
  })

  it("exits 0 with a 'no prompt files' message for an empty directory", async () => {
    await mkdir(path.join(tmpRoot, "empty"), { recursive: true })
    const result = await runCli(["check", path.join(tmpRoot, "empty"), "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toContain("No prompt files found")
  })
})

describe("runCli — exit codes", () => {
  it("returns exit code 2 for a path that does not exist", async () => {
    const result = await runCli(
      ["check", path.join(tmpRoot, "missing.prompt.md"), "--no-color"],
      META_URL,
    )
    expect(result.exitCode).toBe(ExitCode.Unexpected)
    expect(result.stderr).toContain("does not exist")
    expect(result.stdout).toBe("")
  })

  it("returns exit code 2 for a path that is neither file nor directory", async () => {
    // A non-existent deeply nested path also surfaces as not-accessible.
    const result = await runCli(
      ["check", path.join(tmpRoot, "nope", "deeper"), "--no-color"],
      META_URL,
    )
    expect(result.exitCode).toBe(ExitCode.Unexpected)
  })

  it("fail-on error promotes warnings to success and keeps errors as failure", async () => {
    const warnFile = await writeFixture("w.prompt.md", PROMPT_WITH_WARNINGS)
    const warnResult = await runCli(
      ["check", warnFile, "--no-color", "--fail-on", "error"],
      META_URL,
    )
    expect(warnResult.exitCode).toBe(ExitCode.Success)

    const errFile = await writeFixture("e.prompt.md", PROMPT_WITH_ERROR)
    const errResult = await runCli(["check", errFile, "--no-color", "--fail-on", "error"], META_URL)
    expect(errResult.exitCode).toBe(ExitCode.Failures)
  })

  it("info findings never fail the build even with --fail-on warning", async () => {
    // Filename `Upper.prompt.md` triggers convention/filename-naming (info).
    const file = await writeFixture("Upper.prompt.md", CLEAN_PROMPT)
    const result = await runCli(["check", file, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
  })
})

describe("runCli — output formats", () => {
  it("emits valid JSON for --format json", async () => {
    const file = await writeFixture("warn.prompt.md", PROMPT_WITH_WARNINGS)
    const result = await runCli(["check", file, "--format", "json", "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
    const parsed = JSON.parse(result.stdout) as {
      schemaVersion: number
      findings: Array<{ ruleId: string; severity: string }>
    }
    expect(parsed.schemaVersion).toBe(1)
    expect(Array.isArray(parsed.findings)).toBe(true)
    expect(parsed.findings.length).toBeGreaterThan(0)
  })

  it("emits a human-readable block for --format human", async () => {
    const file = await writeFixture("warn.prompt.md", PROMPT_WITH_WARNINGS)
    const result = await runCli(["check", file, "--format", "human", "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
    expect(result.stdout).toContain("PromptLint scan results")
    expect(result.stdout).toContain("Scanned 1 file(s)")
  })

  it("emits empty findings array in JSON for a clean file", async () => {
    const file = await writeFixture("clean.prompt.md", CLEAN_PROMPT)
    const result = await runCli(["check", file, "--format", "json", "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    const parsed = JSON.parse(result.stdout) as { findings: unknown[] }
    expect(parsed.findings).toEqual([])
  })
})

describe("runCli --quiet", () => {
  it("suppresses all output on a successful scan", async () => {
    const file = await writeFixture("clean.prompt.md", CLEAN_PROMPT)
    const result = await runCli(["check", file, "--quiet", "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toBe("")
    expect(result.stderr).toBe("")
  })

  it("still reports output when there are failures", async () => {
    const file = await writeFixture("warn.prompt.md", PROMPT_WITH_WARNINGS)
    const result = await runCli(["check", file, "--quiet", "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
    expect(result.stdout.length).toBeGreaterThan(0)
  })

  it("supports the -q short flag", async () => {
    const file = await writeFixture("clean.prompt.md", CLEAN_PROMPT)
    const result = await runCli(["check", file, "-q", "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
    expect(result.stdout).toBe("")
  })
})

describe("runCli --no-color", () => {
  it("accepts --no-color without error", async () => {
    const file = await writeFixture("clean.prompt.md", CLEAN_PROMPT)
    const result = await runCli(["check", file, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Success)
  })
})

describe("runCli — parser failures", () => {
  it("surfaces parser errors as parser/parse-error findings at error severity", async () => {
    const file = await writeFixture("bad.prompt.md", PROMPT_WITH_PARSE_ERROR)
    const result = await runCli(["check", file, "--format", "json", "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
    const parsed = JSON.parse(result.stdout) as {
      findings: Array<{ ruleId: string; severity: string; message: string }>
    }
    const parseErrors = parsed.findings.filter((f) => f.ruleId === "parser/parse-error")
    expect(parseErrors.length).toBeGreaterThan(0)
    expect(parseErrors.every((f) => f.severity === "error")).toBe(true)
    expect(parseErrors.some((f) => f.message.includes("model"))).toBe(true)
  })

  it("reports parser errors via the human reporter too", async () => {
    const file = await writeFixture("bad.prompt.md", PROMPT_WITH_PARSE_ERROR)
    const result = await runCli(["check", file, "--no-color"], META_URL)
    expect(result.exitCode).toBe(ExitCode.Failures)
    expect(result.stdout).toContain("parser/parse-error")
  })
})
