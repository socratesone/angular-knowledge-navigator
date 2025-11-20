---
title: "Dynamic Form Generation and Configuration-driven UIs"
slug: "dynamic-form-generation-and-configuration-driven-uis"
category: "Advanced"
skillLevel: "advanced"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["forms", "dynamic-ui", "configuration", "json-schema"]
prerequisites: ["reactive-forms-and-formbuilder", "content-projection-and-ng-content", "component-communication-input-output-viewchild-service-based"]
relatedTopics: ["custom-structural-directives", "reusable-component-libraries-and-shared-modules", "unit-testing-with-jest-and-angular-testing-library"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/dynamic-form-generation-and-configuration-driven-uis.md"
---

# Dynamic Form Generation and Configuration-driven UIs

## Learning Objectives
- Build UX surfaces from JSON/metadata instead of handwritten templates.
- Compose reusable field renderers and validators that honor constitutional guidelines.
- Manage complex workflows (wizards, onboarding) through declarative configuration.

## Schema-Driven Architecture
```typescript
export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'group';

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  children?: FormFieldConfig[];
  validators?: ValidatorFn[];
}
```

### Dynamic Form Builder Service
```typescript
@Injectable({ providedIn: 'root' })
export class DynamicFormBuilder {
  constructor(private fb: FormBuilder) {}

  createGroup(config: FormFieldConfig[]): FormGroup {
    const group: Record<string, any> = {};
    for (const field of config) {
      group[field.key] = field.type === 'group'
        ? this.createGroup(field.children ?? [])
        : this.fb.control('', field.validators || []);
    }
    return this.fb.group(group);
  }
}
```

## Rendering Engine
```html
<ng-container *ngFor="let field of config">
  <app-dynamic-control
    [field]="field"
    [form]="form">
  </app-dynamic-control>
</ng-container>
```

```typescript
@Component({
  selector: 'app-dynamic-control',
  standalone: true,
  imports: [ReactiveFormsModule, NgSwitch, NgSwitchCase]
})
export class DynamicControlComponent {
  @Input({ required: true }) field!: FormFieldConfig;
  @Input({ required: true }) form!: FormGroup;
}
```

## Configuration Sources
- JSON served from CMS/back-end (validate with zod or io-ts before rendering).
- Local TypeScript objects for product bundles, experiments, or feature flags.

## Validation & UX
- Attach validators declaratively via config to avoid switching logic inside components.
- Provide hint + error messaging templates that read metadata (e.g., `field.helpText`).
- Use `cdkStepper` or router outlets for multi-step forms.

## Performance Tips
- Lazy-load field renderers (e.g., `<app-json-editor-field>` heavy dependency) via `loadComponent`.
- Cache form config per tenant to avoid re-fetching on every navigation.
- Memoize config -> `FormGroup` transformation when editing the same schema repeatedly.

## Testing Strategies
- Snapshot field configurations to catch accidental schema regressions.
- Use Jest to instantiate `DynamicFormBuilder` and assert control trees.
- Write Cypress tests that feed synthetic configs and ensure layout generation works for each field type.

## Checklist
- [ ] Version form schemas and migrate persisted responses when structure changes.
- [ ] Keep config under review in `specs/plan.md` to maintain auditability.
- [ ] Provide UI affordances for hidden/readonly fields driven by policy.
- [ ] Instrument analytics to learn which form sections cause abandonment.
- [ ] Document escape hatches when custom templates are unavoidable.

## Next Steps
- Extend rendering primitives with [[custom-structural-directives]].
- Publish field components into [[reusable-component-libraries-and-shared-modules]].
- Automate regression testing with [[end-to-end-testing-with-cypress-or-playwright]].
