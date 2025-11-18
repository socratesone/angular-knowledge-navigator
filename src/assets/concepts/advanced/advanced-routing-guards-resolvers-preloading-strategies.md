---
title: "Advanced Routing (Guards, Resolvers, Preloading Strategies)"
slug: "advanced-routing-guards-resolvers-preloading-strategies"
category: "Advanced"
skillLevel: "advanced"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["routing", "guards", "resolvers", "preloading", "performance"]
prerequisites: ["routing-and-navigation-basics", "lazy-loading-feature-modules", "http-client-and-interceptors"]
relatedTopics: ["dynamic-form-generation-and-configuration-driven-uis", "security-best-practices-xss-sanitization-csp", "optimizing-change-detection-and-performance"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/advanced-routing-guards-resolvers-preloading-strategies.md"
---

# Advanced Routing (Guards, Resolvers, Preloading Strategies)

## Learning Objectives
- Secure feature routes with layered guards (auth, permissions, dirty-checking).
- Hydrate components with resolver-delivered data before activation.
- Optimize perceived performance with custom preloading strategies.

## Guard Composition
```typescript
export const routes: Routes = [
  {
    path: 'projects/:id',
    canActivate: [authGuard, permissionsGuard],
    canDeactivate: [dirtyCheckGuard],
    resolve: {
      project: projectResolver
    },
    providers: [projectResolver]
  }
];
```

### Standalone Functional Guards
```typescript
export const permissionsGuard: CanActivateFn = (route) => {
  const access = inject(AccessControlService);
  const projectId = route.paramMap.get('id');
  return access.canEditProject(projectId!);
};
```

### Dirty Check Guard
```typescript
export const dirtyCheckGuard: CanDeactivateFn<DirtyComponent> = (cmp) =>
  cmp.hasUnsavedChanges() ? confirm('Discard changes?') : true;
```

## Resolvers for Predictable UX
```typescript
@Injectable({ providedIn: 'root' })
export class ProjectResolver implements Resolve<Project> {
  constructor(private api: ProjectsApi) {}
  resolve(route: ActivatedRouteSnapshot) {
    return this.api.get(route.paramMap.get('id')!).pipe(
      catchError(() => of(null))
    );
  }
}
```

- Prefer resolvers when data must exist before rendering (detail pages).
- For streaming dashboards, resolve critical metadata and let the rest load lazily.

## Preloading Strategies
```typescript
@Injectable({ providedIn: 'root' })
export class PriorityPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    const priority = route.data?.['preloadPriority'] ?? 0;
    return priority > 0 ? load().pipe(delay(priority * 100)) : of(null);
  }
}
```

Register with `provideRouter(routes, withPreloading(PriorityPreloadingStrategy))`.

### Heuristics
- Preload frequently visited modules (dashboards, settings) after initial idle period.
- Skip admin modules for anonymous users by inspecting auth state inside the strategy.

## Router Performance Tips
- Use standalone lazy routes (`loadComponent`, `loadChildren`) to keep bundles focused.
- Combine guards/resolvers into provider arrays for per-route injection.
- Audit router events with `Router.events` + `filter` for navigation latency tracing.

## Testing Strategy
- Use `RouterTestingModule` or `provideRouter` with in-memory routes for guard/resolver tests.
- Mock resolvers returning `of(mockData)` to keep unit tests synchronous.
- Add Cypress e2e assertions for preloading-critical flows (ensure modules load before user interaction).

## Checklist
- [ ] Document guard chains per route and who owns each policy.
- [ ] Fail closed: default to `false` when auth/permission service errors.
- [ ] Surface resolver failures in UX (toast, dedicated error view).
- [ ] Prefer `inject()` inside guards/resolvers to minimize constructors.
- [ ] Monitor navigation timings using Performance API + custom events.

## Next Steps
- Build on [[lazy-loading-feature-modules]] fundamentals.
- Pair with [[security-best-practices-xss-sanitization-csp]] for defense-in-depth.
- Integrate with [[microfrontend-architecture-and-module-federation]] when routing across remotes.
