---
description: A minimal example prompt used by PromptLint tests and docs.
model: gpt-4o-mini
variables:
  - userMessage
outputSchema:
  type: object
  properties:
    reply:
      type: string
  required:
    - reply
---

You are a helpful assistant. Respond to the user message below.

User: {{userMessage}}
