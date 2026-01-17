---
title: "HTTP Client and Interceptors"
slug: "http-client-and-interceptors"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "http"]
prerequisites: ["dependency-injection-basics", "services-and-providers", "introduction-to-observables-and-rxjs"]
relatedTopics: ["error-handling-and-globalerrorhandler", "using-rxjs-operators-map-filter-switchmap-etc"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/http-client-and-interceptors.md"
---

# HTTP Client and Interceptors

## Learning Objectives
- Use `HttpClient` with strong typing and shared response models.
- Configure `provideHttpClient` and add interceptors for auth, logging, and retries.
- Apply RxJS operators for error handling and response shaping.
- Avoid common HTTP anti-patterns like nested subscriptions and eager polling.

## Overview
Angular's `HttpClient` is the primary API for REST and JSON HTTP calls. Interceptors let you enforce cross-cutting concerns—headers, auth, caching, logging—without duplicating logic in every service.

## HTTP Client Essentials
```typescript
@Injectable({ providedIn: 'root' })
export class ArticlesApi {
  private http = inject(HttpClient);

  getArticles(): Observable<Article[]> {
    return this.http.get<Article[]>('/api/articles');
  }

  createArticle(payload: NewArticle): Observable<Article> {
    return this.http.post<Article>('/api/articles', payload);
  }
}
```

Provide the client in your app config:
```typescript
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()]
};
```

## Interceptors
Interceptors can add headers, centralize error handling, and normalize responses.

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authToken = inject(AuthTokenStore).token();
  const authReq = authToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${authToken}` } })
    : req;

  return next(authReq);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
```

## Error Handling and Retries
```typescript
getArticles(): Observable<Article[]> {
  return this.http.get<Article[]>('/api/articles').pipe(
    retry({ count: 2, delay: 300 }),
    catchError((error: HttpErrorResponse) => {
      this.logger.error('Articles fetch failed', error);
      return throwError(() => new Error('Unable to load articles.'));
    })
  );
}
```

## Best Practices
- **Type everything**: use interfaces for request/response payloads.
- **Keep services thin**: move formatting or mapping to dedicated helpers.
- **Prefer `async` pipe**: avoid manual subscription cleanup in components.
- **Avoid secrets**: never ship secrets in the client or interceptors.

## Practice & Apply
- Build an interceptor that adds a correlation ID header.
- Add an error banner component that listens for global HTTP failures.
- Simulate a 401 response and redirect to a login route.

## Assessment Questions
1. Why is `HttpClient` strongly typed and how does it improve reliability?
2. When should you use an interceptor vs logic in a service method?
3. How do you prevent memory leaks with HTTP subscriptions?
4. What is the difference between retrying a request and caching a response?

## Next Steps
[[using-rxjs-operators-map-filter-switchmap-etc]], [[error-handling-and-globalerrorhandler]], [[advanced-dependency-injection-scopes]]
