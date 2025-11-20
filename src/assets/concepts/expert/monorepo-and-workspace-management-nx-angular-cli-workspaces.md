---
title: "Monorepo and Workspace Management (Nx, Angular CLI Workspaces)"
slug: "monorepo-and-workspace-management-nx-angular-cli-workspaces"
category: "Expert"
skillLevel: "expert"
difficulty: 4
estimatedReadingTime: 45
constitutional: true
tags: ["monorepo", "nx", "workspace", "tooling", "governance"]
prerequisites: ["application-architecture-and-module-boundaries", "reusable-component-libraries-and-shared-modules", "unit-testing-with-jest-and-angular-testing-library"]
relatedTopics: ["microfrontend-architecture-and-module-federation", "integration-testing-and-continuous-integration-pipelines", "code-quality-automation-and-linting-enforcement"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/monorepo-and-workspace-management-nx-angular-cli-workspaces.md"
---

# Monorepo and Workspace Management (Nx, Angular CLI Workspaces)

## Learning Objectives
- Structure large Angular portfolios inside Nx or CLI native workspaces.
- Apply project graph rules, tagging, and linting to constrain unintended dependencies.
- Optimize builds via computation caching, affected commands, and distributed task execution.

## Workspace Taxonomy
- **Apps**: deployable artifacts (web, SSR, functions).
- **Libraries**: shareable Angular, utility, or domain packages.
- **Tools**: generators, executors, schematics.

## Nx Highlights
```bash
npx create-nx-workspace@latest ng-knowledge --preset=angular-monorepo
```
- Tags enforce boundaries: `tags: ['scope:app-shell', 'type:feature']`.
- `nx graph` visualizes dependencies.
- `nx run-many --target=test --all` or `nx affected --target=build` for incremental work.

### Project Configuration
```json
{
  "name": "content-viewer",
  "sourceRoot": "libs/content-viewer/src",
  "targets": {
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/libs/content-viewer"]
    }
  },
  "tags": ["scope:shared", "type:ui"]
}
```

## Governance Patterns
- Codify module boundaries via `enforceModuleBoundaries` lint rule.
- Require RFC + architecture review to create new apps/libraries.
- Use generators to scaffold features with company defaults.

## Build Optimization
- Enable Nx Cloud / remote caching for CI parallelism.
- Split lint/test/build targets; run `nx format:check` to guard style.
- For CLI-only shops, leverage `ng update` + `workspace.json` to segment libs, but adopt Nx when scale demands.

## Testing & Release Strategy
- Tag libs by domain (e.g., `scope:nav`). Use tags in CI to gate merges when dependent apps fail.
- Version internal packages via npm workspaces or `nx release`.

## Checklist
- [ ] Document tagging scheme and dependency graph exceptions.
- [ ] Create `tools/generators` for new libraries to enforce conventions.
- [ ] Configure remote caching secrets/permissions early.
- [ ] Mirror workspace tree in `/specs` for context.
- [ ] Automate dependency graph checks in pull requests (e.g., `nx graph --watch`).

## Next Steps
- Pair with [[microfrontend-architecture-and-module-federation]] for cross-repo interoperability.
- Feed build metadata into [[integration-testing-and-continuous-integration-pipelines]].
- Enforce standards with [[code-quality-automation-and-linting-enforcement]].
