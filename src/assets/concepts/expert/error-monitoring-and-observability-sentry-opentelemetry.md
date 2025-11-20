---
title: "Error Monitoring and Observability (Sentry, OpenTelemetry)"
slug: "error-monitoring-and-observability-sentry-opentelemetry"
category: "Expert"
skillLevel: "expert"
difficulty: 4
estimatedReadingTime: 35
constitutional: true
tags: ["observability", "sentry", "opentelemetry", "monitoring"]
prerequisites: ["error-handling-and-globalerrorhandler", "ssr-and-pre-rendering-with-angular-universal", "performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction"]
relatedTopics: ["security-best-practices-xss-sanitization-csp", "integration-testing-and-continuous-integration-pipelines", "progressive-web-apps-pwas-in-angular"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/error-monitoring-and-observability-sentry-opentelemetry.md"
---

# Error Monitoring and Observability (Sentry, OpenTelemetry)

## Learning Objectives
- Capture frontend errors, performance traces, and custom metrics.
- Correlate browser spans with backend telemetry using OpenTelemetry (OTel).
- Create alerting + dashboards to close the loop on production incidents.

## Instrumentation Options
- **Sentry Angular SDK** for error + performance tracing.
- **OpenTelemetry Web** for vendor-neutral spans exported to collector (Jaeger, Honeycomb).

### Global Error Handler
```typescript
@Injectable()
export class MonitoringErrorHandler implements ErrorHandler {
  private sentry = inject(SentryService);
  handleError(error: any) {
    this.sentry.captureException(error);
    console.error(error);
  }
}
```

Provide via `bootstrapApplication(AppComponent, { providers: [{ provide: ErrorHandler, useClass: MonitoringErrorHandler }] })`.

## Sentry Setup
```typescript
Sentry.init({
  dsn: environment.sentryDsn,
  tracesSampleRate: 0.2,
  integrations: [new BrowserTracing({ routingInstrumentation: Sentry.routingInstrumentation })]
});
```

## OpenTelemetry Example
```typescript
const provider = new WebTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(new OTLPTraceExporter({ url: '/otel/v1/traces' })));
provider.register();

const tracer = provider.getTracer('concept-app');
const span = tracer.startSpan('content-load');
// ... fetch content
span.end();
```

## Dashboards & Alerts
- Create SLOs: error rate < 1%, P95 page load < 3s.
- Alert channels: Slack, PagerDuty, Opsgenie.
- Tag spans with `user.id`, `concept.topicId` (respect privacy policies).

## Checklist
- [ ] Strip PII before sending telemetry.
- [ ] Sample wisely (100% sampling is expensive); keep low-volume flows high sample.
- [ ] Test telemetry in staging before production rollout.
- [ ] Document incident response + dashboards in `/specs/.../runbook.md`.
- [ ] Integrate with CI to block deploys when error rate spike.

## Next Steps
- Link traces with [[performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction]].
- Feed alerts into [[integration-testing-and-continuous-integration-pipelines]] for automated rollback.
- Align with [[security-best-practices-xss-sanitization-csp]] for data retention.
