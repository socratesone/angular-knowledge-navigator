---
title: "Working with Template-Driven Forms"
slug: "working-with-forms-template-driven-forms"
category: "Fundamentals"
skillLevel: "fundamentals"
difficulty: 2
estimatedReadingTime: 12
constitutional: false
tags: ["forms", "template-driven"]
prerequisites: ["fundamentals/handling-user-input-and-validation"]
relatedTopics: ["fundamentals/handling-user-input-and-validation", "fundamentals/introduction-to-observables-and-rxjs"]
lastUpdated: "2025-11-17"
contentPath: "/assets/concepts/fundamentals/working-with-forms-template-driven-forms.md"
---

# Working with Template-Driven Forms

Template-driven forms excel when you need quick prototypes, marketing capture pages, or developer onboarding experiences. The framework infers form controls from declarative markup, limiting boilerplate without sacrificing validation or accessibility.

## Learning Objectives

- Configure the `FormsModule` and understand the directives it registers
- Model two-way data binding with `[(ngModel)]`
- Drive validation state directly from the template
- Submit typed DTOs without writing verbose component logic

## Building the Form

```html
<form #profileForm="ngForm" (ngSubmit)="save(profileForm.value)">
	<label>
		Display name
		<input name="displayName" [(ngModel)]="profile.displayName" required />
	</label>

	<label>
		Timezone
		<select name="timezone" [(ngModel)]="profile.timezone" required>
			<option *ngFor="let tz of timezones" [value]="tz">{{ tz }}</option>
		</select>
	</label>

	<button type="submit" [disabled]="profileForm.invalid">Save</button>
</form>
```

Angular automatically registers `NgModel` instances for each control, tracks their validity, and exposes helper classes (`ng-dirty`, `ng-touched`, `ng-valid`) that you can target in CSS.

## Validation Flow

- Add built-in attributes (`required`, `minlength`, `email`) to the markup—Angular converts them into validators.
- Access status flags through the exported `ngModel` instance: `#email="ngModel"` gives you `email.errors`, `email.touched`, and `email.pending`.
- For custom validation, create an attribute directive that implements `Validator` and provide it under `NG_VALIDATORS`.

## When to Choose Template-Driven

| Use template-driven when… | Reach for reactive forms when… |
| --- | --- |
| The form has < 10 controls | You need dynamic control creation |
| Validation rules are simple | Business rules depend on multiple fields |
| Designers iterate directly in the template | You require fine-grained observability over value changes |

## Testing Tips

- Use `TestBed` + `FormsModule` to render the component and then update inputs with `dispatchEvent(new Event('input'))`.
- Assert against `ngForm.valid` and `component.profile` to confirm bindings and validators run as expected.

## Next Steps

- Layer in complex validation logic using the **reactive forms** API after you’re comfortable with template directives.
- Explore **standalone components** + template-driven forms to ship smaller bundles in Angular 17+.
