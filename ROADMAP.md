# PromptLint Roadmap

PromptLint is evolving from a static analyzer into a comprehensive prompt engineering platform. Below is the vision for future development.

## 🎯 Short-Term Goals (v1.1 - v1.5)

### 🛠 Core Engine
- [ ] **Custom Rule API**: Allow users to define custom rules in their `promptlint.config.ts` using a provided SDK.
- [ ] **Auto-Fix Support**: Implement `fix` capabilities for common structural issues (e.g., automatically adding missing model fields).
- [ ] **Advanced Tokenization**: Integrate with `tiktoken` or similar for exact token counts per model family.

### 📦 CLI & Integration
- [ ] **IDE Plugin (VS Code)**: Real-time linting as you write prompts in your editor.
- [ ] **CI/CD GitHub Action**: A first-party action to integrate PromptLint into GitHub Workflows effortlessly.
- [ ] **JSON-Schema Export**: Automatically export the `outputSchema` to a standalone file for downstream validation.

---

## 🔭 Long-Term Vision (v2.0+)

### 🧪 Prompt Testing & Evaluation
- [ ] **Assertion Framework**: Define "Gold Standard" outputs and verify that prompt changes don't regress the actual LLM output.
- [ ] **A/B Testing Support**: Compare two prompt versions and report differences in quality and cost.
- [ ] **Integration with Eval Frameworks**: First-class support for integrating with tools like Promptfoo or LangSmith.

### 🏗 Enterprise Features
- [ ] **Shared Rule Sets**: Ability to import rule sets from remote URLs or npm packages.
- [ ] **Prompt Versioning**: Built-in support for semantic versioning of individual prompt files.
- [ ] **Governance Dashboard**: A visual overview of prompt health across a large organization.

---

## 💡 How to Help
We are always looking for contributors! If any of these goals align with your interests, please open an issue or a PR.
