# `@promptlint/reporter-human`

Human-readable terminal reporter.

Phase 0 ships the pure formatter (`formatFindingsForHuman`,
`formatFindingLine`) and the `SEVERITY_GLYPH` lookup. The formatter is
deliberately I/O-free so that snapshot tests can lock the output shape
without touching the real stdout.

Phase 2 wires the formatter into a `Reporter` implementation that the
CLI selects when `--reporter=human` is set or omitted (since human is
the V1 default).
