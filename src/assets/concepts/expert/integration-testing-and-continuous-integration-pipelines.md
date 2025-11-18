---
title: "Integration Testing and Continuous Integration Pipelines"
slug: "integration-testing-and-continuous-integration-pipelines"
category: "Expert"
skillLevel: "expert"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["ci", "integration-testing", "devops", "pipelines"]
prerequisites: ["unit-testing-with-jest-and-angular-testing-library", "end-to-end-testing-with-cypress-or-playwright", "monorepo-and-workspace-management-nx-angular-cli-workspaces"]
relatedTopics: ["code-quality-automation-and-linting-enforcement", "performance-profiling-and-optimization-change-detection-profiling-bundle-size-reduction", "error-monitoring-and-observability-sentry-opentelemetry"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/integration-testing-and-continuous-integration-pipelines.md"
---

# Integration Testing and Continuous Integration Pipelines

## Learning Objectives
- Build integration tests that wire multiple Angular services/modules together.
- Design CI matrices covering lint, unit, integration, e2e, and deploy checks with caching.
- Collect artifacts (coverage, Lighthouse, traces) for governance.

## Integration Test Types
- **Domain-level**: instantiate real services + HTTP mocks.
- **Module harness**: boot feature module + router to validate flows.
- **Contract tests**: verify API adapters against recorded responses.

```typescript
describe('ContentService Integration', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [ContentService, HttpClientTestingModule]
  }));

  it('loads markdown with metadata', inject([
    ContentService, HttpTestingController
  ], (service, http) => {
    service.loadContent('advanced/custom-decorators').subscribe();
    http.expectOne('assets/concepts/advanced/custom-decorators-and-dynamic-components.md');
  }));
});
```

## CI Pipeline Blueprint (GitHub Actions)
```yaml
name: CI
on: [pull_request]
jobs:
  lint: { runs-on: ubuntu-latest, steps: [...] }
  test: { needs: lint, steps: [...] }
  integration:
    needs: test
    strategy:
      matrix:
        node: [18, 20]
    steps:
      - run: npm run test:integration
  e2e:
    needs: integration
    steps:
      - run: npm run e2e:ci
```

### Optimizations
- Leverage Nx `affected` to limit scope.
- Cache `node_modules` + Nx results.
- Run Playwright with `--reporter=list,line`; upload traces.

## Release Gates
- Require green integration + e2e jobs.
- Publish preview environments (Vercel/Netlify) for manual QA.
- Automate changelog + version bump when pipeline passes on `main`.

## Checklist
- [ ] Integration tests live under `/tests/integration` with clear owners.
- [ ] CI secrets stored in GitHub OIDC/Azure Key Vault.
- [ ] Add flaky-test detection (rerun once with warning) but fail if unstable.
- [ ] Store coverage + performance artifacts for 30 days.
- [ ] Document rollback + red/green deployment procedures.

## Next Steps
- Automate static checks via [[code-quality-automation-and-linting-enforcement]].
- Feed runtime metrics to [[error-monitoring-and-observability-sentry-opentelemetry]].
- Connect CI triggers with [[monorepo-and-workspace-management-nx-angular-cli-workspaces]] dependency graph.
