# Data Binding

Data binding is a core concept in Angular that allows you to coordinate communication between your component and template.

## Types of Data Binding

Angular supports four types of data binding:

### 1. Interpolation (One-way: Component → Template)

Display component data in the template:

```html
<h1>{{ title }}</h1>
<p>User: {{ user.name }}</p>
<span>Total: {{ price * quantity }}</span>
```

```typescript
export class ProductComponent {
  title = 'Product Details';
  user = { name: 'Angular Developer' };
  price = 99.99;
  quantity = 2;
}
```

### 2. Property Binding (One-way: Component → Template)

Set element properties from component data:

```html
<img [src]="imageUrl" [alt]="imageAlt">
<button [disabled]="isSubmitting">Submit</button>
<div [class.active]="isActive"></div>
<p [style.color]="textColor">Styled text</p>
```

```typescript
export class DataBindingComponent {
  imageUrl = '/assets/logo.png';
  imageAlt = 'Company Logo';
  isSubmitting = false;
  isActive = true;
  textColor = 'blue';
}
```

### 3. Event Binding (One-way: Template → Component)

Listen to DOM events and call component methods:

```html
<button (click)="onSave()">Save</button>
<input (keyup)="onKeyUp($event)" (blur)="onBlur()">
<form (submit)="onSubmit($event)">
  <!-- form content -->
</form>
```

```typescript
export class EventBindingComponent {
  onSave(): void {
    console.log('Save clicked!');
  }

  onKeyUp(event: KeyboardEvent): void {
    console.log('Key pressed:', event.key);
  }

  onBlur(): void {
    console.log('Input lost focus');
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    console.log('Form submitted');
  }
}
```

### 4. Two-way Binding (Bidirectional)

Combine property and event binding for bidirectional data flow:

```html
<input [(ngModel)]="username">
<p>Hello, {{ username }}!</p>

<!-- Equivalent to: -->
<input [ngModel]="username" (ngModelChange)="username = $event">
```

```typescript
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  // ... template
})
export class TwoWayBindingComponent {
  username = '';
}
```

## Advanced Binding Techniques

### Safe Navigation Operator

Use the safe navigation operator (`?.`) to avoid errors with null/undefined:

```html
<p>{{ user?.profile?.email }}</p>
<img [src]="user?.avatar?.url">
```

### Non-null Assertion Operator

Use when you're certain a value is not null:

```html
<p>{{ user!.name }}</p>
```

### Template Reference Variables

Create references to template elements:

```html
<input #userInput (keyup)="onKeyUp(userInput.value)">
<p>You typed: {{ userInput.value }}</p>

<button (click)="userInput.focus()">Focus Input</button>
```

### Custom Property Binding

Create custom properties for components:

```typescript
// Parent Component
@Component({
  template: `<app-user-card [user]="selectedUser"></app-user-card>`
})
export class ParentComponent {
  selectedUser = { name: 'John Doe', age: 30 };
}

// Child Component
@Component({
  selector: 'app-user-card',
  template: `
    <div class="user-card">
      <h3>{{ user.name }}</h3>  
      <p>Age: {{ user.age }}</p>
    </div>
  `
})
export class UserCardComponent {
  @Input() user!: { name: string; age: number };
}
```

## Best Practices

✅ **Use OnPush with Immutable Data**
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent {
  // Always create new objects for updates
  updateUser(): void {
    this.user = { ...this.user, name: 'New Name' };
  }
}
```

✅ **Avoid Complex Expressions in Templates**
```typescript
// ❌ Avoid
template: `<p>{{ calculateComplexValue(a, b, c) }}</p>`

// ✅ Better - use computed properties or getters
get displayValue(): string {
  return this.calculateComplexValue(this.a, this.b, this.c);
}
```

✅ **Use Async Pipe for Observables**
```html
<!-- ✅ Automatic subscription management -->
<div *ngIf="user$ | async as user">
  <h2>{{ user.name }}</h2>
</div>
```

## Common Gotchas

⚠️ **Avoid Direct DOM Manipulation**
```typescript
// ❌ Don't do this
document.getElementById('myElement').innerHTML = 'New content';

// ✅ Use Angular binding instead
template: `<div [innerHTML]="dynamicContent"></div>`
```

⚠️ **Be Careful with Object References**
```typescript
// ❌ This won't trigger change detection with OnPush
this.user.name = 'New Name';

// ✅ Create new object reference
this.user = { ...this.user, name: 'New Name' };
```

## Next Steps

- [Directives](directives)
- [Pipes and Data Transformation](pipes)
- [Forms and Validation](forms-and-validation)