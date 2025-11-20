---
title: "Environment Configuration and Environments.ts"
slug: "environment-configuration-and-environments-ts"
category: "Intermediate"
skillLevel: "intermediate"
difficulty: 3
estimatedReadingTime: 25
constitutional: true
tags: ["intermediate", "environment"]
prerequisites: []
relatedTopics: []
lastUpdated: "2025-11-11"
contentPath: "/assets/concepts/intermediate/environment-configuration-and-environments-ts.md"
---

# Environment Configuration and Environments.ts

## Learning Objectives
- Structure Angular environment files for local, staging, and production builds.
- Securely expose feature flags, API URLs, and platform metadata without leaking secrets.
- Validate environment switching with tests, Git hooks, and CI visibility.

## Overview
Angular projects typically ship with `/src/environments/environment.ts` (default) and `environment.development.ts`. Intermediate teams often add staging, demo, or end-to-end variations. The Angular CLI swaps files at build time through `angular.json` so your runtime bundle receives the correct configuration.

## Environment File Anatomy
```typescript
// src/environments/environment.base.ts
export const baseEnvironment = {
	production: true,
	apiBaseUrl: 'https://api.prod.example.com',
	featureFlags: {
		enableKnowledgeNavigator: true,
		enablePlayground: false
	},
	sentryDsn: 'https://sentry.io/project'
};

// src/environments/environment.ts
import { baseEnvironment } from './environment.base';
export const environment = { ...baseEnvironment };

// src/environments/environment.development.ts
import { baseEnvironment } from './environment.base';
export const environment = {
	...baseEnvironment,
	production: false,
	apiBaseUrl: 'http://localhost:3333',
	featureFlags: {
		...baseEnvironment.featureFlags,
		enablePlayground: true
	}
};
```

> Tip: use `as const` or `Readonly` when exporting to preserve literal types for better IntelliSense.

## Wiring in `angular.json`
```json
"configurations": {
	"production": {
		"fileReplacements": [
			{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.production.ts" }
		]
	},
	"staging": {
		"fileReplacements": [
			{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.staging.ts" }
		]
	}
}
```

Run `ng build --configuration=staging` to pick up the staging config.

## Using Environment Values
```typescript
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
	readonly baseUrl = environment.apiBaseUrl;
	readonly flags = environment.featureFlags;
}

export const provideApiBase = () => (
	{ provide: API_BASE_URL, useValue: environment.apiBaseUrl }
);
```

Avoid accessing environment values directly inside templates; inject services or tokens for testability.

## Feature Flag Patterns
- Keep flags grouped under `featureFlags` to simplify toggling.
- For runtime toggles, consider remote config services; seed defaults from static environment files.
- Document expiration dates for temporary flags.

## Secrets & Security
- **Never** store credentials or tokens in environment files—they end up in the client bundle.
- Use environment files for public info (API host, Auth0 domain, instrumentation IDs) only.
- For SSR, read secure values from server-side environment variables instead.

## Testing Strategies
- Provide a helper that swaps the environment for tests:
	```typescript
	export function mockEnvironment(overrides: Partial<typeof environment>) {
		return { ...environment, ...overrides } as const;
	}
	```
- Jest: mock `../environments/environment` module and assert configuration-dependent logic.
- E2E: expose the active configuration via data attribute or API so tests can assert correct host.

## Governance Checklist
- [ ] Keep environment files under 1 screenful; break out nested config objects if needed.
- [ ] Version-control `environment*.ts` but store environment-specific secrets in CI/CD.
- [ ] Add README table enumerating each configuration and intended usage.
- [ ] Fallback gracefully when critical values missing (throw descriptive error in development).
- [ ] Validate environment names with type-safe union (e.g., `type EnvironmentName = 'development' | 'production' | 'staging';`).

## Next Steps
- Use [[security-best-practices-xss-sanitization-csp]] to secure downstream services referenced by environments.
- Feed configuration metadata into [[integration-testing-and-continuous-integration-pipelines]] for targeted test matrices.
- Pair with [[monorepo-and-workspace-management-nx-angular-cli-workspaces]] when managing dozens of apps.
1. Key concept validation questions
2. Implementation strategy questions  
3. Performance and best practice questions
4. Integration and architecture questions

## Next Steps
Related advanced topics to explore after mastering Environment Configuration and Environments.ts.

## Expansion Guidance for LLMs
This comprehensive stub provides the foundation for detailed content expansion covering all aspects of Environment Configuration and Environments.ts in modern Angular development, including constitutional practices, performance optimization, testing strategies, and real-world implementation patterns.
