---
title: "Directives (ngIf, ngFor, ngSwitch)"
slug: "directives-ngif-ngfor-ngswitch"
category: "Fundamentals"
skillLevel: "fundamentals"
difficulty: 2
estimatedReadingTime: 25
constitutional: false
tags: ["fundamentals", "directives", "structural-directives", "ngif", "ngfor", "ngswitch"]
prerequisites: ["interpolation-and-property-binding", "event-binding-and-two-way-data-binding"]
relatedTopics: ["pipes-and-data-transformation", "custom-directives-and-pipes", "template-reference-variables"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/fundamentals/directives-ngif-ngfor-ngswitch.md"
---

# Directives (ngIf, ngFor, ngSwitch)

## Learning Objectives
By the end of this lesson, you will:
- Master Angular's built-in structural directives
- Understand conditional rendering with ngIf and its variants
- Implement lists and repetitive content with ngFor
- Use ngSwitch for complex conditional logic
- Apply performance optimization techniques for structural directives
- Understand the new Angular 17+ control flow syntax

## Overview
Structural directives are Angular's way of conditionally adding, removing, or repeating elements in the DOM. The three core structural directives - ngIf, ngFor, and ngSwitch - form the foundation of dynamic template rendering in Angular applications.

## Key Concepts to Cover

### ngIf - Conditional Rendering
- **Basic Syntax**: `*ngIf="condition"`
- **Else Clauses**: Using `ng-template` for alternative content
- **If-Then-Else**: Complete conditional rendering patterns
- **Truthy/Falsy Evaluation**: Understanding JavaScript truthiness
- **Performance**: When elements are added/removed from DOM

### ngFor - List Rendering
- **Basic Syntax**: `*ngFor="let item of items"`
- **Index Tracking**: Accessing loop index and position
- **TrackBy Functions**: Optimizing list performance
- **Template Variables**: first, last, even, odd, count
- **Nested Loops**: Handling complex data structures

### ngSwitch - Multi-Condition Logic
- **Switch Container**: `[ngSwitch]="expression"`
- **Case Matching**: `*ngSwitchCase="value"`
- **Default Case**: `*ngSwitchDefault`
- **Complex Expressions**: Using computed values in switch statements

### Practical Examples
```typescript
@Component({
  selector: 'app-directive-examples',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ngIf Examples -->
    <div *ngIf="user; else noUser">
      Welcome, {{ user.name }}!
    </div>
    <ng-template #noUser>
      <div>Please log in</div>
    </ng-template>
    
    <!-- ngIf with async pipe -->
    <div *ngIf="user$ | async as currentUser">
      {{ currentUser.name }}
    </div>
    
    <!-- ngFor Examples -->
    <ul>
      <li *ngFor="let item of items; 
                  let i = index; 
                  let isFirst = first; 
                  let isLast = last;
                  trackBy: trackByFn">
        {{ i }}: {{ item.name }}
        <span *ngIf="isFirst">(First)</span>
        <span *ngIf="isLast">(Last)</span>
      </li>
    </ul>
    
    <!-- ngSwitch Examples -->
    <div [ngSwitch]="userRole">
      <admin-panel *ngSwitchCase="'admin'"></admin-panel>
      <user-dashboard *ngSwitchCase="'user'"></user-dashboard>
      <guest-view *ngSwitchCase="'guest'"></guest-view>
      <div *ngSwitchDefault>Unknown role</div>
    </div>
  `
})
export class DirectiveExamplesComponent {
  user = { name: 'John Doe', role: 'user' };
  user$ = this.userService.getCurrentUser();
  userRole = 'admin';
  
  items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' }
  ];
  
  trackByFn(index: number, item: any): number {
    return item.id; // Use unique identifier for tracking
  }
}
```

### Angular 17+ Control Flow Syntax
```typescript
@Component({
  template: `
    <!-- Modern @if syntax -->
    @if (user) {
      Welcome, {{ user.name }}!
    } @else {
      Please log in
    }
    
    <!-- Modern @for syntax -->
    @for (item of items; track item.id) {
      <div>{{ item.name }}</div>
    } @empty {
      <div>No items found</div>
    }
    
    <!-- Modern @switch syntax -->
    @switch (userRole) {
      @case ('admin') {
        <admin-panel />
      }
      @case ('user') {
        <user-dashboard />
      }
      @default {
        <guest-view />
      }
    }
  `
})
export class ModernControlFlowComponent {
  // Component logic remains the same
}
```

## Performance Considerations

### TrackBy Functions for ngFor
- **Why TrackBy Matters**: Preventing unnecessary DOM manipulation
- **Implementation Patterns**: Common trackBy function patterns
- **Performance Impact**: Measuring the difference in large lists
- **Memory Usage**: How trackBy affects memory consumption

### Conditional Rendering Optimization
- **OnPush Strategy**: How structural directives work with OnPush
- **Async Pipe Integration**: Efficient observable handling
- **Change Detection**: Understanding when directives trigger updates
- **Bundle Size**: Impact of structural directives on application size

## Real-World Context
Structural directives are fundamental to:
- **Dynamic UIs**: Showing/hiding content based on user state
- **Data Visualization**: Rendering charts, tables, and lists
- **User Permissions**: Role-based content display
- **Responsive Design**: Conditional content for different screen sizes
- **E-commerce**: Product listings, shopping carts, checkout flows

## Constitutional Alignment
While not directly constitutional, these directives support best practices:
- **Immutable Data**: Working with readonly arrays and objects
- **Type Safety**: TypeScript integration with structural directives
- **Performance**: Efficient DOM manipulation with proper tracking
- **Declarative Templates**: Clear, readable conditional logic

### Advanced Patterns
```typescript
// Complex ngFor with filtering and sorting
<div *ngFor="let item of items | filter:searchTerm | orderBy:'name'; 
             trackBy: trackByFn; 
             let isEven = even"
     [class.even]="isEven">
  {{ item.name }}
</div>

// Nested structural directives
<div *ngFor="let category of categories">
  <h3>{{ category.name }}</h3>
  <div *ngFor="let item of category.items" 
       *ngIf="item.isVisible">
    {{ item.name }}
  </div>
</div>

// Conditional classes with ngFor
<li *ngFor="let item of items; let i = index"
    [class]="getItemClass(item, i)">
  {{ item.name }}
</li>
```

## Error Handling
- **Null Reference Prevention**: Safe navigation with structural directives
- **Empty State Handling**: Graceful handling of empty arrays
- **Loading States**: Combining with async operations
- **Error Boundaries**: Handling errors in directive expressions

## Testing Structural Directives
- **Component Testing**: Testing conditional rendering
- **Integration Testing**: Testing directive interactions
- **Performance Testing**: Measuring directive performance impact
- **Accessibility Testing**: Ensuring proper ARIA attributes

## Common Pitfalls
- **Performance**: Forgetting trackBy functions in large lists
- **Memory Leaks**: Not properly cleaning up in directive contexts
- **Nested Logic**: Overcomplicating template logic
- **Change Detection**: Understanding when directives trigger updates
- **Type Safety**: Properly typing directive expressions

## Migration Considerations
- **Legacy to Modern**: Migrating from *ngFor to @for syntax
- **Browser Support**: Compatibility considerations for control flow
- **Performance Impact**: Comparing old vs new syntax performance
- **Tooling Support**: IDE and linting support for new syntax

## Next Steps
After mastering structural directives:
1. [[pipes-and-data-transformation]] - Transforming data in templates
2. [[custom-directives-and-pipes]] - Creating reusable directive logic
3. [[template-reference-variables]] - Advanced template interactions

## Assessment Questions
1. When should you use ngIf vs ngShow/ngHide patterns?
2. How do trackBy functions improve ngFor performance?
3. What are the advantages of the new Angular 17+ control flow syntax?
4. How do structural directives interact with change detection?

## Expansion Guidance for LLMs
When expanding this content:
- Include performance benchmarks comparing trackBy vs no trackBy
- Show debugging techniques for structural directive issues
- Cover accessibility considerations for dynamic content
- Provide migration guides from legacy to modern control flow syntax
- Include complex real-world examples with nested data structures
- Show integration with reactive forms and validation
- Cover testing strategies for components with complex directive logic
- Include best practices for large list handling and virtualization