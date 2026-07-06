import { createHash } from "node:crypto"
import type { PromptFile, PromptFormat, PromptFrontmatter, SourceLocation } from "@promptlint/types"

/**
 * Build a deterministic `PromptFile` for tests. The `contentHash` is
 * computed from the inputs so tests stay robust against copy-paste
 * changes near the implementation.
 *
 * Tests SHOULD use this helper instead of constructing `PromptFile`
 * literals directly so that future evolutions of the type (additional
 * required fields) require a single update here.
 */
export interface MakePromptFileInput {
  readonly path: string
  readonly format: PromptFormat
  readonly body: string
  readonly frontmatter?: PromptFrontmatter
  readonly variables?: ReadonlyArray<{ name: string; locations?: ReadonlyArray<SourceLocation> }>
}

export function makePromptFile(input: MakePromptFileInput): PromptFile {
  const normalizedPath = input.path.replaceAll("\\", "/")
  const variables = (input.variables ?? []).map((v) => ({
    name: v.name,
    locations: v.locations ?? [],
  }))
  const contentHash = createHash("sha256")
    .update(`${normalizedPath}\u0000${input.format}\u0000${input.body}`)
    .digest("hex")
  return Object.freeze({
    id: normalizedPath,
    path: normalizedPath,
    format: input.format,
    body: input.body,
    frontmatter: Object.freeze({ ...(input.frontmatter ?? {}) }),
    variables: Object.freeze(variables),
    contentHash,
  })
}

export { makePromptFile }
