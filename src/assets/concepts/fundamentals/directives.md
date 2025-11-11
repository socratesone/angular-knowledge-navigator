# Directives

## Overview

Directives are classes that add additional behavior to elements in your Angular templates. There are three kinds of directives in Angular: Components (directives with templates), Attribute directives (change the appearance or behavior of an element), and Structural directives (change the DOM layout by adding and removing DOM elements).

## Built-in Attribute Directives

### NgClass

Dynamically add or remove CSS classes:

```typescript
@Component({
  selector: 'app-status-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="statusClasses">
      Status: {{ status }}
    </div>
    
    <!-- Multiple ways to use ngClass -->
    <div [ngClass]="{ 
      'active': isActive, 
      'disabled': !isEnabled,
      'highlighted': isHighlighted 
    }">
      Conditional Classes
    </div>
    
    <div [ngClass]="['base-class', dynamicClass, conditionalClass]">
      Array Syntax
    </div>
  `,
  styles: [`
    .success { color: green; font-weight: bold; }
    .error { color: red; font-weight: bold; }
    .warning { color: orange; font-weight: bold; }
    .active { background-color: #e3f2fd; }
    .disabled { opacity: 0.5; }
    .highlighted { border: 2px solid #1976d2; }
  `]
})
export class StatusIndicatorComponent {
  status = 'success';
  isActive = true;
  isEnabled = true;
  isHighlighted = false;
  
  get statusClasses(): string {
    return `status-${this.status}`;
  }
  
  get dynamicClass(): string {
    return this.isActive ? 'dynamic-active' : 'dynamic-inactive';
  }
  
  get conditionalClass(): string {
    return this.isHighlighted ? 'conditional-highlight' : '';
  }
}
```

### NgStyle

Dynamically set inline styles:

```typescript
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-container">
      <div 
        class="progress-bar"
        [ngStyle]="{
          'width.%': progress,
          'background-color': progressColor,
          'transition': 'width 0.3s ease'
        }">
      </div>
    </div>
    
    <!-- Alternative syntax -->
    <div 
      [ngStyle]="progressStyles"
      class="alternative-progress">
      {{ progress }}%
    </div>
  `,
  styles: [`
    .progress-container {
      width: 100%;
      height: 20px;
      background-color: #f0f0f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      border-radius: 10px;
    }
    .alternative-progress {
      padding: 10px;
      text-align: center;
      border-radius: 5px;
    }
  `]
})
export class ProgressBarComponent {
  progress = 75;
  
  get progressColor(): string {
    if (this.progress < 30) return '#f44336'; // red
    if (this.progress < 70) return '#ff9800'; // orange
    return '#4caf50'; // green
  }
  
  get progressStyles(): { [key: string]: string } {
    return {
      'width': `${this.progress}%`,
      'background-color': this.progressColor,
      'color': this.progress > 50 ? 'white' : 'black',
      'font-weight': this.progress > 80 ? 'bold' : 'normal'
    };
  }
}
```

## Built-in Structural Directives

### NgIf

Conditionally include or exclude elements:

```typescript
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-profile">
      <!-- Simple conditional -->
      <div *ngIf="user">
        <h2>{{ user.name }}</h2>
        <p>{{ user.email }}</p>
      </div>
      
      <!-- With else clause -->
      <div *ngIf="isLoggedIn; else loginPrompt">
        <p>Welcome back, {{ user?.name }}!</p>
      </div>
      <ng-template #loginPrompt>
        <p>Please log in to continue.</p>
        <button (click)="showLogin()">Login</button>
      </ng-template>
      
      <!-- Multiple conditions -->
      <div *ngIf="user && user.isActive && !user.isBlocked">
        <button (click)="performAction()">Perform Action</button>
      </div>
      
      <!-- As/Let syntax (Angular 17+) -->
      <div *ngIf="loadUserData() as userData">
        <p>Name: {{ userData.name }}</p>
        <p>Role: {{ userData.role }}</p>
      </div>
    </div>
  `
})
export class UserProfileComponent {
  user: User | null = null;
  isLoggedIn = false;
  
  showLogin(): void {
    // Show login modal or navigate to login
  }
  
  performAction(): void {
    // Perform user action
  }
  
  loadUserData(): User | null {
    // Return user data or null
    return this.user;
  }
}
```

### NgFor

Repeat elements for each item in a collection:

```typescript
@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="task-list">
      <!-- Basic ngFor -->
      <div *ngFor="let task of tasks" class="task-item">
        {{ task.title }}
      </div>
      
      <!-- With index and other variables -->
      <div *ngFor="let task of tasks; let i = index; let isFirst = first; let isLast = last"
           class="task-item"
           [class.first]="isFirst"
           [class.last]="isLast">
        <span class="task-number">{{ i + 1 }}.</span>
        <span class="task-title">{{ task.title }}</span>
        <span class="task-status" [ngClass]="task.status">{{ task.status }}</span>
      </div>
      
      <!-- With trackBy for performance -->
      <div *ngFor="let task of tasks; trackBy: trackByTaskId" class="optimized-task">
        <input type="checkbox" [(ngModel)]="task.completed">
        <span [class.completed]="task.completed">{{ task.title }}</span>
        <button (click)="deleteTask(task.id)">Delete</button>
      </div>
      
      <!-- Empty state -->
      <div *ngIf="tasks.length === 0" class="empty-state">
        <p>No tasks available</p>
        <button (click)="addSampleTasks()">Add Sample Tasks</button>
      </div>
    </div>
  `,
  styles: [`
    .task-item {
      padding: 10px;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .task-item.first { border-top: 2px solid #1976d2; }
    .task-item.last { border-bottom: 2px solid #1976d2; }
    .completed { text-decoration: line-through; opacity: 0.6; }
    .empty-state { text-align: center; padding: 20px; }
  `]
})
export class TaskListComponent {
  tasks: Task[] = [
    { id: 1, title: 'Learn Angular Directives', status: 'completed', completed: true },
    { id: 2, title: 'Build Todo App', status: 'in-progress', completed: false },
    { id: 3, title: 'Write Tests', status: 'pending', completed: false }
  ];
  
  // TrackBy function for performance optimization
  trackByTaskId(index: number, task: Task): number {
    return task.id;
  }
  
  deleteTask(taskId: number): void {
    this.tasks = this.tasks.filter(task => task.id !== taskId);
  }
  
  addSampleTasks(): void {
    this.tasks = [
      { id: Date.now(), title: 'Sample Task 1', status: 'pending', completed: false },
      { id: Date.now() + 1, title: 'Sample Task 2', status: 'pending', completed: false }
    ];
  }
}

interface Task {
  id: number;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  completed: boolean;
}
```

### NgSwitch

Choose between multiple alternatives:

```typescript
@Component({
  selector: 'app-content-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-display">
      <div class="controls">
        <button 
          *ngFor="let type of contentTypes" 
          (click)="currentContentType = type"
          [class.active]="currentContentType === type">
          {{ type | titlecase }}
        </button>
      </div>
      
      <div [ngSwitch]="currentContentType" class="content-area">
        <div *ngSwitchCase="'text'" class="text-content">
          <h3>Text Content</h3>
          <p>This is some sample text content that demonstrates the ngSwitch directive.</p>
          <p>You can put any text-based content here.</p>
        </div>
        
        <div *ngSwitchCase="'image'" class="image-content">
          <h3>Image Content</h3>
          <div class="image-placeholder">
            [Image would go here]
          </div>
          <p>Image caption and description</p>
        </div>
        
        <div *ngSwitchCase="'video'" class="video-content">
          <h3>Video Content</h3>
          <div class="video-placeholder">
            [Video player would go here]
          </div>
          <div class="video-controls">
            <button>Play</button>
            <button>Pause</button>
            <button>Stop</button>
          </div>
        </div>
        
        <div *ngSwitchCase="'list'" class="list-content">
          <h3>List Content</h3>
          <ul>
            <li *ngFor="let item of listItems">{{ item }}</li>
          </ul>
        </div>
        
        <div *ngSwitchDefault class="default-content">
          <h3>Default Content</h3>
          <p>This is the default content shown when no specific case matches.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .controls {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
    }
    .controls button {
      padding: 8px 16px;
      border: 1px solid #ccc;
      background: white;
      cursor: pointer;
    }
    .controls button.active {
      background: #1976d2;
      color: white;
    }
    .content-area {
      border: 1px solid #ddd;
      padding: 20px;
      min-height: 200px;
    }
    .image-placeholder, .video-placeholder {
      width: 100%;
      height: 150px;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 10px 0;
    }
    .video-controls {
      margin-top: 10px;
      display: flex;
      gap: 10px;
    }
  `]
})
export class ContentDisplayComponent {
  currentContentType: string = 'text';
  contentTypes = ['text', 'image', 'video', 'list', 'other'];
  listItems = ['Item 1', 'Item 2', 'Item 3', 'Item 4'];
}
```

## Creating Custom Attribute Directives

### Simple Highlight Directive

```typescript
import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true
})
export class HighlightDirective {
  @Input() appHighlight = 'yellow';
  @Input() defaultColor = 'transparent';
  
  constructor(private el: ElementRef) {}
  
  @HostListener('mouseenter') onMouseEnter(): void {
    this.highlight(this.appHighlight);
  }
  
  @HostListener('mouseleave') onMouseLeave(): void {
    this.highlight(this.defaultColor);
  }
  
  private highlight(color: string): void {
    this.el.nativeElement.style.backgroundColor = color;
  }
}

// Usage in component
@Component({
  selector: 'app-highlight-demo',
  standalone: true,
  imports: [HighlightDirective],
  template: `
    <div>
      <p appHighlight>Hover over this text (default yellow)</p>
      <p appHighlight="lightblue">Hover over this text (light blue)</p>
      <p appHighlight="lightgreen" defaultColor="lightgray">
        This has a default gray background
      </p>
    </div>
  `
})
export class HighlightDemoComponent { }
```

### Advanced Form Validation Directive

```typescript
import { Directive, Input, HostListener, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appValidationStyle]',
  standalone: true
})
export class ValidationStyleDirective {
  @Input() appValidationStyle = true;
  
  constructor(
    private el: ElementRef,
    private control: NgControl
  ) {}
  
  @HostListener('blur') onBlur(): void {
    this.updateStyles();
  }
  
  @HostListener('input') onInput(): void {
    this.updateStyles();
  }
  
  private updateStyles(): void {
    if (!this.appValidationStyle || !this.control) return;
    
    const element = this.el.nativeElement;
    const control = this.control.control;
    
    if (control?.invalid && (control.dirty || control.touched)) {
      element.classList.add('invalid');
      element.classList.remove('valid');
    } else if (control?.valid && control.dirty) {
      element.classList.add('valid');
      element.classList.remove('invalid');
    } else {
      element.classList.remove('valid', 'invalid');
    }
  }
}

// Usage with reactive forms
@Component({
  selector: 'app-form-with-validation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ValidationStyleDirective],
  template: `
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label for="email">Email:</label>
        <input 
          id="email"
          type="email" 
          formControlName="email"
          appValidationStyle
          class="form-control">
        <div *ngIf="userForm.get('email')?.invalid && userForm.get('email')?.touched" 
             class="error-message">
          Email is required and must be valid
        </div>
      </div>
      
      <div class="form-group">
        <label for="password">Password:</label>
        <input 
          id="password"
          type="password" 
          formControlName="password"
          appValidationStyle
          class="form-control">
        <div *ngIf="userForm.get('password')?.invalid && userForm.get('password')?.touched" 
             class="error-message">
          Password must be at least 6 characters
        </div>
      </div>
      
      <button type="submit" [disabled]="userForm.invalid">Submit</button>
    </form>
  `,
  styles: [`
    .form-group { margin-bottom: 15px; }
    .form-control {
      width: 100%;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .form-control.valid {
      border-color: #28a745;
      background-color: #f8fff9;
    }
    .form-control.invalid {
      border-color: #dc3545;
      background-color: #fff8f8;
    }
    .error-message {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
    }
  `]
})
export class FormWithValidationComponent {
  userForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });
  
  onSubmit(): void {
    if (this.userForm.valid) {
      console.log('Form submitted:', this.userForm.value);
    }
  }
}
```

## Creating Custom Structural Directives

### Unless Directive (Opposite of NgIf)

```typescript
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appUnless]',
  standalone: true
})
export class UnlessDirective {
  private hasView = false;
  
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}
  
  @Input() set appUnless(condition: boolean) {
    if (!condition && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (condition && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

// Usage
@Component({
  selector: 'app-unless-demo',
  standalone: true,
  imports: [CommonModule, UnlessDirective],
  template: `
    <div>
      <button (click)="toggleCondition()">
        Toggle Condition ({{ condition }})
      </button>
      
      <p *appUnless="condition">
        This text is shown when condition is FALSE
      </p>
      
      <p *ngIf="condition">
        This text is shown when condition is TRUE
      </p>
    </div>
  `
})
export class UnlessDemoComponent {
  condition = false;
  
  toggleCondition(): void {
    this.condition = !this.condition;
  }
}
```

### Repeat Directive

```typescript
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appRepeat]',
  standalone: true
})
export class RepeatDirective {
  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) {}
  
  @Input() set appRepeat(times: number) {
    this.viewContainer.clear();
    
    for (let i = 0; i < times; i++) {
      this.viewContainer.createEmbeddedView(this.templateRef, {
        $implicit: i,
        index: i,
        first: i === 0,
        last: i === times - 1,
        even: i % 2 === 0,
        odd: i % 2 === 1
      });
    }
  }
}

// Usage
@Component({
  selector: 'app-repeat-demo',
  standalone: true,
  imports: [CommonModule, RepeatDirective],
  template: `
    <div>
      <input type="number" [(ngModel)]="repeatCount" min="1" max="10">
      
      <div *appRepeat="repeatCount; let i = index; let isFirst = first; let isLast = last">
        <p [class.first]="isFirst" [class.last]="isLast">
          Item {{ i + 1 }} of {{ repeatCount }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    .first { font-weight: bold; color: green; }
    .last { font-weight: bold; color: red; }
  `]
})
export class RepeatDemoComponent {
  repeatCount = 3;
}
```

## Best Practices

### Performance Considerations

```typescript
// ✅ Use trackBy with ngFor for better performance
@Component({
  template: `
    <div *ngFor="let item of items; trackBy: trackByItemId">
      {{ item.name }}
    </div>
  `
})
export class OptimizedListComponent {
  trackByItemId(index: number, item: any): number {
    return item.id; // Use unique identifier
  }
}

// ✅ Avoid complex expressions in templates
@Component({
  template: `
    <!-- Good: Use computed property -->
    <div *ngIf="isUserAuthorized">Content</div>
    
    <!-- Avoid: Complex expression -->
    <!-- <div *ngIf="user && user.role === 'admin' && user.permissions.includes('read')"> -->
  `
})
export class AuthorizedComponent {
  get isUserAuthorized(): boolean {
    return this.user && 
           this.user.role === 'admin' && 
           this.user.permissions.includes('read');
  }
}
```

### Directive Communication

```typescript
// Host directive communication
@Directive({
  selector: '[appClickTracker]',
  standalone: true
})
export class ClickTrackerDirective {
  @Input() trackingId!: string;
  @Output() tracked = new EventEmitter<string>();
  
  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    console.log(`Clicked element with ID: ${this.trackingId}`);
    this.tracked.emit(this.trackingId);
  }
}

// Usage
@Component({
  selector: 'app-tracker-demo',
  standalone: true,
  imports: [ClickTrackerDirective],
  template: `
    <button 
      appClickTracker 
      trackingId="header-button"
      (tracked)="onElementTracked($event)">
      Click Me
    </button>
  `
})
export class TrackerDemoComponent {
  onElementTracked(id: string): void {
    console.log(`Element tracked: ${id}`);
  }
}
```

## Next Steps

- Learn about [Services and Dependency Injection](services-and-dependency-injection)
- Explore [Component Communication](../intermediate/component-communication)
- Discover [Forms and Validation](forms-and-validation)

---

**Key Takeaways:**
- Attribute directives modify element appearance or behavior
- Structural directives change DOM structure by adding/removing elements
- Built-in directives (ngIf, ngFor, ngSwitch) cover most common use cases
- Custom directives extend Angular's capabilities for specific needs
- Use trackBy with ngFor for better performance
- Keep template expressions simple and use component properties for complex logic