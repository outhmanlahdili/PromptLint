# Security Policy

PromptLint is a developer tool that runs locally on prompt files and
their configuration. While it does not perform remote network requests,
we still take the security of the project — and the integrity of our
release pipeline — seriously.

## Supported versions

The following table lists which versions of PromptLint currently
receive security fixes.

| Version | Supported          |
| ------- | ------------------ |
| `0.x`   | :white_check_mark: |

Pre-release and `0.0.x` packages published under the `@prompt-lint/*`
namespace receive security fixes until the corresponding package reaches
its first stable major release. After that, only the latest minor
release line is supported.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security
vulnerabilities. Instead, report privately via one of the channels
below so we can triage and respond before public disclosure:

- **Email**: security@promptlint.dev (preferred)
- **GitHub**: use the **"Report a security vulnerability"** button on
  the repository's **Security** tab to open a private advisory.

Please include as much of the following information as possible:

- The affected package(s) and version(s).
- A clear description of the vulnerability and its impact.
- Step-by-step reproduction instructions or a proof-of-concept.
- The expected behavior versus the actual behavior.
- Any relevant logs, stack traces, or screenshots.

## Response process

1. **Acknowledgement** — Within 72 hours of receiving a report, a
   maintainer will acknowledge the report and assign it a tracking
   identifier.
2. **Triage** — We assess severity, scope, and reproducer
   completeness.
3. **Fix** — We develop a fix behind a private fork, request a CVE
   identifier if appropriate, and prepare a coordinated release.
4. **Disclosure** — Once the fix is published, we publish a security
   advisory on GitHub describing the issue, severity, affected
   versions, and mitigation steps.

We aim for an initial triage within one week and a fix within 30 days
of triage, but timelines depend on severity and complexity.

## Out of scope

The following are **not** considered security vulnerabilities in this
project:

- Prompt-injection content in prompt files: PromptLint is designed to
  **report** such content to users; it does not interpret or act on
  untrusted prompt content. Concerns about prompt content should be
  filed as regular bug reports.
- Vulnerabilities in third-party dependencies that we cannot
  reasonably fix upstream. These should still be reported so we can
  document workarounds and update versions.

## Safe-harbor

We will not pursue legal action against researchers who, in good
faith, follow this policy and avoid privacy violations, service
disruption, and unauthorized access to user data.
