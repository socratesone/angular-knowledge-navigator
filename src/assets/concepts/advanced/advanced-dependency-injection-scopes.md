---
title: "Advanced Dependency Injection Scopes"
slug: "advanced-dependency-injection-scopes"
category: "Advanced"
skillLevel: "advanced"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["advanced", "dependency-injection", "scopes", "providers", "hierarchical-injectors"]
prerequisites: ["dependency-injection-basics", "services-and-providers", "standalone-components-and-feature-modules-integration"]
relatedTopics: ["custom-decorators-and-dynamic-components", "reactive-state-management-rxjs-componentstore-ngrx-introduction", "application-architecture-and-module-boundaries"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/advanced/advanced-dependency-injection-scopes.md"
---

# Advanced Dependency Injection Scopes

## Learning Objectives
- Master Angular's hierarchical injector system and service scoping
- Implement custom injection tokens and multi-providers
- Design advanced DI patterns for complex applications
- Apply constitutional DI practices for maintainable architecture
- Understand injector trees and service lifetime management

## Overview
Angular's dependency injection system provides sophisticated scoping mechanisms that enable fine-grained control over service lifetimes, multi-provider patterns, and hierarchical service resolution.

## Key Concepts

### Hierarchical Injector System
```typescript
// Platform-level injector (singleton across all applications)
@Injectable({ providedIn: 'platform' })
export class PlatformConfigService { }

// Root-level injector (application singleton)
@Injectable({ providedIn: 'root' })
export class AppStateService { }

// Component-level injector (new instance per component)
@Component({
  selector: 'app-feature',
  standalone: true,
  providers: [FeatureService] // Component-scoped
})
export class FeatureComponent {
  constructor(private featureService: FeatureService) { }
}

// Module-level injector (feature module scope)
@NgModule({
  providers: [
    {
      provide: FEATURE_CONFIG,
      useValue: { apiUrl: '/api/feature' }
    }
  ]
})
export class FeatureModule { }
```

### Custom Injection Tokens
```typescript
// Type-safe injection tokens
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
export const FEATURE_FLAGS = new InjectionToken<FeatureFlags>('FEATURE_FLAGS');
export const LOGGER_CONFIG = new InjectionToken<LoggerConfig>('LOGGER_CONFIG');

// Multi-provider pattern for plugins
export const VALIDATION_PLUGINS = new InjectionToken<ValidationPlugin[]>('VALIDATION_PLUGINS');

@Injectable()
export class EmailValidationPlugin implements ValidationPlugin {
  validate(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}

// Provider configuration
export const appProviders = [
  {
    provide: API_BASE_URL,
    useValue: environment.apiUrl
  },
  {
    provide: VALIDATION_PLUGINS,
    useClass: EmailValidationPlugin,
    multi: true
  },
  {
    provide: VALIDATION_PLUGINS,
    useClass: PhoneValidationPlugin,
    multi: true
  }
];
```

### Advanced Provider Patterns
```typescript
// Factory providers with dependencies
export function createLoggerService(
  config: LoggerConfig,
  http: HttpClient
): LoggerService {
  return new LoggerService(config, http);
}

export const LOGGER_PROVIDER = {
  provide: LoggerService,
  useFactory: createLoggerService,
  deps: [LOGGER_CONFIG, HttpClient]
};

// Class providers with useClass
export const DATA_SERVICE_PROVIDER = {
  provide: DataService,
  useClass: environment.production ? ProdDataService : MockDataService
};

// Async providers for configuration
export function loadConfiguration(http: HttpClient): Promise<AppConfig> {
  return http.get<AppConfig>('/api/config').toPromise();
}

export const CONFIG_PROVIDER = {
  provide: APP_INITIALIZER,
  useFactory: loadConfiguration,
  deps: [HttpClient],
  multi: true
};
```

## Constitutional DI Patterns

### Modern inject() Function
```typescript
@Component({
  selector: 'app-modern-di',
  standalone: true
})
export class ModernDIComponent {
  // Preferred: inject() function
  private userService = inject(UserService);
  private logger = inject(LoggerService, { optional: true });
  private config = inject(API_BASE_URL);
  
  // Conditional injection
  private featureService = inject(FeatureService, { optional: true });
  
  constructor() {
    if (this.featureService) {
      this.featureService.initialize();
    }
  }
}
```

### Scoped Service Patterns
```typescript
// Feature-scoped service with state
@Injectable()
export class FeatureScopedService {
  private state = signal<FeatureState>({
    isLoading: false,
    data: [],
    error: null
  });
  
  readonly state$ = this.state.asReadonly();
  
  loadData(): void {
    this.state.update(s => ({ ...s, isLoading: true }));
    // Load data logic
  }
}

// Component provides scoped service
@Component({
  selector: 'app-feature-container',
  standalone: true,
  providers: [FeatureScopedService], // New instance per component
  template: `
    <app-feature-child></app-feature-child>
    <app-feature-another-child></app-feature-another-child>
  `
})
export class FeatureContainerComponent { }
```

## Real-World Applications
- **Multi-tenant Applications**: Tenant-scoped services
- **Plugin Architectures**: Multi-provider registration systems
- **Feature Modules**: Isolated feature state management
- **Testing**: Service mocking and replacement strategies
- **Configuration Management**: Environment-specific service implementations

### Advanced Patterns
```typescript
// Self-registering providers
export abstract class BasePlugin {
  abstract execute(): void;
}

@Injectable({
  providedIn: 'root'
})
export class PluginRegistry {
  private plugins = inject(PLUGIN_TOKEN, { optional: true }) || [];
  
  executeAll(): void {
    this.plugins.forEach(plugin => plugin.execute());
  }
}

// Decorator for automatic plugin registration
export function RegisterPlugin(token: InjectionToken<any>) {
  return function(target: any) {
    // Registration logic
  };
}

// Context-aware injection
@Injectable({ providedIn: 'root' })
export class ContextAwareService {
  private injector = inject(Injector);
  
  getService<T>(token: Type<T> | InjectionToken<T>): T {
    return this.injector.get(token);
  }
}
```

## Performance Considerations
- **Service Lifetime**: Understanding memory implications of different scopes
- **Lazy Loading**: Services that are created only when needed
- **Tree Shaking**: Ensuring unused services are eliminated
- **Circular Dependencies**: Avoiding and resolving circular references

### Testing Advanced DI
```typescript
describe('Advanced DI Component', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ModernDIComponent],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://test-api.com'
        },
        {
          provide: LoggerService,
          useValue: jasmine.createSpyObj('LoggerService', ['log'])
        }
      ]
    });
  });
  
  it('should inject services correctly', () => {
    const fixture = TestBed.createComponent(ModernDIComponent);
    const component = fixture.componentInstance;
    
    expect(component).toBeTruthy();
    // Test service interactions
  });
});
```

## Common Pitfalls and Solutions
- **Provider Conflicts**: Resolving multiple providers for the same token
- **Scope Confusion**: Understanding when new instances are created
- **Memory Leaks**: Proper cleanup of component-scoped services
- **Circular Dependencies**: Design patterns to avoid cycles
- **Testing Complexity**: Strategies for testing complex DI scenarios

## Assessment Questions
1. How does Angular's hierarchical injector system resolve service dependencies?
2. When would you use component-level providers vs root-level providers?
3. How do multi-providers work and what are their use cases?
4. What are the performance implications of different injection scopes?

## Next Steps
[[custom-decorators-and-dynamic-components]], [[reactive-state-management-rxjs-componentstore-ngrx-introduction]], [[application-architecture-and-module-boundaries]]

## Expansion Guidance for LLMs
When expanding this content, include comprehensive examples of hierarchical injection, advanced provider patterns, custom token creation, multi-provider systems, performance benchmarks, testing strategies, troubleshooting guides, and integration with modern Angular features like signals and standalone components.