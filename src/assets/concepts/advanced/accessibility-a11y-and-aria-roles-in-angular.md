---
title: "Accessibility (a11y) and ARIA Roles in Angular"
slug: "accessibility-a11y-and-aria-roles-in-angular"
category: "Advanced"
skillLevel: "advanced"
difficulty: 3
estimatedReadingTime: 30
constitutional: true
tags: ["accessibility", "aria", "a11y", "testing", "design-system"]
prerequisites: ["components-and-templates", "content-projection-and-ng-content", "angular-material-and-ui-components"]
relatedTopics: ["reusable-component-libraries-and-shared-modules", "design-systems-and-theming-architecture", "end-to-end-testing-with-cypress-or-playwright"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/accessibility-a11y-and-aria-roles-in-angular.md"
---

# Accessibility (a11y) and ARIA Roles in Angular

## Learning Objectives
- Apply semantic HTML + ARIA roles to complex components (menus, dialogs, tree views).
- Automate accessibility checks using ESLint, Axe, and Playwright.
- Bake accessible defaults into shared libraries and design tokens.

## Core Principles
1. **Semantics First**: start with the correct HTML element before augmenting roles.
2. **Keyboard Support**: `Tab`, `Enter`, `Space`, arrow navigation.
3. **Focus Management**: restore focus when overlays/dialogs close.
4. **Assistive Feedback**: use `aria-live` for dynamic updates.

## Example: Accessible Command Palette
```html
<div role="dialog" aria-modal="true" aria-label="Command Palette">
  <input type="search" aria-label="Filter commands" [(ngModel)]="query" />
  <ul role="listbox">
    <li *ngFor="let cmd of filtered" role="option" [attr.aria-selected]="cmd === selected">
      {{ cmd.label }}
    </li>
  </ul>
</div>
```

### Focus Trap with CDK
```typescript
@Component({
  selector: 'app-accessible-dialog',
  standalone: true,
  templateUrl: './dialog.html',
  providers: [FocusTrapFactory]
})
export class AccessibleDialogComponent implements OnInit, OnDestroy {
  private focusTrap?: FocusTrap;
  constructor(private host: ElementRef, private trapFactory: FocusTrapFactory) {}
  ngOnInit() { this.focusTrap = this.trapFactory.create(this.host.nativeElement); }
  ngOnDestroy() { this.focusTrap?.destroy(); }
}
```

## Live Regions
```html
<div aria-live="polite" data-testid="toast-region">
  <app-toast *ngFor="let toast of toasts"></app-toast>
</div>
```

## Testing Accessibility
- ESLint plugin `jsx-a11y` analogs exist for Angular templates via `@angular-eslint/template/accessibility-*` rules.
- Run Axe in Cypress: `cy.injectAxe(); cy.checkA11y();`.
- Use Playwright’s `page.accessibility.snapshot()` to audit roles.

## Checklist
- [ ] Provide skip links for keyboard users (`<a href="#main" class="sr-only-focusable">Skip to content</a>`).
- [ ] Ensure color contrast meets WCAG 2.1 AA (use tokens for text/background pairs).
- [ ] Label interactive controls with `aria-label` or `<label for>`.
- [ ] Document keyboard maps for custom widgets.
- [ ] Include accessibility acceptance criteria in every feature spec.

## Next Steps
- Align with [[design-systems-and-theming-architecture]] for color/token governance.
- Validate via [[end-to-end-testing-with-cypress-or-playwright]] using Axe.
- Monitor regressions with [[code-quality-automation-and-linting-enforcement]].
