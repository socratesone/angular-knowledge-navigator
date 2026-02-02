# Angular Knowledge Navigator

Interactive documentation and learning platform built with Angular. Content is authored in markdown and rendered in-app with syntax highlighting.

## What it does

- Browse Angular concepts by skill level (Fundamentals → Expert)
- View rich markdown content with TypeScript/HTML/SCSS examples
- Search/filter topics and deep-link to concept pages
- Responsive layout with keyboard-friendly navigation

## Tech

- Angular 17 (standalone components)
- TypeScript, RxJS
- Markdown rendering via `marked`
- Syntax highlighting via Prism.js
- Tests: Jest unit tests, Cypress e2e

## Development

```bash
npm install
npm start
```

```bash
npm test
npm run lint
```

```bash
npm run build
npm run e2e
```

## Content + structure

- App code lives under `src/app/`
- Markdown content lives under `src/assets/concepts/`
- Feature/spec notes live under `specs/`

## License

MIT (see `LICENSE`).