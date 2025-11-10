<!--
Sync Impact Report:
- Version change: Template → 1.0.0 (Initial Angular Constitution)
- Modified principles: Template placeholders → 10 Angular-specific principles
- Added sections: Architectural Principles, Component Constitution, State Management, Dependency Injection, Routing, Styling, Testing, Performance, AI Integration
- Removed sections: Generic template sections
- Templates requiring updates: ✅ Constitution updated
- Follow-up TODOs: None
-->

# Angular Spec-Driven Development Constitution

## Philosophy

We build Angular applications as **specifications of intent**, not hand-coded implementations.
Each module, service, and component exists to fulfill a declared contract.
AI agents may generate code, but human developers remain responsible for verifying compliance with this constitution.

Primary Values:
- **Declarative over imperative**
- **Predictable over clever**
- **Composable over inherited**
- **Typed over inferred**
- **Minimal over generic**

## Core Principles

### I. Feature Modularity
The `src/app` directory is divided by **domain feature**, not artifact type.
Each feature folder includes `index.ts`, `routes.ts`, and optionally `store.ts`.
Shared and Core modules exist at the root and are never circularly referenced.

**Rationale**: Domain-driven structure promotes maintainability and team scalability by keeping related functionality together.

### II. Standalone Components (NON-NEGOTIABLE)
All components are **standalone** (`standalone: true`) unless a legacy module is unavoidable.
Each component imports its direct dependencies explicitly.

**Rationale**: Standalone components reduce bundle size, improve tree-shaking, and enable better dependency tracking.

### III. Separation of Responsibility
**Container (smart)** components handle state, routing, and data orchestration.
**Presentational (dumb)** components handle only view rendering and emit events upward.
All inputs and outputs must be typed explicitly.

**Rationale**: Clear separation enables better testing, reusability, and reasoning about data flow.

### IV. Reactive-First State Management
Prefer RxJS streams and signals over imperative state.
State flows top-down; events propagate bottom-up.
Use `ComponentStore` for feature-scoped state; `NgRx` only for cross-domain global state.

**Rationale**: Reactive patterns reduce bugs from shared mutable state and improve predictability.

### V. Dependency Injection Hierarchy
Services provided globally (`providedIn: 'root'`) must be stateless.
Stateful services are provided in the feature scope.
Features depend only on Shared/Core, never sideways imports.

**Rationale**: Proper DI scope prevents memory leaks and maintains clear architectural boundaries.

### VI. Lazy Loading Mandate
Every feature module is lazy-loaded via routing.
Each feature declares its own `routes.ts` file, exporting `Routes`.

**Rationale**: Lazy loading improves initial load performance and enables code splitting.

### VII. Performance Discipline
Default to `ChangeDetectionStrategy.OnPush`.
Every `*ngFor` uses a `trackBy` function.
Avoid nested `async` pipes or redundant change detection triggers.

**Rationale**: Explicit performance patterns prevent common Angular performance pitfalls.

### VIII. Testing Mandate
Use **Jest** for unit tests and **Cypress** or **Playwright** for E2E.
Unit tests cover logic, not framework internals.
Integration tests verify component interaction through inputs/outputs only.

**Rationale**: Focused testing strategy ensures reliable code without over-testing framework behavior.

### IX. Style Isolation
Each component uses SCSS with encapsulated styles (`ViewEncapsulation.Emulated`).
No global selectors except for resets and base typography.
All design tokens derive from Angular Material or TailwindCSS system.

**Rationale**: Style isolation prevents CSS conflicts and maintains design system consistency.

### X. Spec-First Development
All new features begin with a `.spec.md` file describing purpose, inputs/outputs, data flow, dependencies, and acceptance criteria.
AI may generate code **only** from approved specs.
Generated code must pass ESLint, Prettier, and type checks before human review.

**Rationale**: Specification-driven development ensures alignment between intent and implementation.

## Architectural Constraints

**Core Module**: Contains global singletons (configuration, interceptors, root services). Imported once in `AppModule` and never elsewhere.

**Shared Module**: Contains pure UI artifacts (components, pipes, directives) with no business logic. Imports only Angular core libraries and other Shared utilities.

**Template Discipline**: Templates contain no business logic, loops, or branching beyond `ngIf` and `ngFor`. Computations belong in pipes or component classes.

## Development Workflow

**Route Resolvers**: Use route resolvers to pre-fetch data, not `ngOnInit`. Guards handle authentication and permission enforcement.

**Side Effects**: All side effects (HTTP, storage, logging) occur within services, never components. Effects must be **idempotent** and **purely reactive**.

**Signal Integration**: Signals are the preferred reactivity primitive for local state (Angular 17+). Observables remain for async data and cross-feature streams.

## Governance

This constitution supersedes all other development practices for this Angular project.
All PRs and code reviews must verify compliance with these principles.
Breaking changes to Core, Shared, or Routing architecture require constitution version increment.

Each feature folder includes a `README.md` summarizing purpose, API, and known issues.
Specs and generated code must be traceable through commit metadata.
Linting, type-checking, and build pipelines enforce constitution compliance.
Violations block CI until resolved.

**Summary Doctrine**: "Angular code is configuration. Logic is declared through specification. Humans define the system; AI maintains the implementation."

**Version**: 1.0.0 | **Ratified**: 2025-11-10 | **Last Amended**: 2025-11-10
