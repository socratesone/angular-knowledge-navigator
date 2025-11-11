# Angular Signals

## Overview

Angular Signals represent a new reactive primitive that provides a more efficient and intuitive way to manage state in Angular applications. Signals are a modern alternative to traditional change detection patterns and offer better performance and developer experience.

## What are Signals?

Signals are reactive values that notify consumers when they change. They provide:
- **Reactivity**: Automatic updates when values change
- **Performance**: Precise change detection without zone.js
- **Simplicity**: Cleaner, more readable code
- **Type Safety**: Full TypeScript support

## Creating Signals

### Basic Signal Creation

```typescript
import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <div>
      <p>Count: {{ count() }}</p>
      <button (click)="increment()">+</button>
      <button (click)="decrement()">-</button>
    </div>
  `
})
export class CounterComponent {
  // Create a signal with initial value
  count = signal(0);
  
  increment(): void {
    this.count.set(this.count() + 1);
  }
  
  decrement(): void {
    this.count.update(value => value - 1);
  }
}
```

### Signal Methods

```typescript
// Creating signals
const name = signal('John');
const age = signal(25);
const items = signal<string[]>([]);

// Reading signal values
console.log(name()); // 'John'
console.log(age());  // 25

// Setting new values
name.set('Jane');
age.set(30);

// Updating based on current value
age.update(current => current + 1);
items.update(current => [...current, 'new item']);
```

## Computed Signals

Computed signals derive their value from other signals and update automatically:

```typescript
import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  template: `
    <div>
      <input [(ngModel)]="firstName" placeholder="First Name">
      <input [(ngModel)]="lastName" placeholder="Last Name">
      <p>Full Name: {{ fullName() }}</p>
      <p>Initials: {{ initials() }}</p>
    </div>
  `
})
export class UserProfileComponent {
  firstName = signal('');
  lastName = signal('');
  
  // Computed signals automatically update when dependencies change
  fullName = computed(() => 
    `${this.firstName()} ${this.lastName()}`.trim()
  );
  
  initials = computed(() => 
    `${this.firstName()[0] || ''}${this.lastName()[0] || ''}`.toUpperCase()
  );
}
```

## Effects

Effects run side-effects when signals change:

```typescript
import { Component, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-data-fetcher',
  standalone: true,
  template: `
    <div>
      <input [(ngModel)]="userId" type="number" placeholder="User ID">
      <div *ngIf="loading()">Loading...</div>
      <div *ngIf="userData()">
        <h3>{{ userData()?.name }}</h3>
        <p>{{ userData()?.email }}</p>
      </div>
    </div>
  `
})
export class DataFetcherComponent {
  userId = signal(1);
  userData = signal<any>(null);
  loading = signal(false);
  
  constructor(private http: HttpClient) {
    // Effect runs whenever userId changes
    effect(() => {
      const id = this.userId();
      if (id > 0) {
        this.loadUser(id);
      }
    });
  }
  
  private async loadUser(id: number): Promise<void> {
    this.loading.set(true);
    try {
      const user = await this.http.get(`/api/users/${id}`).toPromise();
      this.userData.set(user);
    } catch (error) {
      console.error('Failed to load user:', error);
      this.userData.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
```

## Signal Patterns

### State Management

```typescript
interface TodoState {
  items: Todo[];
  filter: 'all' | 'active' | 'completed';
}

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private state = signal<TodoState>({
    items: [],
    filter: 'all'
  });
  
  // Expose read-only computed values
  readonly todos = computed(() => this.state().items);
  readonly filter = computed(() => this.state().filter);
  readonly activeTodos = computed(() => 
    this.todos().filter(todo => !todo.completed)
  );
  readonly completedTodos = computed(() => 
    this.todos().filter(todo => todo.completed)
  );
  
  addTodo(text: string): void {
    this.state.update(state => ({
      ...state,
      items: [...state.items, { id: Date.now(), text, completed: false }]
    }));
  }
  
  toggleTodo(id: number): void {
    this.state.update(state => ({
      ...state,
      items: state.items.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    }));
  }
  
  setFilter(filter: 'all' | 'active' | 'completed'): void {
    this.state.update(state => ({ ...state, filter }));
  }
}
```

### Form Integration

```typescript
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-reactive-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form>
      <input [formControl]="emailControl" placeholder="Email">
      <p>Email: {{ email() }}</p>
      <p>Valid: {{ isValid() }}</p>
      <p>Status: {{ status() }}</p>
    </form>
  `
})
export class ReactiveFormComponent {
  emailControl = new FormControl('');
  
  // Convert form control to signal
  email = signal('');
  isValid = signal(false);
  status = signal('');
  
  constructor() {
    // Update signals when form control changes
    effect(() => {
      this.emailControl.valueChanges.subscribe(value => {
        this.email.set(value || '');
        this.isValid.set(this.emailControl.valid);
        this.status.set(this.emailControl.status);
      });
    });
  }
}
```

## Best Practices

### Signal Naming

```typescript
// Good: Use descriptive names
const userProfile = signal<UserProfile | null>(null);
const isLoading = signal(false);
const searchResults = signal<SearchResult[]>([]);

// Avoid: Generic or unclear names
const data = signal(null);
const flag = signal(false);
const list = signal([]);
```

### Computed Signal Optimization

```typescript
// Good: Keep computations simple and focused
const fullName = computed(() => 
  `${this.firstName()} ${this.lastName()}`.trim()
);

const userSummary = computed(() => ({
  name: this.fullName(),
  email: this.email(),
  joinDate: this.joinDate()
}));

// Avoid: Complex computations in computed signals
const complexCalculation = computed(() => {
  // Avoid heavy computations or side effects
  return heavyProcessing(this.data());
});
```

### Effect Usage

```typescript
// Good: Use effects for side effects only
effect(() => {
  const theme = this.userPreferences().theme;
  document.body.className = `theme-${theme}`;
});

effect(() => {
  const userId = this.currentUserId();
  if (userId) {
    this.analytics.trackUser(userId);
  }
});

// Avoid: Using effects for derived state
// Use computed signals instead
```

## Migration from Observables

### Before (RxJS)

```typescript
export class UserComponent {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();
  
  isLoggedIn$ = this.user$.pipe(
    map(user => !!user)
  );
  
  setUser(user: User): void {
    this.userSubject.next(user);
  }
}
```

### After (Signals)

```typescript
export class UserComponent {
  user = signal<User | null>(null);
  
  isLoggedIn = computed(() => !!this.user());
  
  setUser(user: User): void {
    this.user.set(user);
  }
}
```

## When to Use Signals

### ✅ Good Use Cases
- Component state management
- Derived values and calculations
- Form state tracking
- Theme and preference management
- Simple reactive patterns

### ⚠️ Consider Alternatives
- Complex async operations (use RxJS)
- HTTP requests (use RxJS)
- WebSocket streams (use RxJS)
- Complex event handling (use RxJS)

## Next Steps

- Learn about [Change Detection Strategies](../advanced/change-detection-strategies)
- Explore [Component Communication](component-communication) with signals
- Discover [State Management Patterns](state-management-patterns) using signals

---

**Key Takeaways:**
- Signals provide a reactive way to manage state
- Use `signal()` for mutable state, `computed()` for derived values
- Effects handle side effects when signals change
- Signals offer better performance than traditional change detection
- They integrate well with Angular's modern standalone architecture