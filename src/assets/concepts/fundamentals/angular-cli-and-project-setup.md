---
title: "Angular CLI and Project Setup"
slug: "angular-cli-and-project-setup"
category: "Fundamentals"
skillLevel: "fundamentals"
difficulty: 1
estimatedReadingTime: 25
constitutional: true
tags: ["fundamentals", "cli", "project-setup", "tooling", "standalone"]
prerequisites: ["introduction-to-angular", "angular-architecture-overview-modules-components-templates"]
relatedTopics: ["typescript-essentials-for-angular", "components-and-templates"]
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/fundamentals/angular-cli-and-project-setup.md"
---

# Angular CLI and Project Setup

## Learning Objectives
By the end of this lesson, you will:
- Install and configure the Angular CLI
- Create a new Angular project with modern constitutional defaults
- Understand the project structure and key configuration files
- Use CLI commands for development, building, and testing
- Configure your development environment for optimal productivity

## Overview
The Angular CLI is the official command-line interface for Angular development. It provides a powerful set of tools for creating, developing, testing, and deploying Angular applications with best practices built-in.

## Key Concepts to Cover

### CLI Installation and Setup
- **Node.js Requirements**: Version compatibility and LTS recommendations
- **Global Installation**: `npm install -g @angular/cli`
- **Version Management**: Checking versions and updating the CLI
- **Workspace Configuration**: Global and project-specific settings

### Creating Modern Angular Projects
- **Standalone Components**: Default project structure (Angular 17+)
- **Constitutional Defaults**: OnPush change detection, signals support
- **Project Options**: Routing, styling, testing framework selection
- **Workspace Structure**: Single-project vs multi-project workspaces

### Project Structure Deep Dive
```
my-angular-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts (standalone)
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   └── app.config.ts (new bootstrap approach)
│   ├── assets/
│   ├── environments/
│   └── main.ts
├── angular.json
├── package.json
├── tsconfig.json
└── README.md
```

### Essential CLI Commands
- **Development Server**: `ng serve` with hot reload
- **Building**: `ng build` for production optimization
- **Testing**: `ng test` and `ng e2e` for quality assurance
- **Code Generation**: `ng generate` for components, services, etc.
- **Linting**: `ng lint` for code quality enforcement

### Configuration Files
- **angular.json**: Workspace and project configuration
- **tsconfig.json**: TypeScript compilation settings
- **package.json**: Dependencies and scripts
- **environment files**: Development vs production settings

## Real-World Context
The Angular CLI is essential for:
- **Team Consistency**: Standardized project structure across teams
- **Build Optimization**: Production-ready builds with minimal configuration
- **Development Efficiency**: Hot reload, automatic compilation, and testing
- **Code Quality**: Built-in linting and testing support
- **Deployment**: Simplified build and deployment processes

## Constitutional Alignment
Modern Angular CLI projects embrace constitutional practices by default:
- **Standalone Components**: Simplified application bootstrap
- **OnPush Strategy**: Performance-optimized change detection
- **Tree-shakable Imports**: Better bundle optimization
- **Modern TypeScript**: Latest language features and strict mode
- **ESBuild**: Faster development and build times

## CLI Best Practices
- **Naming Conventions**: Consistent file and folder naming
- **Code Generation**: Using schematics for consistency
- **Environment Management**: Proper configuration for different stages
- **Bundle Analysis**: Understanding and optimizing bundle size
- **Performance Budgets**: Setting limits on bundle sizes

## Common CLI Workflows
```bash
# Create a new constitutional Angular project
ng new my-app --standalone --routing --style=scss

# Generate components with constitutional defaults
ng generate component feature/my-component --standalone --change-detection=OnPush

# Serve with environment configuration
ng serve --configuration=development

# Build for production
ng build --configuration=production
```

## Development Environment Setup
- **IDE Configuration**: VS Code extensions and settings
- **Git Integration**: Proper .gitignore and commit hooks
- **Package Manager**: npm vs yarn vs pnpm considerations
- **Browser Developer Tools**: Angular DevTools extension

## Common Issues and Solutions
- **Node Version Conflicts**: Using nvm or similar tools
- **Permission Issues**: Global package installation problems
- **Port Conflicts**: Serving on different ports
- **Memory Issues**: Increasing Node.js heap size for large projects

## Next Steps
After mastering the CLI:
1. [[typescript-essentials-for-angular]] - Understanding TypeScript in Angular context
2. [[components-and-templates]] - Building your first components
3. [[dependency-injection-basics]] - Understanding Angular's service system

## Assessment Questions
1. How do modern Angular CLI projects differ from traditional NgModule projects?
2. What are the key benefits of using the Angular CLI over manual setup?
3. How do you configure different environments in an Angular CLI project?
4. What constitutional practices are enabled by default in new CLI projects?

## Expansion Guidance for LLMs
When expanding this content:
- Include step-by-step installation instructions for different operating systems
- Provide troubleshooting guides for common installation issues
- Show examples of customizing CLI configurations
- Cover advanced CLI features like schematics and builders
- Include performance optimization techniques using CLI
- Discuss CI/CD integration with Angular CLI
- Cover workspace management for monorepo projects
- Include examples of custom npm scripts and CLI integration