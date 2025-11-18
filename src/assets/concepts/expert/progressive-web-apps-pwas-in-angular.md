---
title: "Progressive Web Apps (PWAs) in Angular"
slug: "progressive-web-apps-pwas-in-angular"
category: "Expert"
skillLevel: "expert"
difficulty: 3
estimatedReadingTime: 35
constitutional: true
tags: ["pwa", "service-worker", "offline", "notifications"]
prerequisites: ["http-client-and-interceptors", "asynchronous-data-streams-and-asyncpipe", "ssr-and-pre-rendering-with-angular-universal"]
relatedTopics: ["performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction", "security-best-practices-xss-sanitization-csp", "error-monitoring-and-observability-sentry-opentelemetry"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/progressive-web-apps-pwas-in-angular.md"
---

# Progressive Web Apps (PWAs) in Angular

## Learning Objectives
- Convert Angular apps into installable, offline-capable PWAs.
- Configure `@angular/service-worker`, caching strategies, and background sync.
- Measure Lighthouse PWA scores and keep security tight.

## Setup
```bash
ng add @angular/pwa
```
Adds `ngsw-config.json`, app icons, manifest metadata.

### Service Worker Strategies
```json
{
  "assetGroups": [{
    "name": "app",
    "installMode": "prefetch",
    "resources": { "files": ["/*.css", "/*.js"] }
  }],
  "dataGroups": [{
    "name": "api",
    "urls": ["/api/**"],
    "cacheConfig": {
      "strategy": "freshness",
      "maxSize": 50,
      "maxAge": "1h",
      "timeout": "10s"
    }
  }]
}
```

## Advanced Capabilities
- **Background Sync**: queue offline actions via `Workbox` or custom IndexedDB store.
- **Push Notifications**: integrate with Firebase Cloud Messaging; secure VAPID keys.
- **Periodic Sync**: Chrome-only; revalidate data when network returns.

## Testing & Monitoring
- Use Chrome DevTools Application tab to inspect caches.
- Run Lighthouse (CI-friendly via `lighthouse-ci`).
- Add E2E tests toggling offline mode (`cy.exec('network offline')`).

## Checklist
- [ ] Provide graceful fallback when service worker unavailable.
- [ ] Version caches (e.g., `app-v3`) to control invalidation.
- [ ] Serve manifest + icons with correct MIME types via hosting config.
- [ ] Handle SW updates (prompt user or auto-update with `SwUpdate`).
- [ ] Document offline behaviors per feature (read-only vs. requests queued).

## Next Steps
- Combine with [[ssr-and-pre-rendering-with-angular-universal]] for best-in-class performance.
- Feed runtime telemetry into [[error-monitoring-and-observability-sentry-opentelemetry]].
- Harden with [[security-best-practices-xss-sanitization-csp]].
