import { spawn } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

/**
 * Smoke test: launches the real `promptlint` bin as a subprocess under
 * tsx to prove the CLI is usable from the terminal (the Phase 4
 * deliverable). The integration tests in `cli.test.ts` cover the
 * orchestration logic in-process; this test covers the bin shim, the
 * shebang, the tsx runtime resolution, and the workspace package wiring
 * that only exist when the process is actually spawned.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const binPath = path.resolve(here, "..", "bin", "promptlint.ts")
const cliRoot = path.resolve(here, "..")

interface SpawnResult {
  readonly code: number | null
  readonly stdout: string
  readonly stderr: string
}

function runBin(args: readonly string[]): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "--import",
        // Resolve tsx via the CLI package's own node_modules so the test
        // does not depend on a global tsx install. The path is a file URL
        // so Windows drive letters are handled correctly.
        pathToFileURL(require.resolve("tsx", { paths: [cliRoot] })).href,
        binPath,
        ...args,
      ],
      { cwd: cliRoot },
    )
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on("close", (code) => resolve({ code, stdout, stderr }))
  })
}

let tmpRoot = ""

beforeEach(async () => {
  tmpRoot = await mkdtemp(path.join(tmpdir(), "promptlint-bin-"))
})

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

describe("bin/promptlint.ts — subprocess launch", () => {
  it("exits 0 and prints usage for --help", async () => {
    const result = await runBin(["--help"])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("USAGE")
    expect(result.stdout).toContain("promptlint check")
  })

  it("exits 0 and prints a version for --version", async () => {
    const result = await runBin(["--version"])
    expect(result.code).toBe(0)
    expect(result.stdout).toMatch(/^\d+\.\d+\.\d+/)
  })

  it("exits 2 for an invalid invocation", async () => {
    const result = await runBin(["totally-unknown-command"])
    expect(result.code).toBe(2)
    expect(result.stderr).toContain("Unknown command")
  })

  it("scans a clean prompt file end-to-end and exits 0", async () => {
    const file = path.join(tmpRoot, "hello.prompt.md")
    await writeFile(
      file,
      `---
description: Smoke.
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

Reply to {{userMessage}}.
`,
      "utf8",
    )
    const result = await runBin(["check", file, "--no-color"])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain("Scanned 1 file(s)")
  })

  it("reports findings and exits 1 for a prompt with problems", async () => {
    const file = path.join(tmpRoot, "bad.prompt.md")
    await writeFile(file, "Reply to {{undefinedVar}} now.\n", "utf8")
    const result = await runBin(["check", file, "--format", "json", "--no-color"])
    expect(result.code).toBe(1)
    const parsed = JSON.parse(result.stdout) as { findings: Array<{ ruleId: string }> }
    expect(parsed.findings.length).toBeGreaterThan(0)
  })

  it("does not crash for a missing path", async () => {
    const result = await runBin(["check", path.join(tmpRoot, "nope.prompt.md"), "--no-color"])
    expect(result.code).toBe(2)
    expect(result.stderr).toContain("does not exist")
    // The crucial contract: no uncaught-exception traceback leaks to the user.
    expect(result.stderr).not.toContain("at ")
  })
})
