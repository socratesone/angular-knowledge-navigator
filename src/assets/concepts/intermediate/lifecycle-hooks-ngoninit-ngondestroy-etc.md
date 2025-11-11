---
title: "Lifecycle Hooks (ngOnInit, ngOnDestroy, etc.)"
slug: "lifecycle-hooks-ngoninit-ngondestroy-etc"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 30
constitutional: true
tags: ["intermediate", "lifecycle-hooks", "component-lifecycle", "memory-management", "initialization"]
prerequisites: ["components-and-templates", "dependency-injection-basics", "introduction-to-observables-and-rxjs"]
relatedTopics: ["optimizing-change-detection-and-performance", "custom-directives-and-pipes", "reactive-state-management-rxjs-componentstore-ngrx-introduction"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/lifecycle-hooks-ngoninit-ngondestroy-etc.md"
---

# Lifecycle Hooks (ngOnInit, ngOnDestroy, etc.)

## Learning Objectives
- Master all Angular lifecycle hooks and their appropriate use cases
- Implement proper component initialization and cleanup patterns
- Prevent memory leaks with effective subscription management
- Apply constitutional lifecycle patterns for optimal performance
- Understand the relationship between lifecycle hooks and change detection

## Overview
Angular lifecycle hooks provide precise control over component and directive initialization, updates, and destruction. Proper use of lifecycle hooks is essential for performance, memory management, and user experience.

## Key Lifecycle Hooks

### Essential Hooks
```typescript
@Component({
  selector: 'app-lifecycle-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>Lifecycle Demo Component</div>`
})
export class LifecycleDemoComponent implements 
  OnInit, OnDestroy, OnChanges, AfterViewInit {
  
  @Input() data: any;
  
  private destroy$ = new Subject<void>();
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  
  // 1. ngOnChanges - Input property changes
  ngOnChanges(changes: SimpleChanges): void {
    console.log('Input changes:', changes);
    
    if (changes['data'] && !changes['data'].firstChange) {
      this.handleDataChange(changes['data'].currentValue);
    }
  }
  
  // 2. ngOnInit - Component initialization
  ngOnInit(): void {
    console.log('Component initialized');
    
    // Setup subscriptions
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.handleUsers(users);
        this.cdr.markForCheck(); // OnPush change detection
      });
  }
  
  // 3. ngAfterViewInit - View fully initialized
  ngAfterViewInit(): void {
    console.log('View initialized');
    // Safe to access ViewChild references here
  }
  
  // 4. ngOnDestroy - Component cleanup
  ngOnDestroy(): void {
    console.log('Component destroyed');
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private handleDataChange(newData: any): void {
    // Handle input changes
  }
  
  private handleUsers(users: User[]): void {
    // Handle user data
  }
}
```

## Constitutional Patterns

### Memory Management with takeUntil
```typescript
export class ComponentWithSubscriptions implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit(): void {
    // All subscriptions use takeUntil for automatic cleanup
    this.dataService.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.handleData(data));
      
    this.userService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.handleUser(user));
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Modern Signal-Based Lifecycle
```typescript
@Component({
  selector: 'app-signal-lifecycle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignalLifecycleComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  
  // Signals for reactive state
  users = signal<User[]>([]);
  loading = signal(false);
  
  // Computed values
  userCount = computed(() => this.users().length);
  
  ngOnInit(): void {
    this.loadUsers();
  }
  
  private loadUsers(): void {
    this.loading.set(true);
    
    this.userService.getUsers().subscribe({
      next: users => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
```

## Complete Lifecycle Hook Guide

### Initialization Hooks
- **ngOnChanges**: Input property changes (called before ngOnInit)
- **ngOnInit**: Component initialization (called once)
- **ngDoCheck**: Custom change detection (called every cycle)
- **ngAfterContentInit**: Content projection initialized
- **ngAfterContentChecked**: Content projection checked
- **ngAfterViewInit**: Component view initialized
- **ngAfterViewChecked**: Component view checked

### Cleanup Hook
- **ngOnDestroy**: Component destruction and cleanup

## Real-World Applications
- **Data Loading**: Fetching data on component initialization
- **Event Subscriptions**: Managing WebSocket or event listener subscriptions
- **Timer Management**: Cleanup of intervals and timeouts
- **Resource Cleanup**: Releasing expensive resources
- **Animation Cleanup**: Stopping animations on component destruction

## Performance Considerations
- **OnPush Compatibility**: Proper change detection triggers in lifecycle hooks
- **Subscription Management**: Preventing memory leaks with proper unsubscription
- **Expensive Operations**: Deferring heavy computations to appropriate hooks
- **DOM Manipulation**: Safe access to DOM elements after view initialization

## Common Patterns and Best Practices
```typescript
// Conditional initialization based on inputs
ngOnChanges(changes: SimpleChanges): void {
  if (changes['userId'] && changes['userId'].currentValue) {
    this.loadUserData(changes['userId'].currentValue);
  }
}

// Safe ViewChild access
@ViewChild('myElement') myElement!: ElementRef;

ngAfterViewInit(): void {
  // Safe to access myElement here
  this.myElement.nativeElement.focus();
}

// Cleanup pattern for multiple subscriptions
private subscriptions = new Set<Subscription>();

ngOnInit(): void {
  const sub1 = this.service1.getData().subscribe(...);
  const sub2 = this.service2.getData().subscribe(...);
  
  this.subscriptions.add(sub1);
  this.subscriptions.add(sub2);
}

ngOnDestroy(): void {
  this.subscriptions.forEach(sub => sub.unsubscribe());
}
```

## Testing Lifecycle Hooks
- **Initialization Testing**: Verifying proper component setup
- **Cleanup Testing**: Ensuring subscriptions are unsubscribed
- **Change Detection Testing**: Testing input change handling
- **Integration Testing**: Testing hook interactions with services

## Assessment Questions
1. What's the difference between ngOnInit and constructor for component initialization?
2. How do you prevent memory leaks in Angular components?
3. When should you use ngAfterViewInit vs ngOnInit?
4. How do lifecycle hooks interact with OnPush change detection?

## Next Steps
[[reactive-state-management-rxjs-componentstore-ngrx-introduction]], [[optimizing-change-detection-and-performance]], [[custom-directives-and-pipes]]

## Expansion Guidance for LLMs
When expanding this content, include comprehensive examples of each lifecycle hook, advanced subscription management patterns, performance optimization techniques, testing strategies, integration with modern Angular features (signals, standalone components), and common troubleshooting scenarios for lifecycle-related issues.