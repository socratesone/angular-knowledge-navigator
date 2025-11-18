---
title: "Design Systems and Theming Architecture"
slug: "design-systems-and-theming-architecture"
category: "Expert"
skillLevel: "expert"
difficulty: 3
estimatedReadingTime: 35
constitutional: true
tags: ["design-system", "theming", "tokens", "css"]
prerequisites: ["reusable-component-libraries-and-shared-modules", "angular-material-and-ui-components", "accessibility-a11y-and-aria-roles-in-angular"]
relatedTopics: ["code-quality-automation-and-linting-enforcement", "progressive-web-apps-pwas-in-angular", "monorepo-and-workspace-management-nx-angular-cli-workspaces"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/design-systems-and-theming-architecture.md"
---

# Design Systems and Theming Architecture

## Learning Objectives
- Create scalable theming infrastructure using design tokens, CSS variables, and Angular CDK theming utilities.
- Deliver light/dark/system themes, high-contrast variants, and tenant branding without branching codebases.
- Align dev + design teams through versioned token packages and Storybook.

## Token Strategy
- Source of truth: JSON/TS token files (color, spacing, typography).
- Export as CSS variables + Sass maps.

```scss
:root {
  --color-surface: #ffffff;
  --color-surface-inverse: #111827;
}
[data-theme='dark'] {
  --color-surface: #0f172a;
  --color-surface-inverse: #f8fafc;
}
```

Expose tokens via TypeScript for runtime usage:
```typescript
export const ThemeTokens = {
  spacing: {
    xs: '0.25rem',
    md: '1rem'
  }
} as const;
```

## Angular Material + CDK
- Use Material 17 design tokens or `ExperimentalMaterialTheme` APIs.
- Create `provideTheming()` function to set theme inputs for shared components.

## Runtime Theme Switching
```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private preference = signal<'light' | 'dark' | 'system'>('system');
  apply(theme: Theme) {
    document.documentElement.dataset['theme'] = theme;
  }
}
```

Add persistence via `localStorage` or server profile service.

## Governance
- Track token owners; require design review for token changes.
- Pair token releases with documentation updates (Storybook MDX, Figma libraries).
- Provide migration utilities when tokens rename or restructure.

## Checklist
- [ ] Document theme anatomy (foundations, components, patterns).
- [ ] Provide contribution guide for new components abiding by tokens.
- [ ] Audit color contrast per theme.
- [ ] Bundle CSS variables in `src/assets/styles/theme.scss` and import globally.
- [ ] Offer fallbacks for SSR/offline detection of system theme.

## Next Steps
- Publish tokens via [[reusable-component-libraries-and-shared-modules]].
- Enforce consistency through [[code-quality-automation-and-linting-enforcement]].
- Align with [[monorepo-and-workspace-management-nx-angular-cli-workspaces]] for distribution.
