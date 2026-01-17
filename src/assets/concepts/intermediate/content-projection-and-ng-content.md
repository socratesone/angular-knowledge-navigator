---
title: "Content Projection and ng-content"
slug: "content-projection-and-ng-content"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "content-projection"]
prerequisites: ["components-and-templates", "interpolation-and-property-binding"]
relatedTopics: ["reusable-component-libraries-and-shared-modules", "template-reference-variables"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/content-projection-and-ng-content.md"
---

# Content Projection and ng-content

## Learning Objectives
- Use `<ng-content>` to project content into reusable components.
- Define multiple projection slots with selectors.
- Combine projection with `@ContentChild` queries safely.
- Avoid overusing projection when inputs are clearer.

## Overview
Content projection lets a component accept and render arbitrary markup provided by its parent. It’s essential for building reusable layout components and design-system primitives.

## Basic Projection
```typescript
@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <section class="card">
      <ng-content></ng-content>
    </section>
  `
})
export class CardComponent {}
```

## Multiple Slots
```html
<app-panel>
  <h2 slot="title">State Management</h2>
  <p>Signals, RxJS, and NgRx patterns.</p>
</app-panel>
```

```typescript
@Component({
  selector: 'app-panel',
  standalone: true,
  template: `
    <header><ng-content select="[slot=title]"></ng-content></header>
    <main><ng-content></ng-content></main>
  `
})
export class PanelComponent {}
```

## Content Queries
- `@ContentChild` accesses projected content once it exists.
- Use `ngAfterContentInit` to safely interact with projected elements.

## Practice & Apply
- Build a `Card` component with header/body/footer slots.
- Add `@ContentChild` to detect whether a header is present.
- Replace a complex `*ngIf` block with projection to simplify layout logic.

## Assessment Questions
1. When should you use projection instead of inputs?
2. Why must you wait for `ngAfterContentInit`?
3. How do multiple projection slots work?
4. What are the risks of deeply nested projected content?

## Next Steps
[[reusable-component-libraries-and-shared-modules]], [[custom-directives-and-pipes]], [[template-reference-variables]]
