---
title: "Routing Parameters and Child Routes"
slug: "routing-parameters-and-child-routes"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "routing"]
prerequisites: ["routing-and-navigation-basics", "components-and-templates"]
relatedTopics: ["advanced-routing-guards-resolvers-preloading-strategies", "lazy-loading-feature-modules"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/routing-parameters-and-child-routes.md"
---

# Routing Parameters and Child Routes

## Learning Objectives
- Read and react to route params, query params, and fragments.
- Build nested route trees with child outlets.
- Share data between parent and child routes safely.
- Avoid common routing pitfalls like duplicated navigation or stale params.

## Overview
As apps grow, routes become nested and parameterized. Mastering child routes and param handling keeps features modular and makes navigation predictable.

## Reading Route Parameters
```typescript
export class ArticleComponent {
  private route = inject(ActivatedRoute);

  readonly articleId$ = this.route.paramMap.pipe(
    map(params => params.get('id')),
    filter(Boolean)
  );
}
```

## Child Routes
```typescript
export const routes: Routes = [
  {
    path: 'topics/:topicId',
    component: TopicShellComponent,
    children: [
      { path: '', loadComponent: () => import('./overview.component').then(c => c.OverviewComponent) },
      { path: 'examples', loadComponent: () => import('./examples.component').then(c => c.ExamplesComponent) }
    ]
  }
];
```

## Best Practices
- Use `route.data` for static metadata like breadcrumbs.
- Prefer `combineLatest` for syncing params + query params.
- Use `runGuardsAndResolvers: 'paramsChange'` when necessary.

## Practice & Apply
- Build a nested route with an overview + details tab.
- Add query params for filtering and keep them in sync with UI state.
- Write a test that asserts navigation when param changes.

## Assessment Questions
1. What is the difference between `paramMap` and `queryParamMap`?
2. When do child routes simplify feature boundaries?
3. How can you keep route parameters reactive without manual subscriptions?
4. Why might you set `runGuardsAndResolvers` on a route?

## Next Steps
[[advanced-routing-guards-resolvers-preloading-strategies]], [[lazy-loading-feature-modules]], [[routing-and-navigation-basics]]
