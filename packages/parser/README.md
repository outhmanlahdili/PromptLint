# @promptlint/parser

Parsers for `.prompt.md`, `.prompt.ts`, and `.prompt.json`.

Phase 0 ships:

- `RawPromptInput`: the input shape every parser receives.
- `ParseResult` / `ParseError`: the output shape every parser returns.
- `PromptParser`: the interface contract dispatchers implement against.
- `derivePromptId`: path normalization helper shared by the engine and
  future caches.

Phase 1 implements the three format-specific parsers and registers them
via the engine's format registry.
