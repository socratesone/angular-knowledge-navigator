---
title: "Defining and Enforcing Architectural Conventions (Constitutional Compliance)"
slug: "defining-and-enforcing-architectural-conventions-constitutional-compliance"
category: "Expert"
skillLevel: "expert"
difficulty: 5
estimatedReadingTime: 50
constitutional: true
tags: ["expert", "architecture", "conventions", "governance", "code-quality", "constitutional"]
prerequisites: ["signals-and-modern-reactivity-model-angular-17", "application-architecture-and-module-boundaries", "performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction"]
relatedTopics: ["code-quality-automation-and-linting-enforcement", "monorepo-and-workspace-management-nx-angular-cli-workspaces", "microfrontend-architecture-and-module-federation"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/expert/defining-and-enforcing-architectural-conventions-constitutional-compliance.md"
---

# Defining and Enforcing Architectural Conventions (Constitutional Compliance)

## Learning Objectives
- Establish and enforce Angular constitutional principles across large teams
- Implement automated governance for architectural compliance
- Design scalable patterns that prevent technical debt
- Create development guidelines that promote long-term maintainability
- Build tooling and processes for consistent constitutional adoption

## Overview
Constitutional compliance in Angular development means establishing and enforcing architectural principles that ensure applications remain performant, maintainable, and scalable. This involves defining conventions, implementing automation, and creating cultural practices that sustain quality.

## Core Constitutional Principles

### 1. Standalone Components First
```typescript
// ✅ Constitutional: Standalone component
@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, UserAvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class UserProfileComponent { }

// ❌ Non-constitutional: NgModule-based component
@NgModule({
  declarations: [UserProfileComponent],
  imports: [CommonModule, MatCardModule]
})
export class UserProfileModule { }
```

### 2. OnPush Change Detection Strategy
```typescript
// ✅ Constitutional: OnPush by default
@Component({
  selector: 'app-feature',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class FeatureComponent { }

// Automated enforcement via ESLint rule
// .eslintrc.json
{
  "rules": {
    "@angular-eslint/prefer-on-push-component-change-detection": "error"
  }
}
```

### 3. Signals for State Management
```typescript
// ✅ Constitutional: Signal-based state
@Injectable({ providedIn: 'root' })
export class UserStateService {
  private _users = signal<User[]>([]);
  readonly users = this._users.asReadonly();
  
  readonly activeUsers = computed(() => 
    this._users().filter(user => user.isActive)
  );
}

// ❌ Non-constitutional: Imperative state management
export class UserStateService {
  users: User[] = [];
  
  getActiveUsers(): User[] {
    return this.users.filter(user => user.isActive); // Computed every call
  }
}
```

### 4. Modern Dependency Injection
```typescript
// ✅ Constitutional: inject() function
@Component({
  selector: 'app-modern',
  standalone: true
})
export class ModernComponent {
  private userService = inject(UserService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
}

// ✅ Acceptable: Constructor injection for legacy compatibility
export class LegacyComponent {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}
}
```

## Automated Governance Implementation

### ESLint Configuration for Constitutional Compliance
```json
// .eslintrc.json
{
  "extends": [
    "@angular-eslint/recommended",
    "@angular-eslint/template/recommended"
  ],
  "rules": {
    // Enforce standalone components
    "@angular-eslint/prefer-standalone-component": "error",
    
    // Require OnPush change detection
    "@angular-eslint/prefer-on-push-component-change-detection": "error",
    
    // Enforce signal usage over manual state
    "@typescript-eslint/prefer-readonly": "error",
    
    // Prevent imperative DOM manipulation
    "@angular-eslint/no-host-metadata-property": "error",
    
    // Enforce proper lifecycle hook usage
    "@angular-eslint/use-lifecycle-interface": "error",
    
    // Custom rules for constitutional compliance
    "constitutional/prefer-inject-function": "error",
    "constitutional/require-signal-state": "warn",
    "constitutional/no-zone-js-imports": "error"
  }
}
```

### Custom ESLint Rules for Constitutional Compliance
```typescript
// eslint-rules/constitutional-rules.js
module.exports = {
  'prefer-inject-function': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Prefer inject() function over constructor injection'
      }
    },
    create(context) {
      return {
        MethodDefinition(node) {
          if (node.key.name === 'constructor' && 
              node.value.params.length > 0) {
            context.report({
              node,
              message: 'Prefer inject() function over constructor injection'
            });
          }
        }
      };
    }
  },
  
  'require-signal-state': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Encourage signal usage for state management'
      }
    },
    create(context) {
      return {
        PropertyDefinition(node) {
          if (node.value?.type === 'ArrayExpression' ||
              node.value?.type === 'ObjectExpression') {
            context.report({
              node,
              message: 'Consider using signals for reactive state'
            });
          }
        }
      };
    }
  }
};
```

### Architectural Decision Records (ADRs)
```markdown
# ADR-001: Adopt Standalone Components as Default

## Status
Accepted

## Context
Angular 17+ provides standalone components that eliminate NgModule boilerplate and improve tree-shaking.

## Decision
All new components MUST be standalone. Existing components should be migrated during feature work.

## Consequences
- Reduced boilerplate code
- Better tree-shaking and bundle optimization
- Simplified testing setup
- Improved developer experience

## Enforcement
- ESLint rule: `@angular-eslint/prefer-standalone-component: error`
- Code review checklist includes standalone component verification
- CI pipeline fails if non-standalone components are added
```

### Performance Budget Enforcement
```json
// angular.json
{
  "projects": {
    "my-app": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "500kb",
                  "maximumError": "1mb"
                },
                {
                  "type": "anyComponentStyle",
                  "maximumWarning": "6kb",
                  "maximumError": "10kb"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

### Code Quality Gates
```yaml
# .github/workflows/constitutional-compliance.yml
name: Constitutional Compliance Check

on: [pull_request]

jobs:
  compliance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Constitutional Lint Check
        run: npm run lint:constitutional
        
      - name: Performance Budget Check
        run: npm run build -- --configuration=production
        
      - name: Signal Usage Analysis
        run: npm run analyze:signals
        
      - name: Bundle Size Analysis
        run: npm run analyze:bundle
```

## Team Adoption Strategies

### Developer Education Program
```typescript
// Training modules for constitutional compliance
export const CONSTITUTIONAL_TRAINING_MODULES = [
  {
    module: 'Standalone Components',
    duration: '2 hours',
    hands_on: true,
    assessment: true
  },
  {
    module: 'OnPush Change Detection',
    duration: '3 hours',
    hands_on: true,
    assessment: true
  },
  {
    module: 'Signals and Modern Reactivity',
    duration: '4 hours',
    hands_on: true,
    assessment: true
  }
];
```

### Code Review Guidelines
```markdown
# Constitutional Code Review Checklist

## Components
- [ ] Component uses standalone: true
- [ ] Component uses OnPush change detection
- [ ] Component follows single responsibility principle
- [ ] Component has proper TypeScript typing

## State Management
- [ ] Uses signals for reactive state
- [ ] Computed values use computed() function
- [ ] Side effects use effect() function
- [ ] No direct state mutations

## Dependency Injection
- [ ] Uses inject() function for new code
- [ ] Services use providedIn: 'root' when appropriate
- [ ] No circular dependencies

## Performance
- [ ] No expensive operations in templates
- [ ] Proper trackBy functions for ngFor
- [ ] Async pipe used for observables
- [ ] Bundle size within limits
```

## Metrics and Monitoring

### Constitutional Compliance Dashboard
```typescript
@Component({
  selector: 'app-compliance-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="metrics-grid">
      <mat-card>
        <mat-card-title>Standalone Components</mat-card-title>
        <mat-card-content>
          <div class="metric">{{ standalonePercentage() }}%</div>
          <div class="trend" [class.positive]="standalonePercentage() > 80">
            {{ standaloneComponents().length }} / {{ totalComponents().length }}
          </div>
        </mat-card-content>
      </mat-card>
      
      <mat-card>
        <mat-card-title>OnPush Components</mat-card-title>
        <mat-card-content>
          <div class="metric">{{ onPushPercentage() }}%</div>
        </mat-card-content>
      </mat-card>
      
      <mat-card>
        <mat-card-title>Signal Usage</mat-card-title>
        <mat-card-content>
          <div class="metric">{{ signalUsagePercentage() }}%</div>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class ComplianceDashboardComponent {
  private metricsService = inject(MetricsService);
  
  totalComponents = computed(() => this.metricsService.getAllComponents());
  standaloneComponents = computed(() => 
    this.totalComponents().filter(c => c.standalone)
  );
  
  standalonePercentage = computed(() => 
    Math.round((this.standaloneComponents().length / this.totalComponents().length) * 100)
  );
  
  onPushPercentage = computed(() => {
    const onPushComponents = this.totalComponents()
      .filter(c => c.changeDetection === 'OnPush');
    return Math.round((onPushComponents.length / this.totalComponents().length) * 100);
  });
  
  signalUsagePercentage = computed(() => {
    const signalComponents = this.totalComponents()
      .filter(c => c.usesSignals);
    return Math.round((signalComponents.length / this.totalComponents().length) * 100);
  });
}
```

## Assessment Questions
1. How do you enforce constitutional compliance across a large development team?
2. What automated tools can help maintain architectural consistency?
3. How do you measure and track constitutional compliance over time?
4. What strategies help teams adopt constitutional practices gradually?

## Next Steps
[[code-quality-automation-and-linting-enforcement]], [[monorepo-and-workspace-management-nx-angular-cli-workspaces]], [[microfrontend-architecture-and-module-federation]]

## Expansion Guidance for LLMs
When expanding this content, include comprehensive governance frameworks, automated tooling setup, team adoption strategies, metrics and monitoring systems, migration planning, conflict resolution strategies, and long-term maintenance approaches for constitutional compliance in enterprise Angular applications.