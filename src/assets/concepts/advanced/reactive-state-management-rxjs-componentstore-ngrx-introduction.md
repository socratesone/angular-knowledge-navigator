---
title: "Reactive State Management (RxJS, ComponentStore, NgRx Introduction)"
slug: "reactive-state-management-rxjs-componentstore-ngrx-introduction"
category: "Advanced"
skillLevel: "advanced"
difficulty: 4
estimatedReadingTime: 45
constitutional: true
tags: ["state-management", "rxjs", "componentstore", "ngrx", "signals"]
prerequisites: ["introduction-to-observables-and-rxjs", "angular-signals", "component-communication-input-output-viewchild-service-based"]
relatedTopics: ["advanced-ngrx-selectors-effects-entity-management", "smart-vs-presentational-components-pattern", "optimizing-change-detection-and-performance"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/reactive-state-management-rxjs-componentstore-ngrx-introduction.md"
---

# Reactive State Management (RxJS, ComponentStore, NgRx Introduction)

## Learning Objectives
- Compare signal-based state, RxJS stores, and NgRx to choose the right abstraction per feature.
- Model feature state with ComponentStore and graduate to NgRx when orchestration or tooling demands it.
- Apply immutable update patterns, memoized selectors, and effect isolation to keep UIs deterministic.

## Layered State Architecture
| Layer | Scope | Tooling |
| --- | --- | --- |
| View | Component state, ephemeral | Angular signals, `@Input` setters |
| Feature | Bounded context | ComponentStore, lightweight services |
| Application | Cross-cutting concerns | NgRx Store + Effects + Entity |

## ComponentStore Primer
```typescript
@Injectable()
export class ProjectsStore extends ComponentStore<ProjectState> {
  readonly projects$ = this.select(s => s.entities);
  readonly vm$ = this.select(
    this.projects$,
    this.select(s => s.loading),
    (projects, loading) => ({ projects, loading })
  );

  readonly loadProjects = this.effect((trigger$: Observable<void>) =>
    trigger$.pipe(
      tap(() => this.patchState({ loading: true })),
      switchMap(() => this.api.fetchProjects().pipe(
        tapResponse(
          projects => this.patchState({ loading: false, entities: projects }),
          error => this.patchState({ loading: false, error })
        )
      ))
    )
  );
}
```

### Signals Interop
```typescript
@Component({
  selector: 'app-project-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProjectsStore]
})
export class ProjectDashboardComponent {
  readonly vm = toSignal(this.store.vm$);
  constructor(private store: ProjectsStore) {
    this.store.loadProjects();
  }
}
```

## NgRx Store Introduction
- **Actions** describe events (`[Projects/API] Load Success`).
- **Reducers** produce new immutable state.
- **Selectors** expose derived data with memoization.
- **Effects** isolate async side effects and dispatch follow-up actions.

### Minimal Feature Module
```typescript
export interface ProjectsState extends EntityState<Project> {
  loading: boolean;
}

export const reducer = createReducer(
  adapter.getInitialState({ loading: false }),
  on(ProjectsActions.load, state => ({ ...state, loading: true })),
  on(ProjectsActions.loadSuccess, (state, { projects }) =>
    adapter.setAll(projects, { ...state, loading: false })
  )
);
```

### Selectors
```typescript
export const selectProjectsState = createFeatureSelector<ProjectsState>('projects');
export const selectAllProjects = createSelector(selectProjectsState, adapter.getSelectors().selectAll);
export const selectPinnedProjects = createSelector(
  selectAllProjects,
  projects => projects.filter(project => project.isPinned)
);
```

### Effects
```typescript
@Injectable()
export class ProjectsEffects {
  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProjectsActions.load),
      switchMap(() => this.api.fetchProjects().pipe(
        map(projects => ProjectsActions.loadSuccess({ projects })),
        catchError(error => of(ProjectsActions.loadFailure({ error })))
      ))
    )
  );

  constructor(private actions$: Actions, private api: ProjectsApi) {}
}
```

## Choosing the Right Tool
- **Signals only**: local counters, ephemeral UI toggles.
- **ComponentStore**: data grids, dashboards, wizard flows.
- **NgRx**: multi-team domains, caching, offline or replay requirements.

## Performance & Testing
- Leverage `provideState` / `provideEffects` for standalone bootstrap.
- Use `provideMockStore` in Jest tests with selector overrides.
- Profile selectors with `ngrx/store-devtools` and memoization stats.
- Keep action payloads serializable for Redux DevTools replay.

## Implementation Checklist
- [ ] Define success metrics (latency, cache hit rate) before picking a state library.
- [ ] Model state normalization using `EntityAdapter` where lists exceed ~50 records.
- [ ] Use `ComponentStore.setState` sparingly; favor `patchState` for targeted updates.
- [ ] Document state contracts in `specs/` to align with constitutional governance.
- [ ] Add smoke tests that dispatch key actions and assert reducer snapshots.

## Next Steps
- Dive into [[advanced-ngrx-selectors-effects-entity-management]].
- Pair this article with [[smart-vs-presentational-components-pattern]] to keep containers lean.
- Automate store-focused tests via [[unit-testing-with-jest-and-angular-testing-library]].
