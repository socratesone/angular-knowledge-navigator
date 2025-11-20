---
title: "Reusable Component Libraries and Shared Modules"
slug: "reusable-component-libraries-and-shared-modules"
category: "Advanced"
skillLevel: "advanced"
difficulty: 3
estimatedReadingTime: 35
constitutional: true
tags: ["libraries", "shared-modules", "design-systems", "standalone"]
prerequisites: ["components-and-templates", "standalone-components-and-feature-modules-integration", "smart-vs-presentational-components-pattern"]
relatedTopics: ["design-systems-and-theming-architecture", "code-quality-automation-and-linting-enforcement", "unit-testing-with-jest-and-angular-testing-library"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/reusable-component-libraries-and-shared-modules.md"
---

# Reusable Component Libraries and Shared Modules

## Learning Objectives
- Package UI primitives for reuse across apps and microfrontends.
- Decide when to export standalone components directly vs. bundle them in `SharedModule`s.
- Automate docs, testing, and versioning to keep the system trustworthy.

## Architectural Approaches
1. **Standalone-only**: Export components individually with `provide*` helpers.
2. **Hybrid Shared Module**: Wrap related parts (pipes, directives) for compatibility with legacy NgModules.
3. **Design System Package**: Publish via npm/Nx with typed tokens and theming utilities.

## Library Blueprint
```bash
nx g @nrwl/angular:library ui-buttons --directory=shared --standalone
```

```typescript
@Component({
  selector: 'ui-button',
  standalone: true,
  template: `<button [ngClass]="variant" ...><ng-content /></button>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UIButtonComponent {
  @Input() variant: 'primary' | 'ghost' | 'danger' = 'primary';
}
```

### Aggregating for Convenience
```typescript
export const UI_PRIMITIVES = [
  UIButtonComponent,
  UICardComponent,
  UITagComponent
];

export const provideUiPrimitives = () => UI_PRIMITIVES;
```

## Governance & Versioning
- Document component contracts in `/specs/002-content-display-improvements/plan.md`.
- Use semantic release or Nx affected pipelines for automated publishing.
- Provide changelog + migration notes (schematics or codemods) for breaking changes.

## Testing & Quality
- Snapshot presentational components with Jest.
- Build Storybook stories for visual regression testing.
- Add accessibility tests with Axe and semantic HTML linting.

## Distribution Tips
- Export Sass mixins + CSS variables from `assets/styles` for theme authors.
- Keep dependencies minimal; treat Material/CDK as peer dependencies if consumers should control versions.

## Checklist
- [ ] Every component ships with README, usage snippet, and accessibility notes.
- [ ] Provide tokens (`UI_BUTTON_DEFAULTS`) for customizing defaults without forking components.
- [ ] Use `Standalone` + `provide*` helpers for Angular 17+ consumers.
- [ ] Track adoption per team to inform deprecation.
- [ ] Add schematic to scaffold recommended usage (optional).

## Next Steps
- Layer this with [[design-systems-and-theming-architecture]].
- Enforce guidelines via [[code-quality-automation-and-linting-enforcement]].
- Validate adoption through [[integration-testing-and-continuous-integration-pipelines]].
