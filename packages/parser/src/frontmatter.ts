import type { PromptFrontmatter, SourceLocation } from "@prompt-lint/types"
import { z } from "zod"
import { parseYaml } from "./yaml.js"

const promptFrontmatterValueSchema = z
  .object({
    description: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    variables: z.array(z.string().min(1)).optional(),
    outputSchema: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export const promptFrontmatterSchema = z.record(z.string(), z.unknown()).transform((raw, ctx) => {
  const known: {
    description?: string
    model?: string
    variables?: string[]
    outputSchema?: Record<string, unknown>
  } = {}
  const extras: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (key === "description" || key === "model" || key === "variables" || key === "outputSchema") {
      const wrapped = { [key]: value }
      const partial = promptFrontmatterValueSchema.partial().safeParse(wrapped)
      if (!partial.success) {
        for (const issue of partial.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `frontmatter.${key}: ${issue.message}`,
          })
        }
        return z.NEVER
      }
      const validated = partial.data
      if (validated.description !== undefined) {
        known.description = validated.description
      }
      if (validated.model !== undefined) {
        known.model = validated.model
      }
      if (validated.variables !== undefined) {
        known.variables = [...validated.variables]
      }
      if (validated.outputSchema !== undefined) {
        known.outputSchema = { ...validated.outputSchema }
      }
    } else {
      extras[key] = value
    }
  }
  return { ...known, extras }
})

export interface FrontmatterRange {
  readonly endOffset: number
  readonly hasFrontmatter: boolean
}

export interface FrontmatterResult {
  readonly range: FrontmatterRange
  readonly value: PromptFrontmatter
  readonly errors: readonly FrontmatterError[]
}

export interface FrontmatterError {
  readonly message: string
  readonly location: SourceLocation
}

const FENCE = "---"

export function splitFrontmatter(source: string): FrontmatterRange {
  const stripped = source.replace(/^\uFEFF/, "")
  const lines = stripped.split(/\r?\n/)
  if (lines.length < 2 || lines[0]?.trim() !== FENCE) {
    return { endOffset: 0, hasFrontmatter: false }
  }

  let endIndex = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === FENCE) {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) {
    return { endOffset: 0, hasFrontmatter: false }
  }

  let offset = 0
  for (let i = 0; i <= endIndex; i += 1) {
    offset += (lines[i]?.length ?? 0) + 1
  }

  return { endOffset: offset, hasFrontmatter: true }
}

export function extractFrontmatter(source: string): FrontmatterResult {
  const range = splitFrontmatter(source)
  if (!range.hasFrontmatter) {
    return {
      range,
      value: Object.freeze({}),
      errors: [],
    }
  }

  const stripped = source.replace(/^\uFEFF/, "")
  const lines = stripped.split(/\r?\n/)
  let endIndex = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === FENCE) {
      endIndex = i
      break
    }
  }

  const yamlLines = lines.slice(1, endIndex)
  const yamlText = yamlLines.join("\n")
  const yamlResult = parseYaml(yamlText, 2)
  const errors: FrontmatterError[] = []
  for (const err of yamlResult.errors) {
    errors.push({
      message: `frontmatter: ${err.message}`,
      location: err.location,
    })
  }

  const parseResult = promptFrontmatterSchema.safeParse(yamlResult.value)
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push({
        message: `frontmatter: ${issue.message}`,
        location: { line: 2, column: 1, endLine: endIndex, endColumn: 1 },
      })
    }
    return { range, value: Object.freeze({}), errors }
  }

  const merged: PromptFrontmatter = Object.freeze({
    ...(parseResult.data.description !== undefined
      ? { description: parseResult.data.description }
      : {}),
    ...(parseResult.data.model !== undefined ? { model: parseResult.data.model } : {}),
    ...(parseResult.data.variables !== undefined
      ? { variables: Object.freeze([...parseResult.data.variables]) }
      : {}),
    ...(parseResult.data.outputSchema !== undefined
      ? { outputSchema: Object.freeze({ ...parseResult.data.outputSchema }) }
      : {}),
    ...(Object.keys(parseResult.data.extras).length > 0
      ? { extra: Object.freeze({ ...parseResult.data.extras }) }
      : {}),
  })

  return { range, value: merged, errors }
}
