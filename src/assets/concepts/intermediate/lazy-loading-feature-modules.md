---
title: "Lazy Loading Feature Modules"
slug: "lazy-loading-feature-modules"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "lazy-loading"]
prerequisites: ["routing-and-navigation-basics", "angular-architecture-overview-modules-components-templates"]
relatedTopics: ["advanced-routing-guards-resolvers-preloading-strategies", "performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/lazy-loading-feature-modules.md"
---

# Lazy Loading Feature Modules

## Learning Objectives
- Configure lazy-loaded routes with standalone components or feature modules.
- Understand how lazy loading affects bundle sizes and navigation timing.
- Apply preloading strategies for improved UX.
- Avoid common lazy-loading pitfalls (circular deps, route duplication).

## Overview
Lazy loading splits your application into smaller chunks that are loaded on demand. It improves initial load time and keeps critical paths fast.

## Route Configuration
```typescript
export const appRoutes: Routes = [
  {
    path: 'reports',
    loadChildren: () =>
      import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES)
  },
  { path: '', redirectTo: 'home', pathMatch: 'full' }
];
```

## Preloading Strategies
- **No Preloading**: default behavior, smallest initial bundle.
- **PreloadAllModules**: loads all lazy routes after initial load.
- **Custom Strategy**: preload based on network state or feature flags.

## Performance Tips
- Keep shared code in a `shared/` or `core/` area to avoid duplication.
- Use `Route.data` to annotate whether a route should be preloaded.
- Avoid creating large barrels that pull in eager dependencies.

## Practice & Apply
- Split a feature into a lazy route and compare bundle sizes.
- Add a custom preloading strategy that only preloads on Wi-Fi.
- Validate a route guard still runs after lazy loading.

## Assessment Questions
1. Why does lazy loading improve startup performance?
2. How does preloading differ from eager loading?
3. What causes duplicated code in lazy chunks?
4. When is `loadComponent` preferable to `loadChildren`?

## Next Steps
[[routing-parameters-and-child-routes]], [[advanced-routing-guards-resolvers-preloading-strategies]], [[performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction]]
