# Change Detection Strategies

## Overview

Change detection is Angular's mechanism for keeping the view in sync with the application state. Understanding how change detection works and optimizing it is crucial for building performant Angular applications, especially as they grow in complexity.

## How Change Detection Works

### Default Change Detection

By default, Angular uses Zone.js to detect when something might have changed:

```typescript
@Component({
  selector: 'app-default',
  standalone: true,
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <button (click)="increment()">Increment</button>
      <p>Last updated: {{ lastUpdated | date:'medium' }}</p>
    </div>
  `
})
export class DefaultComponent {
  count = 0;
  lastUpdated = new Date();
  
  increment(): void {
    this.count++;  // Triggers change detection
    this.lastUpdated = new Date();
  }
}
```

### Change Detection Cycle

When Angular detects a change, it:
1. Runs change detection on the root component
2. Checks all bindings in the template
3. Recursively checks all child components
4. Updates the DOM if any values changed

## OnPush Change Detection Strategy

### The Problem with Default Strategy

```typescript
// This component re-renders even when data hasn't changed
@Component({
  selector: 'app-user-list',
  standalone: true,
  template: `
    <div>
      <h2>Users ({{ users.length }})</h2>
      <div *ngFor="let user of users; trackBy: trackByUserId">
        {{ user.name }} - {{ user.email }}
      </div>
      <p>Checked at: {{ getCurrentTime() }}</p>
    </div>
  `
})
export class UserListComponent {
  @Input() users: User[] = [];
  
  // This method runs on every change detection cycle!
  getCurrentTime(): string {
    console.log('getCurrentTime() called - expensive operation!');
    return new Date().toLocaleTimeString();
  }
  
  trackByUserId(index: number, user: User): number {
    return user.id;
  }
}
```

### OnPush Solution

```typescript
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-optimized-user-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h2>Users ({{ users.length }})</h2>
      <div *ngFor="let user of users; trackBy: trackByUserId">
        {{ user.name }} - {{ user.email }}
      </div>
      <p>Last checked: {{ lastChecked }}</p>
    </div>
  `
})
export class OptimizedUserListComponent implements OnInit {
  @Input() users: User[] = [];
  lastChecked = '';
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  ngOnInit(): void {
    this.lastChecked = new Date().toLocaleTimeString();
  }
  
  trackByUserId(index: number, user: User): number {
    return user.id;
  }
}
```

## When OnPush Components Update

OnPush components only update when:

1. **Input reference changes**
2. **Event occurs** (click, keyup, etc.)
3. **Observable emits** (with async pipe)
4. **Manual trigger** (ChangeDetectorRef.detectChanges())

### Input Reference Changes

```typescript
// Parent Component
@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [OptimizedUserListComponent],
  template: `
    <div>
      <button (click)="addUser()">Add User</button>
      <button (click)="updateFirstUser()">Update First User</button>
      <app-optimized-user-list [users]="users"></app-optimized-user-list>
    </div>
  `
})
export class ParentComponent {
  users: User[] = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' }
  ];
  
  addUser(): void {
    // ✅ Creates new array reference - OnPush component will update
    this.users = [
      ...this.users,
      { id: Date.now(), name: 'New User', email: 'new@example.com' }
    ];
  }
  
  updateFirstUser(): void {
    // ✅ Creates new array reference - OnPush component will update
    this.users = this.users.map((user, index) => 
      index === 0 
        ? { ...user, name: 'Updated ' + user.name }
        : user
    );
  }
  
  // ❌ This would NOT trigger OnPush update:
  // badUpdate(): void {
  //   this.users[0].name = 'Modified';  // Same reference
  // }
}
```

## Manual Change Detection

### Using ChangeDetectorRef

```typescript
import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-manual-detection',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p>Timer: {{ seconds }}</p>
      <button (click)="startTimer()">Start Timer</button>
      <button (click)="stopTimer()">Stop Timer</button>
    </div>
  `
})
export class ManualDetectionComponent implements OnDestroy {
  seconds = 0;
  private timer?: number;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  startTimer(): void {
    this.timer = window.setInterval(() => {
      this.seconds++;
      // Manually trigger change detection
      this.cdr.detectChanges();
    }, 1000);
  }
  
  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
  
  ngOnDestroy(): void {
    this.stopTimer();
  }
}
```

### Detaching and Reattaching

```typescript
@Component({
  selector: 'app-controlled-detection',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p>Status: {{ status }}</p>
      <p>Counter: {{ counter }}</p>
      <button (click)="pauseDetection()">Pause</button>
      <button (click)="resumeDetection()">Resume</button>
      <button (click)="increment()">Increment</button>
    </div>
  `
})
export class ControlledDetectionComponent {
  status = 'Active';
  counter = 0;
  
  constructor(private cdr: ChangeDetectorRef) {}
  
  pauseDetection(): void {
    this.cdr.detach();
    this.status = 'Paused';
  }
  
  resumeDetection(): void {
    this.cdr.reattach();
    this.status = 'Active';
    this.cdr.detectChanges(); // Trigger immediate check
  }
  
  increment(): void {
    this.counter++;
    // Won't update view if detached
  }
}
```

## OnPush with Observables

### Async Pipe Integration

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Observable, interval, map } from 'rxjs';

@Component({
  selector: 'app-observable-onpush',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h3>Real-time Data</h3>
      <p>Current Time: {{ currentTime$ | async | date:'medium' }}</p>
      <p>Random Number: {{ randomNumber$ | async }}</p>
      
      <h3>User Data</h3>
      <div *ngIf="user$ | async as user">
        <p>Name: {{ user.name }}</p>
        <p>Email: {{ user.email }}</p>
        <p>Status: {{ user.online ? 'Online' : 'Offline' }}</p>
      </div>
    </div>
  `
})
export class ObservableOnPushComponent implements OnInit {
  currentTime$!: Observable<Date>;
  randomNumber$!: Observable<number>;
  user$!: Observable<User>;
  
  constructor(private userService: UserService) {}
  
  ngOnInit(): void {
    // Async pipe automatically triggers OnPush updates
    this.currentTime$ = interval(1000).pipe(
      map(() => new Date())
    );
    
    this.randomNumber$ = interval(2000).pipe(
      map(() => Math.floor(Math.random() * 1000))
    );
    
    this.user$ = this.userService.getCurrentUser();
  }
}
```

## OnPush with Signals

### Modern Approach with Signals

```typescript
import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';

@Component({
  selector: 'app-signal-onpush',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h3>Counter: {{ count() }}</h3>
      <p>Double: {{ doubleCount() }}</p>
      <p>Status: {{ status() }}</p>
      
      <button (click)="increment()">+</button>
      <button (click)="decrement()">-</button>
      <button (click)="reset()">Reset</button>
    </div>
  `
})
export class SignalOnPushComponent {
  // Signals work perfectly with OnPush!
  count = signal(0);
  
  doubleCount = computed(() => this.count() * 2);
  
  status = computed(() => {
    const value = this.count();
    if (value === 0) return 'Zero';
    if (value > 0) return 'Positive';
    return 'Negative';
  });
  
  increment(): void {
    this.count.update(n => n + 1);
  }
  
  decrement(): void {
    this.count.update(n => n - 1);
  }
  
  reset(): void {
    this.count.set(0);
  }
}
```

## Complex OnPush Patterns

### State Management with OnPush

```typescript
interface AppState {
  users: User[];
  selectedUserId: number | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class StateService {
  private state = signal<AppState>({
    users: [],
    selectedUserId: null,
    loading: false,
    error: null
  });
  
  // Computed selectors
  readonly users = computed(() => this.state().users);
  readonly selectedUser = computed(() => {
    const state = this.state();
    return state.users.find(user => user.id === state.selectedUserId) || null;
  });
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  
  setUsers(users: User[]): void {
    this.state.update(current => ({ ...current, users }));
  }
  
  selectUser(userId: number): void {
    this.state.update(current => ({ ...current, selectedUserId: userId }));
  }
  
  setLoading(loading: boolean): void {
    this.state.update(current => ({ ...current, loading }));
  }
}

@Component({
  selector: 'app-state-consumer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div *ngIf="loading()">Loading...</div>
      <div *ngIf="error()" class="error">{{ error() }}</div>
      
      <div class="user-list">
        <div 
          *ngFor="let user of users(); trackBy: trackByUserId"
          class="user-item"
          [class.selected]="user.id === selectedUser()?.id"
          (click)="selectUser(user.id)">
          {{ user.name }}
        </div>
      </div>
      
      <div *ngIf="selectedUser() as user" class="user-details">
        <h3>{{ user.name }}</h3>
        <p>{{ user.email }}</p>
      </div>
    </div>
  `
})
export class StateConsumerComponent {
  constructor(private stateService: StateService) {}
  
  // Expose signals from service
  users = this.stateService.users;
  selectedUser = this.stateService.selectedUser;
  loading = this.stateService.loading;
  error = this.stateService.error;
  
  selectUser(userId: number): void {
    this.stateService.selectUser(userId);
  }
  
  trackByUserId(index: number, user: User): number {
    return user.id;
  }
}
```

## Performance Optimization

### TrackBy Functions

```typescript
@Component({
  selector: 'app-optimized-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <!-- ✅ With trackBy - only changed items re-render -->
      <div *ngFor="let item of items; trackBy: trackByItemId">
        <expensive-item-component [item]="item"></expensive-item-component>
      </div>
      
      <!-- ❌ Without trackBy - all items re-render on change -->
      <!-- <div *ngFor="let item of items"> -->
    </div>
  `
})
export class OptimizedListComponent {
  @Input() items: Item[] = [];
  
  trackByItemId(index: number, item: Item): number {
    return item.id;  // Use unique identifier
  }
  
  // For complex objects
  trackByComplexItem(index: number, item: ComplexItem): string {
    return `${item.id}-${item.version}-${item.lastModified}`;
  }
}
```

### Pure Pipes

```typescript
// Pure pipe for expensive calculations
@Pipe({
  name: 'expensiveCalculation',
  pure: true,  // Default - only recalculates when input changes
  standalone: true
})
export class ExpensiveCalculationPipe implements PipeTransform {
  transform(data: number[]): number {
    console.log('Expensive calculation running');
    return data.reduce((sum, val) => sum + Math.pow(val, 2), 0);
  }
}

// Usage in OnPush component
@Component({
  selector: 'app-pipe-demo',
  standalone: true,
  imports: [ExpensiveCalculationPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p>Result: {{ numbers | expensiveCalculation }}</p>
      <button (click)="addNumber()">Add Number</button>
    </div>
  `
})
export class PipeDemoComponent {
  numbers = signal([1, 2, 3, 4, 5]);
  
  addNumber(): void {
    this.numbers.update(current => [...current, Math.random()]);
  }
}
```

## Common Pitfalls and Solutions

### Pitfall 1: Mutating Objects

```typescript
// ❌ DON'T: Mutating objects won't trigger OnPush
updateUserBad(userId: number, name: string): void {
  const user = this.users.find(u => u.id === userId);
  if (user) {
    user.name = name;  // Mutation won't trigger update
  }
}

// ✅ DO: Create new references
updateUserGood(userId: number, name: string): void {
  this.users = this.users.map(user =>
    user.id === userId
      ? { ...user, name }  // New object reference
      : user
  );
}
```

### Pitfall 2: Async Operations Without Proper Handling

```typescript
// ❌ DON'T: Component won't update
async loadDataBad(): Promise<void> {
  this.loading = true;
  this.users = await this.userService.getUsers();
  this.loading = false;  // Component won't update
}

// ✅ DO: Use signals or manual detection
async loadDataGood(): Promise<void> {
  this.loading.set(true);
  const users = await this.userService.getUsers();
  this.users.set(users);
  this.loading.set(false);  // Signals trigger updates
}

// ✅ Alternative: Manual change detection
async loadDataManual(): Promise<void> {
  this.loading = true;
  this.users = await this.userService.getUsers();
  this.loading = false;
  this.cdr.detectChanges();  // Manually trigger
}
```

## Best Practices

### When to Use OnPush

✅ **Always use OnPush when:**
- Working with immutable data
- Using reactive patterns (Observables, Signals)
- Building reusable components
- Performance is important

⚠️ **Be careful with OnPush when:**
- Working with mutable data structures
- Using third-party libraries that mutate objects
- Team is not familiar with immutability concepts

### OnPush Checklist

```typescript
@Component({
  selector: 'app-best-practices',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<!-- template -->`
})
export class BestPracticesComponent {
  // ✅ Use signals for reactive state
  data = signal(initialData);
  
  // ✅ Use computed for derived values
  filteredData = computed(() => 
    this.data().filter(item => item.active)
  );
  
  // ✅ Use readonly for external signals
  @Input() readonly config = signal(defaultConfig);
  
  // ✅ Implement trackBy for ngFor
  trackById = (index: number, item: any) => item.id;
  
  // ✅ Use immutable updates
  updateItem(id: number, changes: Partial<Item>): void {
    this.data.update(items =>
      items.map(item =>
        item.id === id ? { ...item, ...changes } : item
      )
    );
  }
}
```

## Next Steps

- Learn about [Performance Optimization](performance-optimization)
- Explore [Advanced RxJS Patterns](advanced-rxjs-patterns)
- Discover [Angular Universal (SSR)](angular-universal-ssr)

---

**Key Takeaways:**
- OnPush strategy dramatically improves performance
- OnPush components only update on input reference changes, events, or async pipe emissions
- Signals work perfectly with OnPush change detection
- Always use immutable data patterns with OnPush
- Use trackBy functions with ngFor for optimal list rendering
- Manual change detection is sometimes necessary for async operations