# Governance

This document describes how the PromptLint project is steered,
maintained, and extended. It is intentionally short: PromptLint is a
small project, and our goal is to keep the decision-making process
transparent without adding ceremony.

## Roles

### Maintainers

Maintainers have write access to the repository and are responsible
for:

- Reviewing and merging pull requests.
- Cutting releases via Changesets.
- Triaging issues and discussions.
- Enforcing the [Code of Conduct](./CODE_OF_CONDUCT.md).
- Curating the road map.

The current set of maintainers is recorded in
[`.github/CODEOWNERS`](./.github/CODEOWNERS).

### Contributors

Anyone who opens an issue, submits a pull request, or participates in
discussions. Anyone can become a contributor by following the
[contributing guide](./CONTRIBUTING.md).

### Users

Anyone who consumes PromptLint — directly via the published packages
or by depending on internal APIs.

## Decision making

Day-to-day decisions are made by maintainers through pull-request
review. Anything that touches the public API contract documented in
[`PHASE-0-AUDIT.md`](./PHASE-0-AUDIT.md) requires sign-off from at
least one maintainer who is not the author.

For larger questions (road map scope, breaking changes, governance
itself), maintainers discuss in a pinned GitHub issue and record the
outcome in this document.

## Releases

PromptLint follows [semantic versioning](https://semver.org/) across
the public packages listed in the audit file. Releases are cut by a
maintainer using Changesets:

1. PRs that change user-facing behavior **must** include a changeset
   pulled together locally with `pnpm changeset`.
2. The [Changesets workflow](./.github/workflows/changesets.yml)
   produces a version-bump PR whenever changesets land on `main`.
3. Once that PR is merged, the workflow cuts a release per package
   and publishes to npm.

## Becoming a maintainer

Contributors who have shipped multiple non-trivial pull requests and
demonstrated judgement, responsiveness, and alignment with the
project goals may be invited to become a maintainer. Existing
maintainers reach consensus in a private discussion and announce the
change in a public issue.

## Changes to governance

Amendments to this document require a pull request approved by at
least two maintainers. Once merged, the change is announced in the
next release notes.
