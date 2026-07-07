/**
 * Token estimation.
 *
 * `estimateTokens` is intentionally simple: it approximates the count
 * Claude-family models produce for English-heavy natural language. The
 * heuristic splits on whitespace, then applies a per-token ratio that
 * accounts for the fact that whitespace-delimited words frequently split
 * into multiple tokens at subword boundaries.
 *
 * The function is pure, deterministic, and operates on a string that may
 * contain unicode characters. It is designed to be sufficient for V1
 * budget enforcement — not to replace a model-specific tokenizer.
 */

const AVERAGE_CHARS_PER_TOKEN = 4

/**
 * Estimate the number of tokens produced by `body`.
 *
 * Empty or whitespace-only inputs return `0`. Inputs that contain no
 * alphanumeric characters return `1` because the engine still has to
 * transmit at least the placeholder token.
 *
 * @example
 *   estimateTokens("Hello, world!")          // ~3
 *   estimateTokens("The quick brown fox")   // ~4
 */
export function estimateTokens(body: string): number {
  if (body.length === 0) return 0

  const trimmed = body.trim()
  if (trimmed.length === 0) return 0

  let hasAlphanumeric = false
  let letterCount = 0
  for (let i = 0; i < body.length; i += 1) {
    const code = body.charCodeAt(i)
    if (
      // ASCII digits
      (code >= 0x30 && code <= 0x39) ||
      // ASCII letters
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      // Latin-1 supplement letters
      (code >= 0xc0 && code <= 0xff && code !== 0xd7 && code !== 0xf7) ||
      // Latin Extended A
      (code >= 0x100 && code <= 0x17f) ||
      // Cyrillic block
      (code >= 0x400 && code <= 0x4ff) ||
      // Greek block
      (code >= 0x370 && code <= 0x3ff) ||
      // CJK ideographs (partial — covers BMP core)
      (code >= 0x4e00 && code <= 0x9fff) ||
      // Hiragana / Katakana
      (code >= 0x3040 && code <= 0x30ff)
    ) {
      hasAlphanumeric = true
      letterCount += 1
    }
  }

  if (!hasAlphanumeric) return 1

  const approx = Math.max(1, Math.ceil(letterCount / AVERAGE_CHARS_PER_TOKEN))
  return approx
}
