# Components and Templates

Angular applications are built using components. A component controls a patch of screen called a view.

## What are Components?

Components are the fundamental building blocks of Angular applications. They display data on the screen, listen for user input, and take action based on that input.

## Component Structure

Every Angular component consists of:

- **TypeScript class**: Defines the component logic
- **HTML template**: Defines the component view  
- **CSS styles**: Defines the component appearance
- **Component decorator**: Provides metadata about the component

## Creating a Component

Here's how to create a basic component:

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-profile">
      <h2>{{ user.name }}</h2>
      <p>{{ user.email }}</p>
      <button (click)="updateProfile()">Update Profile</button>
    </div>
  `,
  styleUrls: ['./user-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserProfileComponent {
  user = {
    name: 'Angular Developer',
    email: 'developer@angular.dev'
  };

  updateProfile(): void {
    // Update profile logic
    console.log('Profile updated!');
  }
}
```

## Template Syntax

Angular templates use special syntax for dynamic content:

### Interpolation
```html
<h1>Welcome, {{ userName }}!</h1>
<p>Today is {{ currentDate | date }}</p>
```

### Property Binding
```html
<img [src]="userImageUrl" [alt]="userName">
<button [disabled]="isLoading">Submit</button>
```

### Event Binding
```html
<button (click)="onSave()">Save</button>
<input (keyup)="onKeyUp($event)">
```

### Two-way Binding
```html
<input [(ngModel)]="userName">
```

## Constitutional Best Practices

✅ **Always use standalone: true**
```typescript
@Component({
  standalone: true,  // ✅ Required
  imports: [CommonModule]
})
```

✅ **Use OnPush change detection**
```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush  // ✅ Performance
})
```

✅ **Explicit imports**
```typescript
@Component({
  standalone: true,
  imports: [CommonModule, MatButtonModule]  // ✅ Explicit dependencies
})
```

## Common Patterns

### Input Properties
```typescript
@Component({
  selector: 'app-child',
  template: `<p>Message: {{ message }}</p>`
})
export class ChildComponent {
  @Input() message!: string;
}
```

### Output Events
```typescript
@Component({
  selector: 'app-child',
  template: `<button (click)="notify()">Click me</button>`
})
export class ChildComponent {
  @Output() messageEvent = new EventEmitter<string>();

  notify(): void {
    this.messageEvent.emit('Hello from child!');
  }
}
```

## Next Topics

- [Data Binding](data-binding)
- [Directives](directives)
- [Services and Dependency Injection](services-and-dependency-injection)