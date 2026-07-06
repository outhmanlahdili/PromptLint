import type { Finding } from "@promptlint/types"

/**
 * Stable, versioned JSON output. The JSON shape is part of the V1
 * contract: downstream tooling may adopt any release that conforms to
 * this schema, regardless of additional fields added later under
 * non-breaking changes.
 */
export interface JsonReporterPayload {
  readonly schemaVersion: 1
  readonly generatedAt: string
  readonly findings: ReadonlyArray<Finding>
}

/**
 * Build a JSON reporter payload. Phase 2 wires this into the reporter
 * facade that the CLI dispatches to.
 */
export function toJsonPayload(
  findings: ReadonlyArray<Finding>,
  generatedAt: Date = new Date(),
): JsonReporterPayload {
  return Object.freeze({
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    findings,
  })
}

/**
 * Serialize a payload to a single-line JSON string. The result is
 * deterministic for any given input because the payload values are
 * already-immutable. The serializer adds no whitespace.
 */
export function serializeJson(payload: JsonReporterPayload): string {
  return JSON.stringify(payload)
}

export { type JsonReporterPayload, toJsonPayload, serializeJson }
