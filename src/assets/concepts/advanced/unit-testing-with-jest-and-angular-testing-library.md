---
title: "Unit Testing with Jest and Angular Testing Library"
slug: "unit-testing-with-jest-and-angular-testing-library"
category: "Advanced"
skillLevel: "advanced"
difficulty: 3
estimatedReadingTime: 35
constitutional: true
tags: ["testing", "jest", "angular-testing-library", "atl", "unit-tests"]
prerequisites: ["components-and-templates", "services-and-providers", "using-rxjs-operators-map-filter-switchmap-etc"]
relatedTopics: ["end-to-end-testing-with-cypress-or-playwright", "code-quality-automation-and-linting-enforcement", "reactive-state-management-rxjs-componentstore-ngrx-introduction"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/unit-testing-with-jest-and-angular-testing-library.md"
---

# Unit Testing with Jest and Angular Testing Library

## Learning Objectives
- Configure Jest to replace Karma for fast feedback.
- Write DOM-focused tests with Angular Testing Library (ATL) that encourage accessible selectors.
- Mock HTTP, component inputs, and pipes while respecting OnPush and signals.

## Setup Essentials
1. Install dependencies:
   ```bash
   npm install --save-dev jest @types/jest jest-preset-angular @testing-library/angular
   ```
2. Create `setup-jest.ts` importing `jest-preset-angular/setup-jest.mjs`.
3. Update `package.json` scripts (`"test": "jest"`).

## Writing Tests with ATL
```typescript
describe('ContentViewerComponent', () => {
  it('renders article header metadata', async () => {
    const { getByText } = await render(ContentViewerComponent, {
      componentProperties: {
        articleMetadata: signal({
          title: 'Signals Everywhere',
          tags: ['signals'],
          level: 'advanced'
        })
      }
    });

    expect(getByText(/Signals Everywhere/)).toBeInTheDocument();
  });
});
```

### Query Strategies
- Prefer `getByRole` / `getByLabelText` for accessibility alignment.
- Use `findBy*` for async operations.

## Mocking Dependencies
```typescript
await render(DashboardShellComponent, {
  providers: [
    provideMockStore({ initialState }),
    { provide: ProjectsService, useValue: mockProjectsService }
  ]
});
```

## Testing Signals
```typescript
const counter = signal(0);
counter.set(5);
expect(counter()).toBe(5);
```
Use `fakeAsync` + `flush()` for timers; `jest.useFakeTimers()` also works.

## Snapshot vs. Behavioral Tests
- Snapshot components that largely depend on HTML structure.
- Favor behavior tests for business logic (form validation, button enabling).

## Coverage & CI
- Enable `collectCoverageFrom` targeting `src/app/**/*.ts` while excluding `.spec.ts`.
- Feed coverage thresholds into CI to prevent regression.

## Checklist
- [ ] Tests describe behavior (“should submit when form valid”).
- [ ] Use `screen` from ATL to avoid destructuring dozens of query helpers.
- [ ] Reset spies between tests (`jest.clearAllMocks()`).
- [ ] Provide answers for asynchronous operations using `mockResolvedValue` or RxJS `of()`.
- [ ] Document shared test harnesses in `/tests/README.md` (create if missing).

## Next Steps
- Chain with [[end-to-end-testing-with-cypress-or-playwright]] for holistic coverage.
- Automate gating via [[code-quality-automation-and-linting-enforcement]].
- Validate stateful components using [[reactive-state-management-rxjs-componentstore-ngrx-introduction]].
