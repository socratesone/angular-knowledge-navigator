---
title: "Internationalization (i18n) Setup and Usage"
slug: "internationalization-i18n-setup-and-usage"
category: "Advanced"
skillLevel: "advanced"
difficulty: 3
estimatedReadingTime: 35
constitutional: true
tags: ["i18n", "localization", "translations", "build"]
prerequisites: ["routing-and-navigation-basics", "content-projection-and-ng-content", "deployment"]
relatedTopics: ["ssr-and-pre-rendering-with-angular-universal", "design-systems-and-theming-architecture", "microfrontend-architecture-and-module-federation"]
lastUpdated: "2025-11-18"
contentPath: "/assets/concepts/advanced/internationalization-i18n-setup-and-usage.md"
---

# Internationalization (i18n) Setup and Usage

## Learning Objectives
- Configure Angular’s built-in i18n pipeline for multiple locales.
- Manage translation extraction, review, and deployment workflows.
- Handle ICU pluralization, date/number formatting, and lazy locale data loading.

## Setup Steps
1. Add locales:
   ```bash
   ng add @angular/localize
   ```
2. Update `angular.json` with `i18n` section specifying source locale + targets.
3. Register locales at runtime:
   ```typescript
   import localeFr from '@angular/common/locales/fr';
   registerLocaleData(localeFr);
   ```

## Marking Strings
```html
<h1 i18n="@@conceptTitle">Component Communication</h1>
<p i18n>Description with <strong>rich text</strong>.</p>
```

### ICU Expressions
```html
<p i18n="@@lessonCount">
  {lessons, plural,
    =0 {No lessons}
    =1 {One lesson}
    other {# lessons}
  }
</p>
```

## Extraction & Translation
```bash
ng extract-i18n --output-path src/locale/messages.xlf
```
Send `.xlf` to translators, then place localized files under `src/locale/messages.fr.xlf` etc.

### Build Per Locale
```bash
ng build --localize
```
Generates `dist/<project>/<locale>/...`. Use `ng serve --configuration=fr` for local testing.

## Runtime Locale Switching
For SPA-style language toggles, consider:
- Transloco / ngx-translate for runtime JSON loading.
- Or embed multiple pre-rendered bundles behind localized routes (`/fr/concepts/...`).

## Date & Currency Pipes
```html
{{ price | currency: 'EUR':'symbol':'1.2-2':'fr' }}
```

## Testing Translation Quality
- Add Jest tests that parse XLIFF to ensure required ids exist.
- Use Cypress to switch locales and assert key headings.
- Monitor bundle sizes; lazy-load locale data where possible.

## Checklist
- [ ] Keep `meaning|description` metadata on translatable strings for translators.
- [ ] Store translation memory centrally (TMS, Git submodule).
- [ ] Automate extraction in CI (pull request comment reminding teams to update translations).
- [ ] Audit RTL support (dir="rtl" + logical CSS properties).
- [ ] Provide fallback for unsupported locales (redirect or default copy).

## Next Steps
- Combine with [[ssr-and-pre-rendering-with-angular-universal]] for SEO-friendly localized routes.
- Align tokens/spacing with [[design-systems-and-theming-architecture]].
- Plan governance with [[microfrontend-architecture-and-module-federation]] when multiple teams ship locales.
