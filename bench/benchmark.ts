import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { lint } from "../apps/cli/src/index.js"

async function runBenchmark() {
  console.info("🚀 Starting PromptLint Performance Benchmark...")

  const tmpRoot = await mkdtemp(path.join(tmpdir(), "promptlint-bench-"))
  const count = 100
  const promptsDir = path.join(tmpRoot, "prompts")
  await mkdir(promptsDir)

  console.info(`Generating ${count} synthetic prompt files...`)
  for (let i = 0; i < count; i++) {
    const filename = `prompt-${i}.prompt.md`
    const content = `---\nmodel: gpt-4\ndescription: Bench prompt ${i}\nvariables: [var1]\n---\n\n${"This is a synthetic prompt for benchmarking purposes. ".repeat(
      Math.floor(Math.random() * 10) + 1,
    )}\nHello {{var1}}, please help me with this task.`
    await writeFile(path.join(promptsDir, filename), content)
  }

  console.info(`Scanning ${count} files...`)
  const start = performance.now()

  const result = await lint(promptsDir, {
    format: "human",
    failOn: "warning",
    quiet: true,
    noColor: true,
  })

  const end = performance.now()
  const totalMs = end - start
  const perFileMs = totalMs / count

  console.info("\n--- Benchmark Results ---")
  console.info(`Total files:   ${count}`)
  console.info(`Total time:    ${totalMs.toFixed(2)} ms`)
  console.info(`Average time:  ${perFileMs.toFixed(2)} ms/file`)
  console.info(`Findings:      ${result.stdout.includes("findings") ? "Yes" : "No"}`)
  console.info("-------------------------\n")

  await rm(tmpRoot, { recursive: true, force: true })
}

runBenchmark().catch(console.error)
