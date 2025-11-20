---
title: "Code Quality Automation and Linting Enforcement"
slug: "code-quality-automation-and-linting-enforcement"
category: "Expert"
skillLevel: "expert"
difficulty: 3
estimatedReadingTime: 30
constitutional: true
tags: ["lint", "automation", "quality", "eslint"]
prerequisites: ["unit-testing-with-jest-and-angular-testing-library", "monorepo-and-workspace-management-nx-angular-cli-workspaces", "code-review"]
relatedTopics: ["integration-testing-and-continuous-integration-pipelines", "security-best-practices-xss-sanitization-csp", "design-systems-and-theming-architecture"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/code-quality-automation-and-linting-enforcement.md"
---

# Code Quality Automation and Linting Enforcement

## Learning Objectives
- Configure ESLint, Stylelint, markdown linting, and custom schematics to enforce constitutional rules.
- Automate review gates (Git hooks, CI checks, merge requirements).
- Provide developer tooling (VS Code settings, autofixes) to keep friction low.

## ESLint Strategy
- Extend from `@angular-eslint/recommended` + project-specific rules.
- Add template linting (`@angular-eslint/template/accessibility-label-for`).
- Define rule overrides per directory (e.g., `apps/**` vs `libs/**`).

```json
{
  "overrides": [
    {
      "files": ["*.ts"],
      "rules": {
        "@angular-eslint/prefer-on-push-component-change-detection": "error",
        "rxjs/no-exposed-subjects": "warn"
      }
    }
  ]
}
```

## Automation Hooks
- **pre-commit**: run `lint-staged` to lint changed files.
- **pre-push**: run targeted tests via `nx affected --target=test --files`.
- **CI**: block merges when lint/test/format tasks fail.

## Reporting
- Publish lint + test summaries as GitHub PR comments.
- Track quality trends (violations/week) in dashboards.
- Provide auto-fix bots (e.g., `ng lint --fix`) triggered nightly.

## Checklist
- [ ] Document lint waivers + expiration dates.
- [ ] Keep rule set version-controlled per branch (no local overrides).
- [ ] Provide developer onboarding docs with VS Code extension list.
- [ ] Align lint rules with design system + security policies.
- [ ] Run formatters (`prettier`, `stylelint`) in CI to avoid drift.

## Next Steps
- Feed results into [[integration-testing-and-continuous-integration-pipelines]].
- Align with [[security-best-practices-xss-sanitization-csp]] for security linting.
- Use tokens + style linting from [[design-systems-and-theming-architecture]].
