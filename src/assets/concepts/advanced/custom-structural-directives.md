---
title: "Custom Structural Directives"
slug: "custom-structural-directives"
category: "Advanced"
skillLevel: "advanced"
difficulty: 4
estimatedReadingTime: 35
constitutional: true
tags: ["directives", "structural", "templates", "cdk"]
prerequisites: ["directives-ngif-ngfor-ngswitch", "content-projection-and-ng-content", "component-communication-input-output-viewchild-service-based"]
relatedTopics: ["custom-decorators-and-dynamic-components", "dynamic-form-generation-and-configuration-driven-uis", "angular-signals"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/custom-structural-directives.md"
---

# Custom Structural Directives

## Learning Objectives
- Modify Angular templates with reusable structural directives powered by `TemplateRef` and `ViewContainerRef`.
- Implement policy-aware rendering (`*appHasPermission`, `*appExperiment`) that plugs into constitutional tooling.
- Optimize DOM churn by reusing embedded views and leveraging signals.

## Anatomy of a Structural Directive
```typescript
@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private hasView = false;
  private requiredPermission?: string;

  constructor(
    private tpl: TemplateRef<unknown>,
    private vcr: ViewContainerRef,
    private access = inject(AccessControlService)
  ) {}

  @Input()
  set appHasPermission(permission: string) {
    this.requiredPermission = permission;
    this.updateView();
  }

  private updateView() {
    if (this.access.can(this.requiredPermission!) && !this.hasView) {
      this.vcr.createEmbeddedView(this.tpl);
      this.hasView = true;
    } else if (!this.access.can(this.requiredPermission!) && this.hasView) {
      this.vcr.clear();
      this.hasView = false;
    }
  }
}
```

## Context Objects
Expose values back to the template via `let-` bindings.

```typescript
interface ExperimentContext {
  $implicit: boolean;
  name: string;
}

@Directive({ selector: '[appExperiment]' })
export class ExperimentDirective {
  private context: ExperimentContext = { $implicit: false, name: '' };

  @Input('appExperiment') set experiment(name: string) {
    this.context.name = name;
    this.context.$implicit = this.experiments.isOn(name);
    this.render();
  }

  private render() {
    this.vcr.clear();
    this.vcr.createEmbeddedView(this.tpl, this.context);
  }
}
```

Usage:
```html
<div *appExperiment="'pricing-new-layout'; let enabled">
  <app-new-pricing *ngIf="enabled; else legacy"></app-new-pricing>
</div>
```

## Signals Integration
Use signals to trigger directive updates without manual subscriptions.

```typescript
const feature = computed(() => this.flags.featureX());

effect(() => {
  feature() ? this.vcr.createEmbeddedView(this.tpl) : this.vcr.clear();
});
```

## Testing
- Instantiate directive with `TestBed` and supply fake `TemplateRef` via helper host components.
- For DOM-driven directives, use Spectator or Harnesses to assert inserted nodes.

## Checklist
- [ ] Always decorate with `@Directive({ standalone: true })` to reuse without NgModule friction.
- [ ] Support `else` templates by exposing `appDirectiveElse` input when needed.
- [ ] Avoid tight coupling to specific services—inject tokens.
- [ ] Document expected context variables for template authors.
- [ ] Provide fallbacks for SSR (e.g., render default view when browser-only APIs unavailable).

## Next Steps
- Use directives inside [[dynamic-form-generation-and-configuration-driven-uis]] pipelines.
- Pair with [[custom-decorators-and-dynamic-components]] for policy-driven UI.
- Audit directives via [[unit-testing-with-jest-and-angular-testing-library]].
