---
title: "Routing and Navigation Basics"
slug: "routing-and-navigation-basics"
category: "Fundamentals"
skillLevel: "fundamentals"
difficulty: 2
estimatedReadingTime: 16
constitutional: false
tags: ["router", "navigation"]
prerequisites: ["fundamentals/introduction-to-observables-and-rxjs"]
relatedTopics: ["fundamentals/handling-user-input-and-validation"]
lastUpdated: "2025-11-17"
contentPath: "/assets/concepts/fundamentals/routing-and-navigation-basics.md"
---

# Routing and Navigation Basics

The Angular Router keeps your UI in sync with the browser URL, enabling bookmarking, shareable deep links, and guardrails around protected areas of the app. This primer covers route configuration, navigation APIs, and first-level guard strategies.

## Learning Objectives

- Configure top-level routes using standalone components or lazy-loaded route trees
- Navigate declaratively with `<a routerLink>` and programmatically with `Router.navigate`
- Read route parameters, query params, and fragment information reactively
- Protect routes with `canActivate` and preload critical bundles

## Defining Routes

```ts
export const appRoutes: Routes = [
	{
		path: 'concepts',
		loadChildren: () => import('./concepts/routes').then((m) => m.CONCEPT_ROUTES)
	},
	{ path: '', pathMatch: 'full', redirectTo: 'concepts/fundamentals' },
	{ path: '**', loadComponent: () => import('./shared/not-found.component') }
];
```

Use `loadChildren` with standalone route files to keep bundles lean. The wildcard route should always be last and render a lightweight “not found” view.

## Navigation Patterns

- **Declarative:** `<a routerLink="['/concepts', topic.slug]"></a>` keeps the link accessible and automatically toggles `aria-current` when the URL matches.
- **Programmatic:** Inject `Router` and call `navigate` or `navigateByUrl` when navigation depends on imperative logic (e.g., after saving a form).
- **Stateful Navigation:** pass extras such as `state: { from: 'search' }` to show contextual toasts after redirecting.

## Reading Route Data

- Use `ActivatedRoute.paramMap` and the `async` pipe to project URL parameters.
- Combine `paramMap`, `queryParamMap`, and custom data via `combineLatest` to build view models without nested subscriptions.

## Guarding Routes

- Implement `CanActivateFn` (Angular 15+) to keep guard logic close to feature modules.
- Surface redirect reasons in query params so UX can show the appropriate message (“Please sign in to edit drafts”).
- Pair guards with **resolvers** when you need data loaded before the component initializes.

## Next Steps

- Enable [router tracing](https://angular.io/api/router/Router#enabletracing) in development to understand navigation timing.
- Explore preloading strategies (e.g., `QuickLinkStrategy`) to optimize route-to-route transitions.
