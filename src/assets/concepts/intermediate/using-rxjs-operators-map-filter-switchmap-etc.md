---
title: "Using RxJS Operators (map, filter, switchMap, etc.)"
slug: "using-rxjs-operators-map-filter-switchmap-etc"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "rxjs"]
prerequisites: ["introduction-to-observables-and-rxjs"]
relatedTopics: ["reactive-state-management-rxjs-componentstore-ngrx-introduction", "http-client-and-interceptors"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/using-rxjs-operators-map-filter-switchmap-etc.md"
---

# Using RxJS Operators (map, filter, switchMap, etc.)

## Learning Objectives
- Select the right operator for async UI flows.
- Avoid nested subscriptions with higher-order mapping.
- Build readable, testable streams for state and side effects.
- Apply error handling and cleanup in RxJS pipelines.

## Overview
RxJS operators are the building blocks of Angular’s reactive patterns. Choosing the right operator keeps code concise and prevents memory leaks or race conditions.

## Core Operators
```typescript
const searchResults$ = searchTerms$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => this.api.search(term)),
  catchError(() => of([]))
);
```

- **map**: transform values.
- **filter**: drop unwanted values.
- **switchMap**: cancel in-flight requests when new input arrives.
- **mergeMap**: run requests in parallel.
- **concatMap**: queue requests in order.

## Error Handling
- Use `catchError` to return a fallback value.
- Use `retry` with backoff for transient failures.
- Use `finalize` to stop spinners or clean up resources.

## Practice & Apply
- Refactor a nested subscription into a `switchMap`.
- Add `takeUntilDestroyed()` to a component stream.
- Use `shareReplay(1)` to cache a single HTTP call.

## Assessment Questions
1. When should you prefer `switchMap` over `mergeMap`?
2. Why is `shareReplay(1)` helpful for HTTP requests?
3. How do you avoid memory leaks in component streams?
4. What does `distinctUntilChanged` protect you from?

## Next Steps
[[introduction-to-observables-and-rxjs]], [[reactive-state-management-rxjs-componentstore-ngrx-introduction]], [[http-client-and-interceptors]]
