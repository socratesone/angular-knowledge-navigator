---
title: "Custom Decorators and Dynamic Components"
slug: "custom-decorators-and-dynamic-components"
category: "Advanced"
skillLevel: "advanced"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["decorators", "dynamic-components", "metaprogramming", "cdk", "viewcontainerref"]
prerequisites: ["components-and-templates", "dependency-injection-basics", "component-communication-input-output-viewchild-service-based"]
relatedTopics: ["standalone-components-and-feature-modules-integration", "optimizing-change-detection-and-performance", "custom-structural-directives"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/custom-decorators-and-dynamic-components.md"
---

# Custom Decorators and Dynamic Components

## Learning Objectives
- Design reusable class, property, and method decorators that codify architectural rules.
- Render components dynamically with `ViewContainerRef`, `createComponent`, and the Angular CDK Portal API.
- Blend custom decorators with dynamic component factories to build pluggable UX systems.
- Apply constitutional guidelines (standalone components, OnPush, signals) when generating components at runtime.

## Why Custom Decorators Matter
Decorators let you wrap Angular metadata in expressive helper functions so teams can:
- Enforce consistent DI scopes (`@FeatureService`, `@AnalyticsEffect`).
- Apply shared host bindings/styles (`@ConstitutionalSurface`).
- Instrument behaviors (audit logging, performance tracing) without scattering code.

### Example: Feature Flag Guard Decorator
```typescript
export interface FeatureFlagConfig {
  flag: string;
  fallback?: () => void;
}

export function RequiresFlag({ flag, fallback }: FeatureFlagConfig) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    return class extends target {
      private featureService = inject(FeatureToggleService);

      constructor(...args: any[]) {
        super(...args);
        if (!this.featureService.isEnabled(flag)) {
          fallback?.();
          throw new Error(`Feature flag ${flag} disabled`);
        }
      }
    };
  };
}
```

### Property Decorator for Analytics
```typescript
export function TrackInput(metric: string) {
  return function(target: any, propertyKey: string) {
    const privateKey = Symbol(propertyKey);
    Object.defineProperty(target, propertyKey, {
      get() {
        return this[privateKey];
      },
      set(value) {
        this.analytics?.record(metric, value);
        this[privateKey] = value;
      }
    });
  };
}
```

## Dynamic Component Rendering Patterns

### Minimal Dynamic Host
```typescript
@Component({
  selector: 'app-dynamic-host',
  standalone: true,
  template: '<ng-template #host></ng-template>'
})
export class DynamicHostComponent implements AfterViewInit {
  @ViewChild('host', { read: ViewContainerRef }) host!: ViewContainerRef;

  load(component: Type<unknown>, inputs?: Record<string, any>) {
    this.host.clear();
    const componentRef = this.host.createComponent(component);
    Object.assign(componentRef.instance, inputs);
  }
}
```

### Signals + Dynamic Components
```typescript
@Component({
  selector: 'app-dynamic-region',
  standalone: true,
  imports: [DynamicHostComponent]
})
export class DynamicRegionComponent {
  private registry = inject(ComponentRegistryService);
  private region = signal<ComponentRegistration | null>(null);

  render(regionKey: string) {
    this.region.set(this.registry.resolve(regionKey));
  }
}
```

### CDK Portal Pattern
Use `ComponentPortal` and `PortalOutlet` when the host element is not known ahead of time (dialogs, overlays).

```typescript
const portal = new ComponentPortal(NotificationCardComponent);
this.portalOutlet.attach(portal);
```

## Architectural Considerations
- **Providers**: Register per-instance services in the dynamic component’s metadata or via environment injectors.
- **Change Detection**: Prefer `OnPush` and pass immutable inputs when inserting components programmatically.
- **Cleanup**: Keep track of `ComponentRef` instances; call `destroy()` on navigation or when removing tabs.
- **Security**: Only instantiate components from trusted registries to avoid arbitrary template execution.

## Testing Strategy
- Unit test decorators by applying them to host classes and asserting side effects.
- Use Angular’s `TestBed` with `ComponentFixtureAutoDetect` disabled to verify dynamic creation manually.
- Snapshot dynamic registries to ensure expected components map to keys.

## Checklist
- [ ] Wrap repeated metadata in a decorator with clear naming.
- [ ] Ensure decorators preserve Angular metadata (returning extended classes copies `ɵcmp` automatically in Ivy).
- [ ] Prefer dependency injection inside decorators via `inject()` rather than global singletons.
- [ ] Use tokens (`ComponentRegistryToken`) to keep registries tree-shakable.
- [ ] Document extension points so feature teams can register plugins without editing core modules.

## Next Steps
- Deep dive into [[custom-structural-directives]] for conditional rendering primitives.
- Combine runtime components with [[dynamic-form-generation-and-configuration-driven-uis]].
- Instrument your dynamic surface with [[unit-testing-with-jest-and-angular-testing-library]].
