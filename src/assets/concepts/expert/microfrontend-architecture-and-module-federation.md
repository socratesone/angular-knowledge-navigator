---
title: "Microfrontend Architecture and Module Federation"
slug: "microfrontend-architecture-and-module-federation"
category: "Expert"
skillLevel: "expert"
difficulty: 5
estimatedReadingTime: 45
constitutional: true
tags: ["microfrontend", "module-federation", "architecture", "webpack"]
prerequisites: ["monorepo-and-workspace-management-nx-angular-cli-workspaces", "custom-build-configuration-and-webpack-adjustments", "advanced-routing-guards-resolvers-preloading-strategies"]
relatedTopics: ["ssr-and-pre-rendering-with-angular-universal", "security-best-practices-xss-sanitization-csp", "integration-testing-and-continuous-integration-pipelines"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/microfrontend-architecture-and-module-federation.md"
---

# Microfrontend Architecture and Module Federation

## Learning Objectives
- Decompose Angular apps into independently deployable microfrontends (MFEs).
- Use Webpack Module Federation or Angular CLI builders to share components/routes at runtime.
- Handle version skew, shared dependencies, and security boundaries.

## Deployment Models
1. **Shell + Remotes**: host app loads remote entrypoints at runtime.
2. **Route-level MFEs**: each remote owns a set of routes.
3. **Widget MFEs**: shell composes multiple remotes on a page.

## Module Federation Config
```javascript
// webpack.config.js
module.exports = {
  output: {
    uniqueName: 'conceptShell'
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        knowledge: 'knowledge@https://cdn.example.com/knowledge/remoteEntry.js'
      },
      shared: {
        '@angular/core': { singleton: true, strictVersion: true },
        rxjs: { singleton: true }
      }
    })
  ]
};
```

### Angular 17 Builders
Use `@angular-architects/module-federation` or CLI experimental MF builder for standalone apps.

## Routing Integration
```typescript
const routes: Routes = [
  {
    path: 'knowledge',
    loadChildren: () => loadRemoteModule({
      type: 'module',
      remoteEntry: environment.remotes.knowledge,
      exposedModule: './Routes'
    }).then(m => m.remoteRoutes)
  }
];
```

## Governance Concerns
- **Version skew**: align Angular + RxJS versions; use `npm view` automation.
- **Shared assets**: host CSS variables + fonts to prevent FOUC.
- **Security**: remote hosts must be trusted; enforce CSP to restrict script origins.

## Testing Strategy
- Contract tests verifying remote manifests.
- Integration tests booting shell + remote locally (Nx `serve-mfe` targets).
- Monitoring for remote availability (synthetic probes).

## Checklist
- [ ] Document ownership (team, repo, deploy pipeline) per remote.
- [ ] Provide fallback UI when remote fails to load.
- [ ] Version shared interfaces (TypeScript types package) to avoid breaking consumer builds.
- [ ] Automate smoke tests post-deploy for each remote.
- [ ] Keep analytics isolated per domain to respect privacy.

## Next Steps
- Align caching and SSR via [[ssr-and-pre-rendering-with-angular-universal]].
- Secure surfaces with [[security-best-practices-xss-sanitization-csp]].
- Manage pipelines via [[monorepo-and-workspace-management-nx-angular-cli-workspaces]].
