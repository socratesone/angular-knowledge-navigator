---
title: "Pipes and Data Transformation"
slug: "pipes-and-data-transformation"
category: "Fundamentals"
skillLevel: "fundamentals"
difficulty: 2
estimatedReadingTime: 20
constitutional: false
tags: ["fundamentals", "pipes", "data-transformation", "formatting", "built-in-pipes"]
prerequisites: ["interpolation-and-property-binding", "directives-ngif-ngfor-ngswitch"]
relatedTopics: ["custom-directives-and-pipes", "introduction-to-observables-and-rxjs", "handling-user-input-and-validation"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/fundamentals/pipes-and-data-transformation.md"
---

# Pipes and Data Transformation

## Learning Objectives
By the end of this lesson, you will:
- Master Angular's built-in pipes for data formatting
- Understand pipe chaining and parameterization
- Implement pure vs impure pipes appropriately
- Create custom pipes for specific transformation needs
- Apply pipes effectively with observables and async data

## Overview
Pipes are Angular's way of transforming displayed data without changing the underlying data model. They provide a clean, declarative way to format dates, currencies, text, and any other data presentation needs.

## Key Concepts to Cover

### Built-in Pipes Overview
- **Date Pipe**: Formatting dates and times
- **Currency Pipe**: Displaying monetary values
- **Number/Decimal Pipe**: Formatting numbers
- **Percent Pipe**: Converting to percentage format
- **Text Pipes**: uppercase, lowercase, titlecase
- **JSON Pipe**: Debugging object display
- **Slice Pipe**: Array and string slicing
- **Async Pipe**: Handling observables and promises

### Pipe Syntax and Usage
```typescript
@Component({
  template: `
    <!-- Basic pipe usage -->
    <p>{{ user.name | uppercase }}</p>
    <p>{{ user.birthDate | date:'fullDate' }}</p>
    <p>{{ product.price | currency:'USD':'symbol':'1.2-2' }}</p>
    
    <!-- Pipe chaining -->
    <p>{{ user.description | slice:0:100 | uppercase }}</p>
    
    <!-- Async pipe with observables -->
    <div *ngIf="user$ | async as user">
      {{ user.name | titlecase }}
    </div>
    
    <!-- Pipes in expressions -->
    <div [title]="user.tooltip | translate">
      {{ user.name }}
    </div>
  `
})
export class PipeExamplesComponent {
  user = {
    name: 'john doe',
    birthDate: new Date('1990-05-15'),
    description: 'A long description...'
  };
  
  product = { price: 29.99 };
  user$ = this.userService.getCurrentUser();
}
```

### Custom Pipe Implementation
```typescript
@Pipe({
  name: 'truncate',
  standalone: true,
  pure: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number = 50, ellipsis: string = '...'): string {
    if (!value) return '';
    
    return value.length > limit 
      ? value.substring(0, limit) + ellipsis
      : value;
  }
}

// Usage: {{ longText | truncate:25:'...' }}
```

## Real-World Context
Pipes are essential for professional applications that need to:
- **Display Financial Data**: Currency formatting for e-commerce
- **Internationalization**: Date/time formatting for different locales
- **User Experience**: Readable data presentation
- **Data Privacy**: Masking sensitive information
- **Performance**: Efficient data transformation without model changes

## Performance and Best Practices
- **Pure vs Impure Pipes**: Understanding performance implications
- **Async Pipe Benefits**: Automatic subscription management
- **Pipe Chaining**: Order matters for performance
- **Memoization**: Caching expensive transformations
- **OnPush Strategy**: How pipes work with change detection optimization

## Next Steps
After mastering pipes:
1. [[custom-directives-and-pipes]] - Creating advanced custom pipes
2. [[dependency-injection-basics]] - Understanding pipe dependency injection
3. [[services-and-providers]] - Pipes that depend on services

## Assessment Questions
1. What's the difference between pure and impure pipes?
2. How does the async pipe manage subscriptions?
3. When would you create a custom pipe vs using a method?
4. How do pipes affect change detection performance?

## Expansion Guidance for LLMs
Include comprehensive examples of all built-in pipes, custom pipe patterns, internationalization usage, testing strategies, and performance optimization techniques.