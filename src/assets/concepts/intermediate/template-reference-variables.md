---
title: "Template Reference Variables"
slug: "template-reference-variables"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "template"]
prerequisites: ["components-and-templates", "directives-ngif-ngfor-ngswitch"]
relatedTopics: ["content-projection-and-ng-content", "custom-directives-and-pipes"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/template-reference-variables.md"
---

# Template Reference Variables

## Learning Objectives
- Use template reference variables to access DOM elements and directives.
- Pass references into methods safely without direct DOM access.
- Combine `#ref` with `@ViewChild` for component interaction.
- Avoid overusing template references when data binding suffices.

## Overview
Template reference variables (`#ref`) give you a local handle to elements, components, or directives within a template. They’re helpful for focus management, form access, and integration with directives.

## Core Patterns
```html
<input #searchInput type="text" (keyup.enter)="search(searchInput.value)">
<button (click)="searchInput.focus()">Focus</button>

<app-modal #modal></app-modal>
<button (click)="modal.open()">Open</button>
```

```typescript
@Component({ /* ... */ })
export class SearchComponent {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  focusInput(): void {
    this.searchInput?.nativeElement.focus();
  }
}
```

## Best Practices
- Prefer binding for data flow; use `#ref` for imperative actions.
- Avoid storing `ElementRef` unless you need direct DOM access.
- Use `@ViewChild` with `{ static: false }` for elements created after view init.

## Practice & Apply
- Add a `#ref` to a form and trigger validation on submit.
- Build a modal component that exposes `open()` via a template reference.
- Replace a `document.querySelector` with a template reference.

## Assessment Questions
1. When is a template reference variable preferable to `@Input`?
2. Why should you avoid frequent direct DOM access?
3. How does `@ViewChild` differ from `#ref`?
4. What risks come with manipulating native elements?

## Next Steps
[[content-projection-and-ng-content]], [[custom-directives-and-pipes]], [[angular-material-and-ui-components]]
