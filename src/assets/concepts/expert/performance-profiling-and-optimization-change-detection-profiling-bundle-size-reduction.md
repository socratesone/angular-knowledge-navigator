---
title: "Performance Profiling and Optimization (Change Detection Profiling, Bundle Size Reduction)"
slug: "performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction"
category: "Expert"
skillLevel: "expert"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["performance", "profiling", "bundle", "change-detection", "metrics"]
prerequisites: ["optimizing-change-detection-and-performance", "custom-build-configuration-and-webpack-adjustments", "ssr-and-pre-rendering-with-angular-universal"]
relatedTopics: ["error-monitoring-and-observability-sentry-opentelemetry", "progressive-web-apps-pwas-in-angular", "code-quality-automation-and-linting-enforcement"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction.md"
---

# Performance Profiling and Optimization (Change Detection Profiling, Bundle Size Reduction)

## Learning Objectives
- Diagnose change detection hotspots and memory leaks using Angular DevTools and browser profilers.
- Reduce bundle size with budgets, source-map analysis, and intelligent code splitting.
- Create performance SLIs + SLOs to keep regressions visible.

## Change Detection Profiling
- Use Angular DevTools “Profiler” to capture change detection cycles per component.
- Track `dirtyChecks` metric; targets > 100 per tick often signal pure pipes/signals opportunities.
- Adopt `markDirty` or signal-based flows to localize updates.

### Manual Instrumentation
```typescript
effect((onCleanup) => {
  const start = performance.now();
  this.renderData();
  const duration = performance.now() - start;
  this.metricService.record('concept.render.ms', duration);
});
```

## Bundle Analysis
- `ng build --stats-json` + `npx webpack-bundle-analyzer dist/stats.json`.
- Remove unused polyfills; rely on `browserslist` to drop legacy transforms.
- Prefer dynamic `import()` for rarely-used admin tools.

## Runtime Metrics
- Monitor Core Web Vitals (FCP, INP, CLS) via web-vitals library.
- Use `navigator.storage.estimate()` to watch cache pressure for PWAs.

## Optimization Playbook
1. Identify bottleneck (profiling screenshot).
2. Hypothesize fix (OnPush, memoization, virtualization).
3. Implement and rerun measurement.
4. Automate regression guard (performance test or budget).

## Checklist
- [ ] Establish budgets in `angular.json` (JS, CSS, initial chunks).
- [ ] Automate Lighthouse in CI with thresholds.
- [ ] Document performance decisions in `/specs/.../performance.md` (create file if missing).
- [ ] Tag code paths with `/* @perf-critical */` comments to surface during review.
- [ ] Share dashboards with leadership (Grafana, Datadog) for transparency.

## Next Steps
- Feed metrics into [[error-monitoring-and-observability-sentry-opentelemetry]].
- Align with [[progressive-web-apps-pwas-in-angular]] to maintain offline speed.
- Enforce budgets via [[code-quality-automation-and-linting-enforcement]].
