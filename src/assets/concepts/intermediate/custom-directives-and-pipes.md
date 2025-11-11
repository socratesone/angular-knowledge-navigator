---
title: "Custom Directives and Pipes"
slug: "custom-directives-and-pipes"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["intermediate", "custom-directives", "custom-pipes", "dom-manipulation", "reusability"]
prerequisites: ["directives-ngif-ngfor-ngswitch", "pipes-and-data-transformation", "typescript-essentials-for-angular"]
relatedTopics: ["custom-structural-directives", "advanced-dependency-injection-scopes", "reusable-component-libraries-and-shared-modules"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/custom-directives-and-pipes.md"
---

# Custom Directives and Pipes

## Learning Objectives
- Create custom attribute directives for DOM manipulation and behavior
- Implement custom structural directives for advanced templating
- Build custom pipes for specialized data transformation
- Apply constitutional patterns for reusable, testable directives and pipes
- Understand directive lifecycle and host element interaction

## Overview
Custom directives and pipes extend Angular's template capabilities, enabling reusable DOM manipulation, custom structural logic, and specialized data transformations that can be shared across applications.

## Key Concepts

### Custom Attribute Directives
```typescript
@Directive({
  selector: '[appHighlight]',
  standalone: true
})
export class HighlightDirective implements OnInit, OnDestroy {
  @Input() appHighlight: string = 'yellow';
  @Input() highlightOnHover: boolean = true;
  
  private element = inject(ElementRef);
  private renderer = inject(Renderer2);
  
  @HostListener('mouseenter') onMouseEnter() {
    if (this.highlightOnHover) {
      this.highlight(this.appHighlight);
    }
  }
  
  @HostListener('mouseleave') onMouseLeave() {
    if (this.highlightOnHover) {
      this.highlight('');
    }
  }
  
  private highlight(color: string): void {
    this.renderer.setStyle(
      this.element.nativeElement, 
      'backgroundColor', 
      color
    );
  }
}
```

### Custom Structural Directives
```typescript
@Directive({
  selector: '[appRepeat]',
  standalone: true
})
export class RepeatDirective implements OnInit {
  @Input() set appRepeat(count: number) {
    this.renderElements(count);
  }
  
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  
  private renderElements(count: number): void {
    this.viewContainer.clear();
    
    for (let i = 0; i < count; i++) {
      this.viewContainer.createEmbeddedView(this.templateRef, {
        $implicit: i,
        index: i,
        count: count
      });
    }
  }
}
```

### Custom Pipes
```typescript
@Pipe({
  name: 'fileSize',
  standalone: true,
  pure: true
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number, precision: number = 1): string {
    if (!bytes || bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const base = 1024;
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
    const size = bytes / Math.pow(base, unitIndex);
    
    return `${size.toFixed(precision)} ${units[unitIndex]}`;
  }
}

// Usage: {{ file.size | fileSize:2 }}
```

## Constitutional Alignment
- **Standalone Directives**: Modern directive architecture
- **inject() Function**: Preferred dependency injection pattern
- **Type Safety**: Full TypeScript integration
- **OnPush Compatibility**: Directives that work with optimal change detection
- **Immutable Operations**: Pipes and directives that don't mutate input data

### Advanced Patterns
```typescript
// Injectable directive with services
@Directive({
  selector: '[appPermission]',
  standalone: true
})
export class PermissionDirective implements OnInit {
  @Input() appPermission!: string;
  
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  
  ngOnInit(): void {
    this.authService.permissions$.subscribe(permissions => {
      if (permissions.includes(this.appPermission)) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else {
        this.viewContainer.clear();
      }
    });
  }
}
```

## Real-World Applications
- **UI Enhancements**: Tooltips, animations, accessibility improvements
- **Business Logic**: Permission systems, feature toggles
- **Data Display**: Specialized formatting, localization
- **Form Enhancements**: Custom validators, input masks
- **Performance**: Lazy loading, virtual scrolling

## Testing Strategies
- **Directive Testing**: Component test harness patterns
- **Pipe Testing**: Pure function testing approaches
- **Integration Testing**: Testing directive-component interactions
- **Accessibility Testing**: Ensuring ARIA compliance

## Performance Considerations
- **Pure Pipes**: Avoiding unnecessary recalculations
- **OnPush Strategy**: Directive compatibility with change detection
- **Memory Management**: Proper cleanup in directive lifecycle
- **Bundle Size**: Tree-shakable directive libraries

## Common Patterns
- **Validation Directives**: Custom form validation
- **Animation Directives**: Reusable animation behaviors
- **Utility Pipes**: Date formatting, text transformation
- **Permission Systems**: Role-based content display

## Assessment Questions
1. When should you create a custom directive vs using existing Angular features?
2. What's the difference between attribute and structural directives?
3. How do pure and impure pipes affect application performance?
4. How do you make directives compatible with OnPush change detection?

## Next Steps
[[custom-structural-directives]], [[reusable-component-libraries-and-shared-modules]], [[advanced-dependency-injection-scopes]]

## Expansion Guidance for LLMs
When expanding this content, include comprehensive examples of different directive types, advanced DOM manipulation techniques, pipe optimization strategies, testing patterns, accessibility considerations, and real-world use cases. Cover directive lifecycle hooks, host binding patterns, and integration with Angular's reactive ecosystem.