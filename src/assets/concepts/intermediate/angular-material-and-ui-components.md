---
title: "Angular Material and UI Components"
slug: "angular-material-and-ui-components"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "angular-material"]
prerequisites: ["components-and-templates", "directives-ngif-ngfor-ngswitch"]
relatedTopics: ["design-systems-and-theming-architecture", "accessibility-a11y-and-aria-roles-in-angular"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/angular-material-and-ui-components.md"
---

# Angular Material and UI Components

## Learning Objectives
- Use Angular Material components with standalone imports.
- Apply theming and typography consistently.
- Follow accessibility best practices for dialogs, menus, and forms.
- Evaluate when to wrap Material components into design-system primitives.

## Overview
Angular Material provides accessible, production-ready components aligned with the Material Design system. Use it to build consistent, tested UI patterns quickly.

## Getting Started
```typescript
@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar>
      <span>Knowledge Navigator</span>
      <span class="spacer"></span>
      <button mat-icon-button aria-label="Open settings">
        <mat-icon>settings</mat-icon>
      </button>
    </mat-toolbar>
  `
})
export class ToolbarComponent {}
```

## Theming Essentials
- Define a single theme in `styles.scss` and expose CSS variables for custom branding.
- Use `mat-typography-config` to keep text styles consistent.
- Prefer Angular Material density settings over custom spacing overrides.

## Accessibility Notes
- Always provide `aria-label` for icon-only buttons.
- Use `MatDialog`’s `ariaDescribedBy` for screen reader clarity.
- Ensure focus traps and keyboard shortcuts are preserved.

## Practice & Apply
- Build a settings dialog with `MatDialog` and restore focus on close.
- Create a reusable `AppButton` wrapper that sets default color and size.
- Audit a form for label/placeholder compliance with Material guidelines.

## Assessment Questions
1. Why should icon buttons always have `aria-label`?
2. When is it better to wrap Material components in your own UI primitives?
3. How do theme tokens help with long-term maintainability?
4. What is the tradeoff between custom CSS and Material’s density system?

## Next Steps
[[design-systems-and-theming-architecture]], [[reusable-component-libraries-and-shared-modules]], [[accessibility-a11y-and-aria-roles-in-angular]]
