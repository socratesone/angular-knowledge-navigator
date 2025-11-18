---
title: "End-to-End Testing with Cypress or Playwright"
slug: "end-to-end-testing-with-cypress-or-playwright"
category: "Advanced"
skillLevel: "advanced"
difficulty: 3
estimatedReadingTime: 35
constitutional: true
tags: ["testing", "e2e", "cypress", "playwright", "automation"]
prerequisites: ["routing-and-navigation-basics", "http-client-and-interceptors", "unit-testing-with-jest-and-angular-testing-library"]
relatedTopics: ["integration-testing-and-continuous-integration-pipelines", "security-best-practices-xss-sanitization-csp", "progressive-web-apps-pwas-in-angular"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/end-to-end-testing-with-cypress-or-playwright.md"
---

# End-to-End Testing with Cypress or Playwright

## Learning Objectives
- Author resilient end-to-end tests using Cypress Component/E2E runner or Playwright.
- Stub network calls, seed databases, and orchestrate test data pipelines.
- Integrate cross-browser suites into CI with screenshots, traces, and flaky-test management.

## Tooling Comparison
| Capability | Cypress | Playwright |
| --- | --- | --- |
| Auto-waiting | ✅ | ✅ |
| Cross-browser (Chromium/WebKit/Firefox) | Partial | ✅ |
| Component testing | ✅ | ⏳ |
| Trace viewer | Experimental | ✅ |

## Example: Cypress Test
```typescript
describe('Concept Navigator', () => {
  beforeEach(() => {
    cy.intercept('GET', '/assets/data/learning-path.json', { fixture: 'learning-path.json' });
  });

  it('navigates to Component Communication article', () => {
    cy.visit('/concepts/intermediate/component-communication-input-output-viewchild-service-based');
    cy.findByRole('heading', { name: /Component Communication/i }).should('exist');
    cy.findByTestId('table-of-contents').should('be.visible');
  });
});
```

## Example: Playwright Test
```typescript
test.describe('Reader Experience', () => {
  test('loads advanced article', async ({ page }) => {
    await page.route('**/assets/data/learning-path.json', route => route.fulfill({ path: 'tests/fixtures/learning-path.json' }));
    await page.goto('/concepts/advanced/custom-decorators-and-dynamic-components');
    await expect(page.getByText('Dynamic Components')).toBeVisible();
  });
});
```

## Best Practices
- Use data-testids sparingly; prefer accessible roles/text when stable.
- Mock network latency to surface spinner regressions.
- Reset application state between tests (database snapshot, API cleanup).
- Capture screenshots/video on failure for triage.

## CI Integration
- Split suites by smoke vs. regression to shorten feedback.
- Parallelize browsers using GitHub Actions matrix.
- Publish Playwright traces (`npx playwright show-trace trace.zip`) as artifacts.

## Checklist
- [ ] Align scenarios with user journeys defined in `specs/plan.md`.
- [ ] Keep tests idempotent—no reliance on previous suites.
- [ ] Add accessibility assertions via `cy.injectAxe()` or Playwright Axe plugin.
- [ ] Fail fast on console errors using `cy.on('window:before:load', ...)` or Playwright `page.on('console', ...)`.
- [ ] Tag flaky tests and quarantine until stabilized.

## Next Steps
- Feed pass/fail metrics into [[integration-testing-and-continuous-integration-pipelines]].
- Validate security flows alongside [[security-best-practices-xss-sanitization-csp]].
- Run smoke checks post-deploy for [[progressive-web-apps-pwas-in-angular]].
