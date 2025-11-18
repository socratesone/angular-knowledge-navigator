---
title: "Asynchronous Data Streams and AsyncPipe"
slug: "asynchronous-data-streams-and-asyncpipe"
category: "Advanced"
skillLevel: "advanced"
difficulty: 3
estimatedReadingTime: 30
constitutional: true
tags: ["rxjs", "asyncpipe", "performance", "signals"]
prerequisites: ["introduction-to-observables-and-rxjs", "component-communication-input-output-viewchild-service-based", "angular-signals"]
relatedTopics: ["using-rxjs-operators-map-filter-switchmap-etc", "reactive-state-management-rxjs-componentstore-ngrx-introduction", "optimizing-change-detection-and-performance"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/asynchronous-data-streams-and-asyncpipe.md"
---

# Asynchronous Data Streams and AsyncPipe

## Learning Objectives
- Stream data declaratively with RxJS and bind it safely using `AsyncPipe` and signals.
- Compare push-based rendering strategies: `async` pipe, `toSignal`, manual subscription.
- Apply backpressure, cancellation, and error-handling patterns in templates.

## AsyncPipe Essentials
```html
<section *ngIf="projects$ | async as projects; else loading">
  <app-project-card *ngFor="let project of projects" [project]="project" />
</section>
<ng-template #loading>
  <app-skeleton-card></app-skeleton-card>
</ng-template>
```

### Benefits
- Auto-subscribes/unsubscribes on destroy.
- Triggers change detection only when stream emits.
- Works seamlessly with `OnPush`.

## Creating Efficient Streams
```typescript
readonly projects$ = this.projectsService.projects$.pipe(
  startWith([]),
  shareReplay({ bufferSize: 1, refCount: true }),
  catchError(() => of([]))
);
```

### Handling Multiple Streams
```html
<app-dashboard *ngIf="{ projects: projects$ | async, stats: stats$ | async } as vm">
  <app-project-list [projects]="vm.projects"></app-project-list>
  <app-stats [data]="vm.stats"></app-stats>
</app-dashboard>
```

### AsyncPipe vs Signals
| Scenario | AsyncPipe | Signals |
| --- | --- | --- |
| Template-only streams | ✅ | ✅ |
| Complex derivations | use RxJS | use `computed` |
| Zone-less bootstrap | prefer signals | works |
| Interop with existing stores | ✅ | convert via `toSignal()` |

```typescript
readonly projects = toSignal(this.projects$);
```

## Error & Empty States
```html
<ng-container *ngIf="vm$ | async as vm">
  <app-error *ngIf="vm.error" [details]="vm.error"></app-error>
  <app-empty-state *ngIf="!vm.error && vm.items.length === 0"></app-empty-state>
</ng-container>
```

## Performance Tips
- Compose observables with `shareReplay` to avoid duplicate HTTP calls.
- Use `takeUntilDestroyed()` in services for side-car subscriptions.
- For high-frequency streams, coalesce updates with `auditTime(16)` or signals’ `effect` scheduler.

## Testing Streams
- Use marble tests for observables.
- In component tests, push values via `BehaviorSubject` and assert DOM updates after `fixture.detectChanges()`.

## Checklist
- [ ] Keep template expressions simple; precompute view models in the component class.
- [ ] Provide skeleton + error placeholders via `<ng-template>` references.
- [ ] Avoid `async` pipe nested inside `ngFor` if value is reused—extract to `ng-container`.
- [ ] Prefer `Observables` for data, `Signals` for derived UI state.
- [ ] Document fallback strategies for offline/failed streams.

## Next Steps
- Combine with [[reactive-state-management-rxjs-componentstore-ngrx-introduction]] for deterministic data flows.
- Study [[optimizing-change-detection-and-performance]] to measure re-render frequency.
- Build skeleton loaders in [[reusable-component-libraries-and-shared-modules]].
