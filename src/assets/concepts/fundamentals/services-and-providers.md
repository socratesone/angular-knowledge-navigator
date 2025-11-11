---
title: "Services and Providers"
slug: "services-and-providers"
category: "Fundamentals"
skillLevel: "fundamentals"
difficulty: 3
estimatedReadingTime: 30
constitutional: true
tags: ["fundamentals", "services", "providers", "singleton", "data-sharing"]
prerequisites: ["dependency-injection-basics", "typescript-essentials-for-angular"]
relatedTopics: ["http-client-and-interceptors", "advanced-dependency-injection-scopes", "component-communication-input-output-viewchild-service-based"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/fundamentals/services-and-providers.md"
---

# Services and Providers

## Learning Objectives
- Create and configure Angular services with proper DI
- Understand service lifecycles and scoping
- Implement data sharing between components via services  
- Master modern provider patterns and injection techniques
- Apply constitutional service design principles

## Overview
Services are singleton objects that provide specific functionality to Angular applications. Combined with Angular's provider system, they form the backbone of maintainable, testable application architecture.

## Key Service Patterns
```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private data$ = new BehaviorSubject<Data[]>([]);
  
  readonly data = this.data$.asObservable();
  
  loadData(): Observable<Data[]> {
    return this.http.get<Data[]>('/api/data').pipe(
      tap(data => this.data$.next(data))
    );
  }
}
```

## Constitutional Alignment
- **providedIn: 'root'**: Modern singleton pattern
- **inject() function**: Preferred over constructor injection
- **Immutable state**: Services that don't mutate global state
- **TypeScript integration**: Full type safety

## Next Steps: [[http-client-and-interceptors]], [[component-communication-input-output-viewchild-service-based]]