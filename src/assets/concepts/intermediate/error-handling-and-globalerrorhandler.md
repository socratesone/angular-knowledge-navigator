---
title: "Error Handling and GlobalErrorHandler"
slug: "error-handling-and-globalerrorhandler"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "error-handling"]
prerequisites: ["http-client-and-interceptors", "services-and-providers"]
relatedTopics: ["error-monitoring-and-observability-sentry-opentelemetry", "performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/error-handling-and-globalerrorhandler.md"
---

# Error Handling and GlobalErrorHandler

## Learning Objectives
- Use `ErrorHandler` for centralized error capture.
- Handle HTTP errors consistently across features.
- Surface user-friendly messages while preserving logs.
- Integrate monitoring tools safely (Sentry, OpenTelemetry).

## Overview
Error handling in Angular should be consistent, observable, and user-friendly. A global error handler lets you log errors once while keeping components focused on UX.

## Global Error Handler
```typescript
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private logger = inject(ErrorLoggerService);

  handleError(error: unknown): void {
    this.logger.capture(error);
    console.error(error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [{ provide: ErrorHandler, useClass: GlobalErrorHandler }]
};
```

## HTTP Error Handling
```typescript
catchError((error: HttpErrorResponse) => {
  if (error.status === 401) {
    this.authService.signOut();
  }
  return throwError(() => new Error('Request failed.'));
});
```

## UX Patterns
- Show contextual, recoverable messages (e.g., retry buttons).
- Avoid exposing stack traces to users.
- Distinguish between validation errors and system errors.

## Practice & Apply
- Create a toast service that listens for errors and surfaces a user-friendly message.
- Log errors with a correlation ID for easier debugging.
- Add a 404 fallback page and verify it triggers on failed navigation.

## Assessment Questions
1. What should be logged globally vs locally handled in a component?
2. How do you avoid logging sensitive user data?
3. Why is it important to normalize error messages?
4. How do you test a global error handler?

## Next Steps
[[error-monitoring-and-observability-sentry-opentelemetry]], [[http-client-and-interceptors]], [[performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction]]
