# `@promptlint/reporter-json`

JSON reporter.

Phase 0 ships the deterministic serializer (`toJsonPayload`,
`serializeJson`) and the `JsonReporterPayload` interface that pins the
V1 schema to `schemaVersion: 1`.

Phase 2 wires the serializer into the reporter facade that the CLI
selects when `--reporter=json` is passed.
