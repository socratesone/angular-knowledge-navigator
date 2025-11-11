---
title: "Signals and Modern Reactivity Model (Angular 17+)"
slug: "signals-and-modern-reactivity-model-angular-17"
category: "Expert"
skillLevel: "expert"
difficulty: 5
estimatedReadingTime: 45
constitutional: true
tags: ["expert", "signals", "reactivity", "angular-17", "state-management", "performance"]
prerequisites: ["change-detection-strategy-default-vs-onpush", "reactive-state-management-rxjs-componentstore-ngrx-introduction", "optimizing-change-detection-and-performance"]
relatedTopics: ["defining-and-enforcing-architectural-conventions-constitutional-compliance", "performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction", "application-architecture-and-module-boundaries"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/expert/signals-and-modern-reactivity-model-angular-17.md"
---

# Signals and Modern Reactivity Model (Angular 17+)

## Learning Objectives
- Master Angular's new Signals-based reactivity system
- Implement signal-driven state management patterns
- Optimize performance with computed signals and effects
- Apply constitutional signal patterns throughout applications
- Understand the future of Angular's reactivity without Zone.js

## Overview
Angular Signals represent a fundamental shift toward a modern, performant reactivity model. They provide fine-grained reactivity, better performance than traditional change detection, and a path toward Zone.js-free Angular applications.

## Key Concepts

### Fundamental Signal Types
```typescript
@Component({
  selector: 'app-signal-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>Count: {{ count() }}</div>
    <div>Double: {{ doubleCount() }}</div>
    <div>Status: {{ status() }}</div>
    <button (click)="increment()">Increment</button>
    <button (click)="reset()">Reset</button>
  `
})
export class SignalDemoComponent {
  // Writable signal
  count = signal(0);
  
  // Computed signal (derived state)
  doubleCount = computed(() => this.count() * 2);
  
  // Signal with complex state
  status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // User data signal
  userData = signal<User | null>(null);
  
  // Complex computed with multiple dependencies
  userDisplayName = computed(() => {
    const user = this.userData();
    return user ? `${user.firstName} ${user.lastName}` : 'Guest';
  });
  
  increment(): void {
    // Signal updates are synchronous and batched
    this.count.update(current => current + 1);
  }
  
  reset(): void {
    this.count.set(0);
    this.status.set('idle');
  }
}
```

### Advanced Signal Patterns
```typescript
// Signal-based service for state management
@Injectable({ providedIn: 'root' })
export class UserStateService {
  // Private writable signals
  private _users = signal<User[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  
  // Public readonly signals
  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Computed signals for derived state
  readonly userCount = computed(() => this._users().length);
  readonly activeUsers = computed(() => 
    this._users().filter(user => user.isActive)
  );
  readonly hasUsers = computed(() => this._users().length > 0);
  
  // Effects for side effects
  constructor() {
    // Effect runs when users change
    effect(() => {
      const users = this._users();
      if (users.length > 0) {
        this.logUserActivity(`Loaded ${users.length} users`);
      }
    });
  }
  
  loadUsers(): void {
    this._loading.set(true);
    this._error.set(null);
    
    this.userService.getUsers().subscribe({
      next: users => {
        this._users.set(users);
        this._loading.set(false);
      },
      error: error => {
        this._error.set(error.message);
        this._loading.set(false);
      }
    });
  }
  
  addUser(user: User): void {
    this._users.update(current => [...current, user]);
  }
  
  updateUser(id: string, updates: Partial<User>): void {
    this._users.update(current =>
      current.map(user =>
        user.id === id ? { ...user, ...updates } : user
      )
    );
  }
  
  private logUserActivity(message: string): void {
    console.log(`UserStateService: ${message}`);
  }
}
```

## Constitutional Alignment
Signals are the pinnacle of constitutional Angular practices:
- **Performance First**: Fine-grained reactivity without Zone.js overhead
- **Immutable Patterns**: Signals encourage immutable state updates
- **Type Safety**: Full TypeScript integration with signal types
- **Declarative Programming**: Computed signals express derived state declaratively
- **Future-Proof**: Angular's recommended reactivity model going forward

### Effects and Side Effect Management
```typescript
@Component({
  selector: 'app-effect-demo',
  standalone: true
})
export class EffectDemoComponent implements OnDestroy {
  searchTerm = signal('');
  results = signal<SearchResult[]>([]);
  
  private searchService = inject(SearchService);
  private destroyRef = inject(DestroyRef);
  
  constructor() {
    // Effect for reactive search
    effect(() => {
      const term = this.searchTerm();
      
      if (term.length >= 3) {
        this.performSearch(term);
      } else {
        this.results.set([]);
      }
    });
    
    // Effect with cleanup
    const logEffect = effect((onCleanup) => {
      console.log('Search term:', this.searchTerm());
      
      onCleanup(() => {
        console.log('Cleaning up effect');
      });
    });
    
    // Register effect cleanup
    this.destroyRef.onDestroy(() => {
      logEffect.destroy();
    });
  }
  
  private performSearch(term: string): void {
    this.searchService.search(term).subscribe(results => {
      this.results.set(results);
    });
  }
  
  updateSearchTerm(term: string): void {
    this.searchTerm.set(term);
  }
}
```

### Signal-Based Form Handling
```typescript
@Component({
  selector: 'app-signal-form',
  standalone: true,
  template: `
    <form>
      <input 
        [value]="formData().email" 
        (input)="updateEmail($event)"
        [class.invalid]="!isEmailValid()">
      
      <input 
        [value]="formData().name" 
        (input)="updateName($event)">
      
      <button 
        [disabled]="!isFormValid()" 
        (click)="submit()">
        Submit
      </button>
    </form>
    
    <div *ngIf="!isFormValid()">
      Form has {{ validationErrors().length }} errors
    </div>
  `
})
export class SignalFormComponent {
  // Form state as signal
  formData = signal({
    email: '',
    name: '',
    age: 0
  });
  
  // Computed validation
  isEmailValid = computed(() => {
    const email = this.formData().email;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  });
  
  isNameValid = computed(() => {
    return this.formData().name.length >= 2;
  });
  
  isFormValid = computed(() => {
    return this.isEmailValid() && this.isNameValid();
  });
  
  validationErrors = computed(() => {
    const errors: string[] = [];
    if (!this.isEmailValid()) errors.push('Invalid email');
    if (!this.isNameValid()) errors.push('Name too short');
    return errors;
  });
  
  updateEmail(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formData.update(current => ({
      ...current,
      email: target.value
    }));
  }
  
  updateName(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.formData.update(current => ({
      ...current,
      name: target.value
    }));
  }
  
  submit(): void {
    if (this.isFormValid()) {
      console.log('Submitting:', this.formData());
    }
  }
}
```

## Real-World Applications
- **State Management**: Replacing complex state management libraries
- **Performance Optimization**: Fine-grained updates without Zone.js
- **Real-time Applications**: Reactive data synchronization
- **Complex Forms**: Derived validation and computed fields
- **Dashboard Applications**: Reactive metrics and data visualization

### Migration from RxJS to Signals
```typescript
// Before: RxJS-based service
@Injectable({ providedIn: 'root' })
export class RxJSUserService {
  private usersSubject = new BehaviorSubject<User[]>([]);
  users$ = this.usersSubject.asObservable();
  
  addUser(user: User): void {
    const current = this.usersSubject.value;
    this.usersSubject.next([...current, user]);
  }
}

// After: Signal-based service
@Injectable({ providedIn: 'root' })
export class SignalUserService {
  private _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();
  
  addUser(user: User): void {
    this._users.update(current => [...current, user]);
  }
}
```

## Performance Benefits
- **Fine-grained Updates**: Only affected components re-render
- **No Zone.js Overhead**: Direct reactivity without monkey-patching
- **Synchronous Updates**: Predictable update timing
- **Memory Efficiency**: Reduced memory usage compared to observables
- **Bundle Size**: Smaller applications without Zone.js dependency

## Testing Signal-Based Components
```typescript
describe('SignalDemoComponent', () => {
  let component: SignalDemoComponent;
  let fixture: ComponentFixture<SignalDemoComponent>;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SignalDemoComponent]
    });
    
    fixture = TestBed.createComponent(SignalDemoComponent);
    component = fixture.componentInstance;
  });
  
  it('should update computed values when signal changes', () => {
    // Test signal reactivity
    component.count.set(5);
    expect(component.doubleCount()).toBe(10);
  });
  
  it('should trigger effects when signals change', () => {
    spyOn(console, 'log');
    component.count.set(10);
    // Test that effects run
  });
});
```

## Assessment Questions
1. How do signals differ from observables in terms of performance and usage?
2. What are the key benefits of computed signals over manual calculations?
3. How do effects work and when should you use them?
4. What is the migration path from Zone.js-based change detection to signals?

## Next Steps
[[defining-and-enforcing-architectural-conventions-constitutional-compliance]], [[performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction]], [[application-architecture-and-module-boundaries]]

## Expansion Guidance for LLMs
When expanding this content, include comprehensive signal patterns, performance benchmarks compared to traditional change detection, advanced effect patterns, integration with existing Angular features, migration strategies, testing approaches, and real-world case studies showing signal adoption in large applications.