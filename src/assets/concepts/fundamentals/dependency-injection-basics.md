---
title: "Dependency Injection Basics"
slug: "dependency-injection-basics"
category: "Fundamentals"
skillLevel: "fundamentals"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["fundamentals", "dependency-injection", "services", "providers", "testability"]
prerequisites: ["typescript-essentials-for-angular", "services-and-providers"]
relatedTopics: ["services-and-providers", "advanced-dependency-injection-scopes", "http-client-and-interceptors"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/fundamentals/dependency-injection-basics.md"
---

# Dependency Injection Basics

## Learning Objectives
By the end of this lesson, you will:
- Understand Angular's dependency injection system fundamentals
- Master the @Injectable decorator and provider configuration
- Implement proper service injection in components and other services
- Understand injection scopes and hierarchical injectors
- Apply dependency injection for testable, maintainable code

## Overview
Dependency Injection (DI) is one of Angular's most powerful features, enabling loose coupling, testability, and maintainable architecture. Angular's DI system automatically manages service instances and their dependencies.

## Key Concepts to Cover

### DI Fundamentals
- **Inversion of Control**: Framework manages dependencies
- **Injection Tokens**: Unique identifiers for services
- **Providers**: Instructions for creating service instances
- **Injectors**: The DI container that manages instances
- **Service Hierarchy**: Parent-child injector relationships

### Basic Service Creation and Injection
```typescript
// Service definition with DI
@Injectable({
  providedIn: 'root' // Modern singleton pattern
})
export class UserService {
  private http = inject(HttpClient); // Modern injection syntax
  
  constructor(
    // Traditional constructor injection still works
    private logger: LoggerService
  ) {}
  
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }
}

// Component injection
@Component({
  selector: 'app-user-list',
  standalone: true,
  template: `...`
})
export class UserListComponent {
  // Modern inject() function
  private userService = inject(UserService);
  
  // Traditional constructor injection
  constructor(private dialogService: DialogService) {}
  
  users$ = this.userService.getUsers();
}
```

### Provider Configuration
- **providedIn: 'root'**: Application-wide singleton
- **providedIn: 'platform'**: Platform-level services
- **Component-level providers**: Component-scoped instances
- **Module-level providers**: Feature module scope
- **Custom providers**: Factory functions, values, existing services

## Constitutional Alignment
DI supports constitutional practices by:
- **Testability**: Easy service mocking and replacement
- **Type Safety**: TypeScript ensures proper injection
- **Immutable Services**: Services that don't modify global state
- **Single Responsibility**: Services focused on specific concerns
- **Modern Syntax**: inject() function over constructor injection

### Advanced DI Patterns
```typescript
// Multi-providers for plugins
@Injectable()
export class PluginA implements FeaturePlugin {
  execute() { return 'Plugin A'; }
}

// Provider configuration
{
  provide: FEATURE_PLUGINS,
  useClass: PluginA,
  multi: true
}

// Factory providers for complex initialization
{
  provide: ConfigService,
  useFactory: (http: HttpClient) => {
    return new ConfigService(http, environment.apiUrl);
  },
  deps: [HttpClient]
}
```

## Real-World Context
DI is essential for:
- **Enterprise Applications**: Managing complex service dependencies
- **Testing**: Mocking services for unit tests
- **Modularity**: Swapping implementations for different environments
- **Performance**: Lazy loading services when needed
- **Maintenance**: Centralized service management

## Next Steps
After understanding DI basics:
1. [[services-and-providers]] - Advanced service patterns
2. [[advanced-dependency-injection-scopes]] - Complex DI scenarios
3. [[http-client-and-interceptors]] - DI with HTTP services

## Assessment Questions
1. What are the benefits of Angular's DI system?
2. How does providedIn: 'root' differ from component providers?
3. When would you use the inject() function vs constructor injection?
4. How does DI improve testability?

## Expansion Guidance for LLMs
Cover comprehensive DI patterns, testing strategies, performance implications, hierarchical injectors, custom tokens, and migration from constructor to inject() function patterns.