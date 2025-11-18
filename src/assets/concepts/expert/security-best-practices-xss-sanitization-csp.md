---
title: "Security Best Practices (XSS, Sanitization, CSP)"
slug: "security-best-practices-xss-sanitization-csp"
category: "Expert"
skillLevel: "expert"
difficulty: 4
estimatedReadingTime: 40
constitutional: true
tags: ["security", "xss", "csp", "sanitization", "owasp"]
prerequisites: ["http-client-and-interceptors", "custom-structural-directives", "application-architecture-and-module-boundaries"]
relatedTopics: ["error-monitoring-and-observability-sentry-opentelemetry", "code-quality-automation-and-linting-enforcement", "microfrontend-architecture-and-module-federation"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/expert/security-best-practices-xss-sanitization-csp.md"
---

# Security Best Practices (XSS, Sanitization, CSP)

## Learning Objectives
- Mitigate injection attacks in Angular applications.
- Enforce strict Content Security Policy (CSP) headers and Trusted Types.
- Harden templates, HTTP calls, and 3rd-party integrations.

## XSS Defense-in-Depth
- Angular templates auto-escape by default. Avoid `innerHTML` unless sanitized.
- Use `DomSanitizer` carefully; prefer `bypassSecurityTrust*` only for vetted content.
- Validate user inputs server-side even if client sanitizes.

### Safe HTML Rendering
```typescript
@Component({ template: `<div [innerHTML]="safeHtml"></div>` })
export class MarkdownBlockComponent {
  private sanitizer = inject(DomSanitizer);
  private markdown = inject(MarkdownService);

  safeHtml = signal<string>('');

  render(md: string) {
    const compiled = this.markdown.toHtml(md);
    this.safeHtml.set(this.sanitizer.sanitize(SecurityContext.HTML, compiled) ?? '');
  }
}
```

## CSP + Trusted Types
- Configure headers: `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{{nonce}}';`.
- Adopt Trusted Types (`header: require-trusted-types-for 'script'`).
- Integrate with Angular CLI builder via `headers` config or hosting platform (Firebase, Vercel).

## HTTP Security
- Use interceptors to append auth tokens securely; avoid localStorage for sensitive tokens.
- Enable `HttpClientXsrfModule` for cookie-based CSRF defense.
- Validate API domains to prevent SSRF in server-rendered contexts.

## Dependency Hygiene
- Audit packages with `npm audit`, `socket.dev`, or `snyk`.
- Prefer `Subresource Integrity (SRI)` for CDN assets.
- Lock down environment secrets via `.env` and secret managers.

## Checklist
- [ ] Document threat model per feature (PII, payment data, etc.).
- [ ] Run ESLint security rules + Angular template lint.
- [ ] Add automated ZAP/OWASP scans to CI.
- [ ] Ensure service workers don’t cache authenticated API responses without encryption.
- [ ] Provide incident response playbooks.

## Next Steps
- Monitor runtime issues with [[error-monitoring-and-observability-sentry-opentelemetry]].
- Enforce at scale via [[code-quality-automation-and-linting-enforcement]].
- Coordinate with [[microfrontend-architecture-and-module-federation]] teams to standardize CSP.
