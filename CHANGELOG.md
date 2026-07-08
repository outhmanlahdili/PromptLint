# Changelog

All notable changes to this project will be documented in this file.

The format chosen for this file is [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2026-07-08

### Added
- **Core Engine**: High-performance rule engine with sequential dispatch and deep-freeze invariants.
- **Parser**: Dependency-free parser for `.prompt.md` (Markdown/YAML), `.prompt.ts`, and `.prompt.json`.
- **Configuration System**: Zod-validated config loader supporting `promptlint.config.{ts,json}` with upward walk and rule-option overrides.
- **CLI**: Command-line interface with support for recursive discovery, multiple reporters, and severity-based exit codes.
- **Built-in Rules**: 10 initial rules covering structure, cost, security, quality, and convention.
- **Reporters**: Human-readable terminal reporter and deterministic JSON reporter.
- **Documentation**: Comprehensive root README, rule catalog, and CLI guide.
- **CI/CD**: GitHub Actions pipeline for linting, type-checking, testing, and building.
- **Examples**: Minimal and comprehensive example projects for rapid onboarding.
