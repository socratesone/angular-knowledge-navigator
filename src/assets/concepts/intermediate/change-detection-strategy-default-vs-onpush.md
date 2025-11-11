---
title: "Change Detection Strategy (Default vs OnPush)"
slug: "change-detection-strategy-default-vs-onpush"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 4
estimatedReadingTime: 35
constitutional: true
tags: ["intermediate", "change-detection", "onpush", "performance", "optimization"]
prerequisites: ["components-and-templates", "introduction-to-observables-and-rxjs", "component-communication-input-output-viewchild-service-based"]
relatedTopics: ["optimizing-change-detection-and-performance", "angular-signals", "smart-vs-presentational-components-pattern"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/change-detection-strategy-default-vs-onpush.md"
---

# Change Detection Strategy (Default vs OnPush)

## Learning Objectives
- Understand Angular's change detection mechanism and its performance implications
- Master OnPush change detection strategy for optimal performance
- Implement immutable data patterns to work effectively with OnPush
- Identify when and how to trigger manual change detection
- Apply constitutional OnPush patterns throughout your application

## Overview
Change detection is Angular's mechanism for keeping the view synchronized with component data. Understanding and properly implementing OnPush strategy is crucial for building performant Angular applications.

## Key Concepts

### Change Detection Fundamentals
- **Zone.js**: How Angular detects changes automatically
- **Change Detection Cycle**: When and how Angular checks for changes
- **Component Tree Traversal**: How change detection propagates through the application
- **Performance Impact**: Cost of default change detection in large applications

### Default vs OnPush Strategy
```typescript
// Default Strategy (runs on every change detection cycle)
@Component({
  selector: 'app-default',
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div>{{ expensiveCalculation() }}</div>
    <div>{{ user.name }}</div>
  `
})
export class DefaultComponent {
  user = { name: 'John' };
  
  expensiveCalculation(): number {
    console.log('Expensive calculation running...');
    return Math.random() * 1000;
  }
}

// OnPush Strategy (runs only when inputs change or events occur)
@Component({
  selector: 'app-onpush',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>{{ calculatedValue }}</div>
    <div>{{ user.name }}</div>
  `
})
export class OnPushComponent implements OnInit {
  @Input() user!: User;
  
  private cdr = inject(ChangeDetectorRef);
  calculatedValue = 0;
  
  ngOnInit(): void {
    // Calculate once, not on every change detection cycle
    this.calculatedValue = this.expensiveCalculation();
  }
  
  updateData(): void {
    // Manual change detection trigger when needed
    this.calculatedValue = this.expensiveCalculation();
    this.cdr.markForCheck();
  }
  
  private expensiveCalculation(): number {
    return Math.random() * 1000;
  }
}
```

## Constitutional Alignment
OnPush strategy is a constitutional practice because:
- **Performance First**: Optimal change detection by default
- **Immutable Data Patterns**: Encourages proper data flow
- **Predictable Behavior**: Clear rules for when components update
- **Scalability**: Essential for large applications

### OnPush with Observables
```typescript
@Component({
  selector: 'app-reactive-onpush',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div *ngIf="user$ | async as user">
      {{ user.name }}
    </div>
    <div>{{ status$ | async }}</div>
  `
})
export class ReactiveOnPushComponent {
  private userService = inject(UserService);
  
  // Async pipe automatically triggers change detection
  user$ = this.userService.getCurrentUser();
  status$ = this.userService.getStatus();
}
```

### OnPush with Signals (Angular 17+)
```typescript
@Component({
  selector: 'app-signal-onpush',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>{{ user().name }}</div>
    <div>{{ computedValue() }}</div>
  `
})
export class SignalOnPushComponent {
  user = signal({ name: 'John', age: 30 });
  
  // Computed signals automatically trigger change detection
  computedValue = computed(() => 
    `${this.user().name} is ${this.user().age} years old`
  );
  
  updateUser(): void {
    // Signal updates automatically trigger change detection
    this.user.update(current => ({ 
      ...current, 
      age: current.age + 1 
    }));
  }
}
```

## Real-World Performance Impact
- **Large Component Trees**: OnPush can reduce change detection cycles by 80-90%
- **Complex Applications**: Essential for applications with hundreds of components
- **Mobile Performance**: Critical for smooth mobile user experience
- **Data-Heavy UIs**: Prevents unnecessary recalculations and DOM updates

### Common OnPush Patterns
```typescript
// Immutable input updates
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListComponent {
  @Input() items: Item[] = [];
  
  // Good: Creates new array reference
  addItem(item: Item): void {
    this.items = [...this.items, item];
  }
  
  // Bad: Mutates existing array (OnPush won't detect)
  addItemBad(item: Item): void {
    this.items.push(item); // Won't trigger change detection
  }
}
```

## Common Pitfalls and Solutions
- **Mutating Input Objects**: Always create new references for complex objects
- **Forgetting Manual Change Detection**: Using markForCheck() when needed  
- **Event Handler Context**: OnPush automatically checks after component events
- **Third-party Library Integration**: Handling external state changes

## Testing OnPush Components
- **Change Detection Control**: Managing change detection in tests
- **Input Testing**: Verifying component updates with new inputs
- **Event Testing**: Ensuring events trigger proper updates
- **Performance Testing**: Measuring change detection improvements

## Migration Strategies
- **Gradual Adoption**: Starting with leaf components
- **Data Flow Audit**: Ensuring immutable data patterns
- **Performance Monitoring**: Measuring impact of OnPush adoption
- **Team Training**: Educating developers on OnPush requirements

## Assessment Questions
1. What triggers change detection in OnPush components?
2. How do immutable data patterns relate to OnPush strategy?
3. When would you need to manually trigger change detection?
4. How do async pipe and signals work with OnPush?

## Next Steps
[[optimizing-change-detection-and-performance]], [[angular-signals]], [[smart-vs-presentational-components-pattern]]

## Expansion Guidance for LLMs
When expanding this content, include detailed performance benchmarks, comprehensive debugging techniques, advanced OnPush patterns, integration with state management libraries, mobile performance considerations, and migration strategies from Default to OnPush. Cover Zone.js alternatives and the future of change detection in Angular.