import type { RegexMatch } from "./regex.js"
import { findAllMatches } from "./regex.js"

/**
 * Vague quantifier vocabulary.
 *
 * The list captures the canonical patterns the V1 docs cite ("a few",
 * "various", "etc.", "and so on") plus additional phrases whose
 * cardinality is genuinely ambiguous when authoring prompts. A test
 * corpus Appendix in the README enumerates the exact list.
 */
export const VAGUE_QUANTIFIER_TERMS: readonly string[] = Object.freeze([
  "a few",
  "a couple of",
  "a couple",
  "various",
  "various kinds of",
  "various types of",
  "various things",
  "several",
  "some",
  "some kind of",
  "some sort of",
  "some number of",
  "many",
  "many things",
  "lots of",
  "lots",
  "dozens of",
  "dozens",
  "a bunch of",
  "a bunch",
  "etc",
  "etc.",
  "and so on",
  "and so forth",
  "and others",
  "and the like",
  "and more",
  "such as",
  "for example",
  "e.g.",
  "i.e.",
  "or something",
  "or something like that",
  "or so",
  "things like that",
  "stuff like that",
  "whatnot",
  "yada yada",
])

/**
 * Build the regex used to match vague quantifier phrases. Longer terms
 * are matched first to ensure that "various kinds of" wins over
 * "various", and term boundaries use the ASCII word boundary `\b`.
 *
 * Special characters in terms (`.`, `?`, etc.) are escaped before
 * inclusion in the alternation.
 */
function buildVagueQuantifierRegex(): RegExp {
  const sorted = [...VAGUE_QUANTIFIER_TERMS].sort((a, b) => b.length - a.length)
  const escaped = sorted.map((term) => {
    const escapedTerm = term.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")
    return `\\b${escapedTerm}\\b`
  })
  return new RegExp(`(?:${escaped.join("|")})`, "giu")
}

const VAGUE_QUANTIFIER_REGEX = buildVagueQuantifierRegex()

export interface VagueQuantifierMatch extends RegexMatch {
  readonly term: string
}

/**
 * Scan `body` for vague-quantifier phrasing. The term associated with
 * each match is normalized (lower-case, trimmed) so callers can group
 * duplicates deterministically.
 */
export function findVagueQuantifierMatches(body: string): readonly VagueQuantifierMatch[] {
  const out: VagueQuantifierMatch[] = []
  for (const m of findAllMatches(VAGUE_QUANTIFIER_REGEX, body)) {
    const term = m.text
      .trim()
      .toLowerCase()
      .replace(/[.,;:!?]+$/u, "")
    out.push({ ...m, term })
  }
  return out
}
