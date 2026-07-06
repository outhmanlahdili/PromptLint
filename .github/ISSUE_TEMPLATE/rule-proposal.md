---
name: Rule proposal
about: Propose a new built-in lint rule
title: "rule: "
labels: ["rules", "enhancement"]
assignees: []
---

## Rule metadata

- **Rule ID:** `category/short-name` (e.g., `quality/missing-output-schema`)
- **Category:** structure | cost | security | quality | convention
- **Severity:** error | warning | info
- **Auto-fixable:** No (V1 is diagnostics-only)

## Description

A one-paragraph description of what the rule detects.

## Why it matters

Real-world scenarios where the absence of this rule causes harm.

## Examples

### Failing example

```md
---
model: openai:gpt-4o
---

Summarize the user document.
```

### Passing example

```md
---
model: openai:gpt-4o
description: Summarize an incoming user document into three bullet points.
---

Summarize the user document into three bullet points.
```

## Determinism

This rule must be deterministic and require no network access in V1.

## Implementation notes

Optional: sketch of how the rule would query the prompt file.
