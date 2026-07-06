import { createHash } from "node:crypto"

/**
 * Deterministic SHA-256 hashing for the parser foundation.
 *
 * This function computes a hash of a prompt's identity and content,
 * ensuring that the same input always produces the same hash.
 *
 * @param input - The prompt identity and content to hash.
 * @returns 64-character lowercase hex SHA-256 digest.
 */
export interface ContentHashInput {
  readonly path: string
  readonly format: string
  readonly body: string
  readonly frontmatter?: Readonly<Record<string, unknown>>
}

export function computeContentHash(input: ContentHashInput): string {
  const normalizedPath = input.path.replaceAll("\\", "/")
  const normalizedBody = input.body.endsWith("\n") ? input.body.slice(0, -1) : input.body
  const payload = [
    normalizedPath,
    input.format,
    normalizedBody,
    JSON.stringify(sortObject(input.frontmatter ?? {}), replacer),
  ].join("\u0000")

  return createHash("sha256").update(payload).digest("hex")
}

function sortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj
  }

  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj as Record<string, unknown>).sort()

  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key]
    sorted[key] = typeof value === "object" && value !== null ? sortObject(value) : value
  }

  return sorted
}

function replacer(_key: string, value: unknown): unknown {
  if (value === undefined) return undefined
  return value
}
