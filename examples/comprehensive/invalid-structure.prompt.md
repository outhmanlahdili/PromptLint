---
variables:
  - declaredVar
  - unusedVar
---

This prompt is missing both model and description.
It also references an undefined variable: {{someUndefinedVar}}.
But we never actually use {{declaredVar}}? No, wait, declaredVar is used.
What about unusedVar? It is declared in frontmatter but never used here.
