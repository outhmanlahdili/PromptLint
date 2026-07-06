# @promptlint/parser

Parsers for `.prompt.md`, `.prompt.ts`, and `.prompt.json` prompt files.

## Phase 0 (shipped)

- `RawPromptInput`: the input shape every parser receives.
- `ParseResult` / `ParseError`: the output shape every parser returns.
- `PromptParser`: the interface contract dispatchers implement against.
- `derivePromptId`: path normalization helper shared by the engine and
  future caches.

## Phase 1 (shipped)

Phase 1 turns the Phase 0 contracts into a working parser foundation for
`.prompt.md`. Additional formats (`.prompt.json`, `.prompt.ts`) are
registered with `PromptParser` shells that report an "not yet
implemented" diagnostic and an empty body — this preserves the engine's
behavior while the converters are completed in later phases.

### Public API (Phase 1 additions)

```ts
import {
  parsePrompt,
  createParser,
  parseMarkdownPrompt,
  extractFrontmatter,
  splitFrontmatter,
  promptFrontmatterSchema,
  scanVariables,
  collectVariables,
  computeContentHash,
  parseYaml,
} from "@promptlint/parser";
```

- `parsePrompt(input: RawPromptInput): ParseResult` — format-aware
  dispatcher; returns the result of the matching parser. Unknown formats
  report a parse error and produce an empty stub `PromptFile`.
- `createParser(format: PromptFormat): PromptParser` — factory used by
  the engine to register parsers.
- `parseMarkdownPrompt(input: RawPromptInput): ParseResult` — extracts
  and validates YAML frontmatter, strips it from the body, scans
  mustache-style variables, and computes a deterministic SHA-256 content
  hash. All outputs are deeply frozen.
- `extractFrontmatter(source)` / `splitFrontmatter(source)` — read
  frontmatter from a Markdown document. `extractFrontmatter` runs Zod
  validation; `splitFrontmatter` is the lighter-weight raw splitter.
- `promptFrontmatterSchema` — Zod schema used by `extractFrontmatter`
  to turn YAML into the `PromptFrontmatter` shape. Unknown keys land in
  the `extra` field so future V2 features can still inspect them.
- `scanVariables(body, startOffset?)` — tokenizes `{{ name }}` (with
  filter pipes tolerated) and returns `{ name, location }` occurrences
  with 1-indexed line/column coordinates.
- `collectVariables(occurrences)` — coalesces occurrences into a stable
  `PromptVariable[]` whose `locations` are sorted in source order.
- `computeContentHash({ path, format, body, frontmatter })` — produces
  a 64-character lowercase hex SHA-256, sorted by frontmatter key, with
  trailing newlines and Windows path separators normalized.
- `parseYaml(source, baseLine?)` — dependency-free YAML subset parser.
  Supports block and flow mappings, sequences, scalars, and quoted
  strings. Other shapes surface a `YamlParseError` with a source range.

### Determinism guarantees

- Identical inputs produce identical output (`PromptFile.contentHash`
  matches across runs and across machines).
- All exported structures are deeply frozen with `Object.freeze`.
- Paths use forward slashes regardless of the host OS.
- Frontmatter keys are sorted before hashing so permuting keys does
  not change the hash.
- Trailing newlines on the body are stripped before hashing.
- The internal scanner ignores BOM at file start.

### Architecture boundary

The parser is intentionally pure: no I/O, no rule logic, no
configuration loading. All of those live in `@promptlint/rule-engine`
and `@promptlint/config` (Phase 2+).
