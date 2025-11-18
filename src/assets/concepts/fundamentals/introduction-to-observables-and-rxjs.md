---
title: "Introduction to Observables and RxJS"
slug: "introduction-to-observables-and-rxjs"
category: "Fundamentals"
skillLevel: "fundamentals"
difficulty: 3
estimatedReadingTime: 18
constitutional: false
tags: ["rxjs", "observables", "async"]
prerequisites: ["fundamentals/handling-user-input-and-validation"]
relatedTopics: ["fundamentals/routing-and-navigation-basics"]
lastUpdated: "2025-11-17"
contentPath: "/assets/concepts/fundamentals/introduction-to-observables-and-rxjs.md"
---

# Introduction to Observables and RxJS

Observables are Angular's lingua franca for anything asynchronous—HTTP requests, router events, WebSockets, gestures, and custom streams. RxJS extends the Observable contract with over 100 operators that let you transform, merge, and throttle events without manual state machines.

## Learning Objectives

- Understand how Observables differ from Promises
- Create Observables from DOM events, timers, and application state
- Compose operators to debounce input and cancel inflight HTTP calls
- Subscribe responsibly to avoid memory leaks

## Observable Lifecycle

1. **Creation** – `of`, `from`, `interval`, and `fromEvent` convert data sources into Observables.
2. **Transformation** – Operators like `map`, `filter`, `switchMap`, and `takeUntil` are chained via `.pipe()`.
3. **Subscription** – Consumers call `.subscribe()` to start the stream. Angular also subscribes for you in templates via the `async` pipe.
4. **Teardown** – Observables can complete or you can dispose them manually using `Subscription.unsubscribe()` or `takeUntil`.

```ts
const search$ = fromEvent(searchInput.nativeElement, 'input').pipe(
	map((event: Event) => (event.target as HTMLInputElement).value.trim()),
	debounceTime(250),
	distinctUntilChanged(),
	switchMap((term) => this.searchService.lookup(term))
);

search$.subscribe(results => this.matches.set(results));
```

## Best Practices

- Prefer the `async` pipe in templates; it handles subscription lifecycles automatically.
- Use **higher-order mapping operators** intentionally:
	- `switchMap` cancels previous requests—ideal for live search.
	- `mergeMap` keeps every inner stream—great for fire-and-forget analytics.
	- `concatMap` preserves order—perfect for queued writes.
- Guard long-lived subscriptions with `takeUntil(destroy$)` or the `DestroyRef` helpers in Angular 17.

## Debugging Tips

- Enable the [RxJS devtools](https://rxjs.dev/tools/augury) or insert `tap(console.log)` temporarily to observe emissions.
- Log `next`, `error`, and `complete` handlers separately so you know which phase fired.

## Next Steps

- Explore the [Higher-order Observable](https://rxjs.dev/guide/observable) guide to master flattening strategies.
- Combine Observables with the Angular router to react to param changes in `ngOnInit`.
