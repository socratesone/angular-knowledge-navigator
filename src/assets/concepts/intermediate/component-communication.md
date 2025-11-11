# Component Communication

## Overview

Component communication is essential for building complex Angular applications. Components need to share data, notify each other of events, and coordinate their behavior. Angular provides several patterns for component communication.

## Parent to Child Communication

### Using @Input Properties

The most common way to pass data from parent to child:

```typescript
// Child Component
import { Component, Input } from '@angular/core';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-user-card',
  standalone: true,
  template: `
    <div class="user-card">
      <h3>{{ user.name }}</h3>
      <p>{{ user.email }}</p>
      <span class="role">{{ user.role }}</span>
      <div *ngIf="showActions">
        <button>Edit</button>
        <button>Delete</button>
      </div>
    </div>
  `,
  styles: [`
    .user-card {
      border: 1px solid #ddd;
      padding: 16px;
      margin: 8px;
      border-radius: 8px;
    }
    .role {
      background: #e3f2fd;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
  `]
})
export class UserCardComponent {
  @Input() user!: User;
  @Input() showActions = false;
}
```

```typescript
// Parent Component
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserCardComponent],
  template: `
    <div class="user-list">
      <h2>Team Members</h2>
      <app-user-card 
        *ngFor="let user of users"
        [user]="user"
        [showActions]="currentUser.role === 'admin'">
      </app-user-card>
    </div>
  `
})
export class UserListComponent {
  currentUser = { role: 'admin' };
  users: User[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Developer' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Designer' }
  ];
}
```

### Input Validation and Transformation

```typescript
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  template: `
    <div class="progress-container">
      <div 
        class="progress-bar" 
        [style.width.%]="normalizedProgress">
      </div>
      <span class="progress-text">{{ normalizedProgress }}%</span>
    </div>
  `
})
export class ProgressBarComponent {
  private _progress = 0;
  
  @Input()
  set progress(value: number) {
    // Validate and normalize input
    this._progress = Math.max(0, Math.min(100, value || 0));
  }
  
  get progress(): number {
    return this._progress;
  }
  
  get normalizedProgress(): number {
    return Math.round(this._progress);
  }
}
```

## Child to Parent Communication

### Using @Output and EventEmitter

```typescript
// Child Component
import { Component, Input, Output, EventEmitter } from '@angular/core';

export interface DeleteEvent {
  userId: number;
  confirmed: boolean;
}

@Component({
  selector: 'app-delete-confirmation',
  standalone: true,
  template: `
    <div class="confirmation-dialog" *ngIf="visible">
      <h3>Confirm Deletion</h3>
      <p>Are you sure you want to delete {{ userName }}?</p>
      <div class="actions">
        <button (click)="onConfirm()" class="danger">Delete</button>
        <button (click)="onCancel()">Cancel</button>
      </div>
    </div>
  `
})
export class DeleteConfirmationComponent {
  @Input() visible = false;
  @Input() userId!: number;
  @Input() userName!: string;
  
  @Output() deleteConfirmed = new EventEmitter<DeleteEvent>();
  @Output() deleteCancelled = new EventEmitter<void>();
  
  onConfirm(): void {
    this.deleteConfirmed.emit({
      userId: this.userId,
      confirmed: true
    });
  }
  
  onCancel(): void {
    this.deleteCancelled.emit();
  }
}
```

```typescript
// Parent Component
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, UserCardComponent, DeleteConfirmationComponent],
  template: `
    <div>
      <app-user-card
        *ngFor="let user of users"
        [user]="user"
        (deleteRequested)="showDeleteConfirmation($event)">
      </app-user-card>
      
      <app-delete-confirmation
        [visible]="showConfirmation"
        [userId]="selectedUser?.id"
        [userName]="selectedUser?.name"
        (deleteConfirmed)="onDeleteConfirmed($event)"
        (deleteCancelled)="hideDeleteConfirmation()">
      </app-delete-confirmation>
    </div>
  `
})
export class UserManagementComponent {
  users: User[] = [];
  showConfirmation = false;
  selectedUser: User | null = null;
  
  showDeleteConfirmation(user: User): void {
    this.selectedUser = user;
    this.showConfirmation = true;
  }
  
  onDeleteConfirmed(event: DeleteEvent): void {
    this.users = this.users.filter(user => user.id !== event.userId);
    this.hideDeleteConfirmation();
  }
  
  hideDeleteConfirmation(): void {
    this.showConfirmation = false;
    this.selectedUser = null;
  }
}
```

## Service-Based Communication

### Shared Service for Sibling Communication

```typescript
// Shared Service
import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = signal<Notification[]>([]);
  
  // Read-only access to notifications
  readonly allNotifications = this.notifications.asReadonly();
  
  addNotification(type: Notification['type'], message: string): void {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date()
    };
    
    this.notifications.update(current => [...current, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }
  
  removeNotification(id: string): void {
    this.notifications.update(current => 
      current.filter(notification => notification.id !== id)
    );
  }
  
  clearAll(): void {
    this.notifications.set([]);
  }
}
```

```typescript
// Component that sends notifications
@Component({
  selector: 'app-user-form',
  standalone: true,
  template: `
    <form (ngSubmit)="onSubmit()">
      <input [(ngModel)]="userName" placeholder="User Name" required>
      <button type="submit">Save User</button>
    </form>
  `
})
export class UserFormComponent {
  userName = '';
  
  constructor(private notificationService: NotificationService) {}
  
  onSubmit(): void {
    if (this.userName.trim()) {
      // Simulate save operation
      setTimeout(() => {
        this.notificationService.addNotification(
          'success', 
          `User "${this.userName}" saved successfully!`
        );
        this.userName = '';
      }, 1000);
    } else {
      this.notificationService.addNotification(
        'error', 
        'Please enter a valid user name'
      );
    }
  }
}
```

```typescript
// Component that displays notifications
@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-center">
      <div 
        *ngFor="let notification of notifications()"
        class="notification"
        [ngClass]="'notification-' + notification.type">
        <span>{{ notification.message }}</span>
        <button (click)="remove(notification.id)">×</button>
      </div>
    </div>
  `
})
export class NotificationCenterComponent {
  constructor(private notificationService: NotificationService) {}
  
  notifications = this.notificationService.allNotifications;
  
  remove(id: string): void {
    this.notificationService.removeNotification(id);
  }
}
```

## ViewChild and ViewChildren

### Accessing Child Components

```typescript
import { Component, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-parent',
  standalone: true,
  imports: [UserFormComponent],
  template: `
    <div>
      <button (click)="focusForm()">Focus Form</button>
      <button (click)="resetForm()">Reset Form</button>
      <app-user-form #userForm></app-user-form>
    </div>
  `
})
export class ParentComponent implements AfterViewInit {
  @ViewChild('userForm') userFormComponent!: UserFormComponent;
  
  ngAfterViewInit(): void {
    // Child component is now available
    console.log('Form component loaded:', this.userFormComponent);
  }
  
  focusForm(): void {
    this.userFormComponent.focus();
  }
  
  resetForm(): void {
    this.userFormComponent.reset();
  }
}
```

### Accessing Multiple Child Components

```typescript
import { Component, ViewChildren, QueryList, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-card-list',
  standalone: true,
  imports: [CommonModule, UserCardComponent],
  template: `
    <div>
      <button (click)="selectAll()">Select All</button>
      <button (click)="deselectAll()">Deselect All</button>
      
      <app-user-card
        *ngFor="let user of users"
        [user]="user">
      </app-user-card>
    </div>
  `
})
export class CardListComponent implements AfterViewInit {
  @ViewChildren(UserCardComponent) cardComponents!: QueryList<UserCardComponent>;
  
  users: User[] = [];
  
  ngAfterViewInit(): void {
    // Listen for changes in child components
    this.cardComponents.changes.subscribe(() => {
      console.log('Card components changed:', this.cardComponents.length);
    });
  }
  
  selectAll(): void {
    this.cardComponents.forEach(card => card.select());
  }
  
  deselectAll(): void {
    this.cardComponents.forEach(card => card.deselect());
  }
}
```

## Template Reference Variables

### Direct Template Access

```typescript
@Component({
  selector: 'app-search',
  standalone: true,
  template: `
    <div>
      <input #searchInput 
             (keyup)="onSearch(searchInput.value)"
             placeholder="Search users...">
      <button (click)="clearSearch(searchInput)">Clear</button>
      
      <div *ngFor="let result of searchResults">
        {{ result.name }}
      </div>
    </div>
  `
})
export class SearchComponent {
  searchResults: User[] = [];
  
  onSearch(query: string): void {
    // Perform search
    this.searchResults = this.performSearch(query);
  }
  
  clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.searchResults = [];
    input.focus();
  }
  
  private performSearch(query: string): User[] {
    // Search implementation
    return [];
  }
}
```

## Advanced Patterns

### Signal-Based Communication

```typescript
// Modern approach using signals
@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private currentUser = signal<User | null>(null);
  private theme = signal<'light' | 'dark'>('light');
  
  // Read-only computed values
  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly currentTheme = this.theme.asReadonly();
  
  login(user: User): void {
    this.currentUser.set(user);
  }
  
  logout(): void {
    this.currentUser.set(null);
  }
  
  toggleTheme(): void {
    this.theme.update(current => current === 'light' ? 'dark' : 'light');
  }
}
```

### Content Projection

```typescript
// Container component with projection
@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <div class="card">
      <div class="card-header">
        <ng-content select="[slot=header]"></ng-content>
      </div>
      <div class="card-body">
        <ng-content></ng-content>
      </div>
      <div class="card-footer" *ngIf="hasFooter">
        <ng-content select="[slot=footer]"></ng-content>
      </div>
    </div>
  `
})
export class CardComponent {
  @Input() hasFooter = false;
}
```

```html
<!-- Usage with content projection -->
<app-card [hasFooter]="true">
  <h3 slot="header">User Profile</h3>
  
  <p>User details go here...</p>
  <p>More content...</p>
  
  <div slot="footer">
    <button>Save</button>
    <button>Cancel</button>
  </div>
</app-card>
```

## Best Practices

### Communication Strategy

1. **Parent → Child**: Use `@Input` properties
2. **Child → Parent**: Use `@Output` events
3. **Sibling Components**: Use shared services
4. **Deep Nesting**: Use services or state management
5. **One-way Data Flow**: Prefer unidirectional data flow

### Performance Considerations

```typescript
// Use OnPush with signal-based communication
@Component({
  selector: 'app-optimized',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>{{ data() }}</div>
  `
})
export class OptimizedComponent {
  // Signals work perfectly with OnPush
  data = signal('Initial value');
}
```

### Type Safety

```typescript
// Use interfaces for complex data
export interface UserUpdatedEvent {
  userId: number;
  changes: Partial<User>;
  timestamp: Date;
}

@Component({
  // ...
  template: `<button (click)="updateUser()">Update</button>`
})
export class UserComponent {
  @Output() userUpdated = new EventEmitter<UserUpdatedEvent>();
  
  updateUser(): void {
    this.userUpdated.emit({
      userId: this.user.id,
      changes: { name: 'Updated Name' },
      timestamp: new Date()
    });
  }
}
```

## Next Steps

- Learn about [State Management Patterns](state-management-patterns)
- Explore [Advanced RxJS Patterns](../advanced/advanced-rxjs-patterns)
- Discover [Change Detection Strategies](../advanced/change-detection-strategies)

---

**Key Takeaways:**
- Use `@Input` for parent-to-child communication
- Use `@Output` and `EventEmitter` for child-to-parent communication
- Services enable communication between any components
- ViewChild provides direct access to child components
- Signals offer modern, reactive communication patterns
- Always consider performance implications of communication patterns