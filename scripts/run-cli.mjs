import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const cliDir = path.resolve(here, "..", "apps", "cli")
const tsxLoader = path.join(cliDir, "node_modules", "tsx", "dist", "loader.mjs")
const binPath = path.join(cliDir, "bin", "promptlint.ts")

const invokerCwd = process.env.INIT_CWD ?? process.cwd()
const forwardedArgv = process.argv.slice(2)

const child = spawn(
  process.execPath,
  ["--import", pathToFileURL(tsxLoader).href, binPath, ...forwardedArgv],
  { cwd: invokerCwd, stdio: "inherit" },
)
child.on("exit", (code) => process.exit(code ?? 2))
