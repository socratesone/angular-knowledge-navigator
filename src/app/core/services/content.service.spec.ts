import { expect, jest } from '@jest/globals';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';

import { ContentService, LoadingStatus } from './content.service';

describe('ContentService - Navigation to Content Flow Integration', () => {
  let service: ContentService;
  let httpMock: HttpTestingController;
  let sanitizer: DomSanitizer;

  const mockMarkdownContent = `# Introduction to Angular

Angular is a platform and framework for building single-page client applications using HTML and TypeScript.

## Key Features

- Component-based architecture
- Dependency injection
- TypeScript support

\`\`\`typescript
import { Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-root',
  template: '<h1>Hello Angular!</h1>'
})
export class AppComponent {}
\`\`\`

## Best Practices

1. Use standalone components
2. Implement OnPush change detection
3. Leverage Angular Signals`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContentService]
    });

    service = TestBed.inject(ContentService);
    httpMock = TestBed.inject(HttpTestingController);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  afterEach(() => {
    httpMock.verify();
    service.clearCache();
  });

  describe('Content Loading Flow', () => {
    it('should load content for a topic from assets', (done) => {
      const topicId = 'fundamentals/introduction-to-angular';

      service.loadContent(topicId).subscribe(contentState => {
        expect(contentState.topicId).toBe(topicId);
        expect(contentState.loadingStatus).toBe(LoadingStatus.Loaded);
        expect(contentState.markdown).toBe(mockMarkdownContent);
        expect(contentState.renderedHtml).toBeTruthy();
        expect(contentState.lastLoaded).toBeInstanceOf(Date);
        done();
      });

      const req = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('text');
      req.flush(mockMarkdownContent);
    });

    it('should handle content not found error', (done) => {
      const topicId = 'non-existent/topic';

      service.loadContent(topicId).subscribe(contentState => {
        expect(contentState.topicId).toBe(topicId);
        expect(contentState.loadingStatus).toBe(LoadingStatus.Error);
        expect(contentState.error).toBeDefined();
        expect(contentState.error!.type).toBe('not-found');
        expect(contentState.error!.message).toContain(topicId);
        done();
      });

      const req = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should cache loaded content', (done) => {
      const topicId = 'fundamentals/components';

      // First load
      service.loadContent(topicId).subscribe(() => {
        // Second load should use cache
        service.loadContent(topicId).subscribe(contentState => {
          expect(contentState.topicId).toBe(topicId);
          expect(contentState.loadingStatus).toBe(LoadingStatus.Loaded);
          done();
        });

        // Should not make another HTTP request
        httpMock.expectNone(`assets/concepts/${topicId}.md`);
      });

      const req = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      req.flush(mockMarkdownContent);
    });
  });

  describe('Content Processing Integration', () => {
    it('should process markdown with syntax highlighting', (done) => {
      const topicId = 'fundamentals/components';

      service.loadContent(topicId).subscribe(contentState => {
        expect(contentState.renderedHtml).toBeTruthy();
        
        // Check that HTML contains processed content
        const htmlString = contentState.renderedHtml.toString();
        expect(htmlString).toContain('<h1');
        expect(htmlString).toContain('Introduction to Angular');
        expect(htmlString).toContain('<pre');
        expect(htmlString).toContain('class="language-typescript"');
        
        done();
      });

      const req = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      req.flush(mockMarkdownContent);
    });

    it('should handle markdown processing errors gracefully', (done) => {
      const topicId = 'fundamentals/invalid-markdown';
      const invalidMarkdown = '# Valid Title\n\n```typescript\n// Unclosed code block without closing backticks';

      service.loadContent(topicId).subscribe(contentState => {
        expect(contentState.topicId).toBe(topicId);
        expect(contentState.loadingStatus).toBe(LoadingStatus.Loaded);
        // Should still render something even with malformed markdown
        expect(contentState.renderedHtml).toBeTruthy();
        done();
      });

      const req = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      req.flush(invalidMarkdown);
    });
  });

  describe('Navigation Integration', () => {
    it('should handle topic navigation path format correctly', (done) => {
      const level = 'intermediate';
      const topic = 'angular-signals';
      const topicId = `${level}/${topic}`;

      service.loadContent(topicId).subscribe(contentState => {
        expect(contentState.topicId).toBe(topicId);
        done();
      });

      const expectedPath = `assets/concepts/${level}/${topic}.md`;
      const req = httpMock.expectOne(expectedPath);
      req.flush('# Angular Signals\n\nModern reactive state management.');
    });

    it('should support deep topic paths', (done) => {
      const complexTopicId = 'advanced/performance/change-detection-strategies';

      service.loadContent(complexTopicId).subscribe(contentState => {
        expect(contentState.topicId).toBe(complexTopicId);
        done();
      });

      const req = httpMock.expectOne(`assets/concepts/${complexTopicId}.md`);
      req.flush('# Change Detection Strategies');
    });
  });

  describe('Observable State Management', () => {
    it('should emit loading states correctly', (done) => {
      const topicId = 'fundamentals/data-binding';
      const states: LoadingStatus[] = [];

      const subscription = service.currentContent$.subscribe(contentState => {
        states.push(contentState.loadingStatus);
        
        if (states.length === 3) {
          expect(states[0]).toBe(LoadingStatus.Idle);
          expect(states[1]).toBe(LoadingStatus.Loading);
          expect(states[2]).toBe(LoadingStatus.Loaded);
          subscription.unsubscribe();
          done();
        }
      });

      service.loadContent(topicId).subscribe();

      const req = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      req.flush('# Data Binding\n\nTwo-way data binding in Angular.');
    });

    it('should maintain reactive state across multiple subscriptions', (done) => {
      const topicId = 'fundamentals/directives';
      const loadedBy = new Set<string>();

      const sub1 = service.currentContent$.subscribe(contentState => {
        if (contentState.loadingStatus === LoadingStatus.Loaded) {
          loadedBy.add('first');
        }
      });

      const sub2 = service.currentContent$.subscribe(contentState => {
        if (contentState.loadingStatus === LoadingStatus.Loaded) {
          loadedBy.add('second');
        }
      });

      service.loadContent(topicId).subscribe(contentState => {
        expect(contentState.topicId).toBe(topicId);
        expect(loadedBy.has('first')).toBe(true);
        expect(loadedBy.has('second')).toBe(true);
        sub1.unsubscribe();
        sub2.unsubscribe();
        done();
      });

      const req = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      req.flush('# Directives\n\nCustom directives in Angular.');
    });
  });

  describe('Content Preloading', () => {
    it('should preload multiple topics efficiently', (done) => {
      const topicIds = [
        'fundamentals/introduction',
        'fundamentals/components',
        'intermediate/signals'
      ];

      service.preloadContent(topicIds).subscribe(() => {
        // Verify all content is cached
        const cacheInfo = service.getCacheInfo();
        expect(cacheInfo.size).toBe(3);
  expect(cacheInfo.topics).toEqual(expect.arrayContaining(topicIds));
        done();
      });

      // Expect HTTP requests for all topics
      topicIds.forEach((topicId, index) => {
        const req = httpMock.expectOne(`assets/concepts/${topicId}.md`);
        req.flush(`# Topic ${index + 1}\n\nContent for ${topicId}`);
      });
    });

    it('should handle preload failures gracefully', (done) => {
      const topicIds = [
        'fundamentals/existing-topic',
        'fundamentals/missing-topic'
      ];

      service.preloadContent(topicIds).subscribe(() => {
        // Should complete even if some topics fail
        const cacheInfo = service.getCacheInfo();
        expect(cacheInfo.size).toBe(1); // Only successful loads cached
        done();
      });

      // First request succeeds
      const req1 = httpMock.expectOne('assets/concepts/fundamentals/existing-topic.md');
      req1.flush('# Existing Topic');

      // Second request fails
      const req2 = httpMock.expectOne('assets/concepts/fundamentals/missing-topic.md');
      req2.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors on retry', (done) => {
      const topicId = 'fundamentals/retry-test';
      let attemptCount = 0;

      service.loadContent(topicId).subscribe({
        next: (contentState) => {
          if (attemptCount === 0) {
            expect(contentState.loadingStatus).toBe(LoadingStatus.Error);
            
            // Retry the same content
            service.loadContent(topicId).subscribe(retryState => {
              expect(retryState.loadingStatus).toBe(LoadingStatus.Loaded);
              done();
            });
          }
        }
      });

      // First request fails
      const req1 = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      req1.error(new ErrorEvent('Network error'));
      attemptCount++;

      // Second request succeeds
      const req2 = httpMock.expectOne(`assets/concepts/${topicId}.md`);
      req2.flush('# Retry Test\n\nContent loaded successfully on retry.');
    });
  });
});