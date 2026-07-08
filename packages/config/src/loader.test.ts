import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "./defaults.ts"
import { ConfigError } from "./errors.ts"
import { loadConfig } from "./loader.ts"

let tmpRoot = ""

beforeEach(async () => {
  tmpRoot = await mkdtemp(path.join(tmpdir(), "promptlint-config-"))
})

afterEach(async () => {
  await rm(tmpRoot, { recursive: true, force: true })
})

async function writeConfigFile(relPath: string, content: string): Promise<string> {
  const abs = path.join(tmpRoot, relPath)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, content, "utf8")
  return abs
}

describe("loadConfig — JSON", () => {
  it("returns defaults when no config file exists in any ancestor", async () => {
    const result = await loadConfig(tmpRoot)
    expect(result.config).toEqual(DEFAULT_CONFIG)
    expect(result.filePath).toBeNull()
  })

  it("loads a `promptlint.config.json` next to the cwd", async () => {
    await writeConfigFile(
      "promptlint.config.json",
      JSON.stringify({
        failOn: "error",
        format: "json",
        ignore: ["dist/**"],
        rules: { "structure/missing-model": "off" },
      }),
    )
    const result = await loadConfig(tmpRoot)
    expect(result.filePath).toBe(path.join(tmpRoot, "promptlint.config.json"))
    expect(result.config.failOn).toBe("error")
    expect(result.config.format).toBe("json")
    expect(result.config.ignore).toEqual(["dist/**"])
    expect(result.config.rules).toEqual({ "structure/missing-model": "off" })
  })

  it("walks upward to find a config in an ancestor directory", async () => {
    const nested = await writeConfigFile(
      "a/b/c/promptlint.config.json",
      JSON.stringify({ failOn: "error" }),
    )
    await mkdir(path.join(tmpRoot, "a/b/c/d"), { recursive: true })
    const startDir = path.join(tmpRoot, "a/b/c/d")
    const result = await loadConfig(startDir)
    expect(result.filePath).toBe(nested)
    expect(result.config.failOn).toBe("error")
  })

  it("prefers the closest config when multiple exist", async () => {
    await writeConfigFile("promptlint.config.json", JSON.stringify({ failOn: "error" }))
    await writeConfigFile("sub/promptlint.config.json", JSON.stringify({ failOn: "warning" }))
    await mkdir(path.join(tmpRoot, "sub/deep"), { recursive: true })
    const result = await loadConfig(path.join(tmpRoot, "sub/deep"))
    expect(result.config.failOn).toBe("warning")
  })

  it("throws ConfigError on invalid JSON content", async () => {
    await writeConfigFile("promptlint.config.json", "{ this is not json")
    await expect(loadConfig(tmpRoot)).rejects.toBeInstanceOf(ConfigError)
  })

  it("surfaces the file path in the error message on parse failure", async () => {
    const filePath = await writeConfigFile(
      "promptlint.config.json",
      JSON.stringify({ failOn: "unknown" }),
    )
    try {
      await loadConfig(tmpRoot)
      throw new Error("expected loadConfig to throw")
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ConfigError)
      expect((err as Error).message).toContain(filePath)
    }
  })

  it("rejects unknown top-level keys with a clear error", async () => {
    await writeConfigFile("promptlint.config.json", JSON.stringify({ foo: 1 }))
    await expect(loadConfig(tmpRoot)).rejects.toBeInstanceOf(ConfigError)
  })
})

describe("loadConfig — TypeScript", () => {
  it("loads a `promptlint.config.ts` next to the cwd", async () => {
    await writeConfigFile(
      "promptlint.config.ts",
      [
        'import type { PromptlintConfig } from "@promptlint/config"',
        "const config: PromptlintConfig = {",
        '  failOn: "error",',
        '  format: "json",',
        '  ignore: ["dist/**"],',
        '  rules: { "structure/missing-model": "off" },',
        "}",
        "export default config",
        "",
      ].join("\n"),
    )
    const result = await loadConfig(tmpRoot)
    expect(result.filePath).toBe(path.join(tmpRoot, "promptlint.config.ts"))
    expect(result.config.failOn).toBe("error")
    expect(result.config.format).toBe("json")
    expect(result.config.ignore).toEqual(["dist/**"])
    expect(result.config.rules).toEqual({ "structure/missing-model": "off" })
  })

  it("accepts a TS config with a named export", async () => {
    await writeConfigFile(
      "promptlint.config.ts",
      ["export const config = {", '  failOn: "error",', "}", ""].join("\n"),
    )
    const result = await loadConfig(tmpRoot)
    expect(result.config.failOn).toBe("error")
  })

  it("rejects a TS config whose default export fails schema validation", async () => {
    await writeConfigFile(
      "promptlint.config.ts",
      ["export default {", '  failOn: "unknown",', "}", ""].join("\n"),
    )
    await expect(loadConfig(tmpRoot)).rejects.toBeInstanceOf(ConfigError)
  })
})

describe("loadConfig — precedence", () => {
  it("explicit `promptlint.config.ts` wins over an inherited `promptlint.config.json`", async () => {
    await writeConfigFile("promptlint.config.json", JSON.stringify({ failOn: "error" }))
    await writeConfigFile(
      "sub/promptlint.config.ts",
      ['const config = { failOn: "warning" }', "export default config", ""].join("\n"),
    )
    await mkdir(path.join(tmpRoot, "sub"), { recursive: true })
    const result = await loadConfig(path.join(tmpRoot, "sub"))
    expect(result.config.failOn).toBe("warning")
    expect(result.filePath).toBe(path.join(tmpRoot, "sub", "promptlint.config.ts"))
  })

  it("ancestor JSON is found when no config exists in the starting directory", async () => {
    await writeConfigFile("promptlint.config.json", JSON.stringify({ failOn: "error" }))
    await mkdir(path.join(tmpRoot, "deep/nested"), { recursive: true })
    const result = await loadConfig(path.join(tmpRoot, "deep/nested"))
    expect(result.config.failOn).toBe("error")
    expect(result.filePath).toBe(path.join(tmpRoot, "promptlint.config.json"))
  })
})
