---
title: "Smart vs Presentational Components Pattern"
slug: "smart-vs-presentational-components-pattern"
category: "Advanced"
skillLevel: "advanced"
difficulty: 3
estimatedReadingTime: 35
constitutional: true
tags: ["architecture", "components", "patterns", "separation-of-concerns"]
prerequisites: ["components-and-templates", "component-communication-input-output-viewchild-service-based", "reactive-forms-and-formbuilder"]
relatedTopics: ["reactive-state-management-rxjs-componentstore-ngrx-introduction", "reusable-component-libraries-and-shared-modules", "optimizing-change-detection-and-performance"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/smart-vs-presentational-components-pattern.md"
---

# Smart vs Presentational Components Pattern

## Learning Objectives
- Segment responsibilities so container components coordinate data and presentational components focus on rendering.
- Apply the pattern with standalone components, signals, and strict typing.
- Build reusable UI kits that ignore infrastructure concerns while containers manage state, routing, and DI.

## Pattern Overview
| Smart (Container) | Presentational |
| --- | --- |
| Talks to services, router, state stores | Pure template + inputs/outputs |
| Handles orchestration and effects | No DI (except `@Inject`ed tokens for UI)
| Often OnPush + change detection boundary | Usually `ChangeDetectionStrategy.OnPush`
| Lives close to feature modules | Published in shared libraries |

## Example Architecture
```typescript
@Component({
  selector: 'app-projects-shell',
  standalone: true,
  imports: [ProjectsListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsShellComponent {
  private store = inject(ProjectsStore);
  readonly vm = toSignal(this.store.vm$);

  onRefresh() {
    this.store.loadProjects();
  }

  onSelect(projectId: string) {
    this.router.navigate(['/projects', projectId]);
  }
}
```

```typescript
@Component({
  selector: 'app-projects-list',
  standalone: true,
  templateUrl: './projects-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsListComponent {
  @Input({ required: true }) projects!: Project[];
  @Input() loading = false;
  @Output() refresh = new EventEmitter<void>();
  @Output() select = new EventEmitter<string>();
}
```

## Signals + Pattern
- Convert container observables to signals with `toSignal` and pass primitives into presentational children.
- Use `outputFromObservable` if needed to bridge events from child signals back into RxJS flows.

## Testing Benefits
- Presentational components are trivial to snapshot or test with Spectator because dependencies are mocked through inputs.
- Containers focus on verifying orchestrations (service calls, store dispatches) with Jest spies.

## Anti-Patterns to Avoid
- Presentational component injecting services for convenience (breaks reusability).
- Container exposing entire models when UI only needs a subset (hurts memoization & OnPush effectiveness).
- Deep smart component trees. Keep one container per logical screen or route.

## Checklist
- [ ] Document each feature’s container + view pairing in `specs/plan.md`.
- [ ] Keep container templates under ~40 lines; push markup to presentational components.
- [ ] Emit domain events (`ProjectSelected`) rather than UI events (`CardClicked`).
- [ ] Ensure presentational components accept signals or plain data but never subscribe to stores directly.
- [ ] Provide skeleton loaders and error states via inputs so containers control UX.

## Next Steps
- Combine with [[reactive-state-management-rxjs-componentstore-ngrx-introduction]] to orchestrate data.
- Harvest presentational components into [[reusable-component-libraries-and-shared-modules]].
- Profile renders after applying [[optimizing-change-detection-and-performance]].
