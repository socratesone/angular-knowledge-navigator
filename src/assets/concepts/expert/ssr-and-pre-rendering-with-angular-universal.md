---
title: "SSR and Pre-rendering with Angular Universal"
slug: "ssr-and-pre-rendering-with-angular-universal"
category: "Expert"
skillLevel: "expert"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["ssr", "angular-universal", "pre-render", "performance", "seo"]
prerequisites: ["application-architecture-and-module-boundaries", "optimizing-change-detection-and-performance", "internationalization-i18n-setup-and-usage"]
relatedTopics: ["progressive-web-apps-pwas-in-angular", "performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction", "error-monitoring-and-observability-sentry-opentelemetry"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/ssr-and-pre-rendering-with-angular-universal.md"
---

# SSR and Pre-rendering with Angular Universal

## Learning Objectives
- Bootstrap Angular apps on the server for faster first paint and SEO.
- Configure hybrid rendering: server-side render critical routes, pre-render marketing pages, hydrate on the client.
- Handle data fetching, caching, and error boundaries in a Universal-safe way.

## Setup Flow
```bash
ng add @nguniversal/express-engine
```
Generates `server.ts`, updates `angular.json`, and adds build targets.

### Key Files
- `main.server.ts`: bootstrap module/standalone config for SSR.
- `server.ts`: Express/Fastify adapter hosting the Universal engine.
- `app.config.server.ts`: server-specific providers (transfer state, interceptors).

## Data Fetching
- Use `TransferState` to avoid duplicate HTTP calls.
- Prefer absolute URLs and environment-aware HTTP interceptors.

```typescript
@Injectable()
export class ServerUrlInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    if (isPlatformServer(this.platformId) && req.url.startsWith('/api')) {
      req = req.clone({ url: `${environment.apiBase}${req.url}` });
    }
    return next.handle(req);
  }
}
```

## Pre-rendering
```bash
ng run app:prerender --routes / /concepts/advanced/custom-decorators-and-dynamic-components
```
Store output under `dist/app/browser` for CDN hosting.

## Hydration & Streaming
- Angular 17 enables partial hydration + streaming SSR.
- Use `provideClientHydration()` and `provideServerRendering()` accordingly.

## Error Handling
- Wrap Express handler with try/catch and log server render failures.
- Provide SSR-safe fallbacks for browser-only APIs (guard `window`, `localStorage`).

## Performance Tips
- Cache rendered HTML per route (Redis, Cloudflare) and invalidate on deploy.
- Use `TransferState` for initial content and revalidate via background fetch.

## Checklist
- [ ] Monitor TTFB, FCP, and CLS in Web Vitals to validate SSR impact.
- [ ] Keep server bundle lean—avoid shipping dev-only libraries.
- [ ] Secure SSR endpoint (Helmet, rate limiting) since it runs arbitrary routes.
- [ ] Test localized builds (`ng build --localize --configuration=production-ssr`).
- [ ] Provide logging/observability in server runtime.

## Next Steps
- Layer with [[progressive-web-apps-pwas-in-angular]] for offline fallback.
- Feed metrics into [[performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction]].
- Monitor SSR hosting via [[error-monitoring-and-observability-sentry-opentelemetry]].
