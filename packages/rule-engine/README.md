# @promptlint/rule-engine

Rule engine for PromptLint V1.

Phase 0 ships the data shapes (`EngineOptions`, `EngineResult`,
`EngineStats`) and the severity-override helpers (`resolveSeverity`,
`declaredOptions`). Phase 1 implements the async dispatcher that fans
files out to rules with bounded concurrency and merges findings in a
deterministic order.

The engine never performs I/O and never makes network calls. Inputs are
already-parsed `PromptFile` instances.
