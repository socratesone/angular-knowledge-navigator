import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentState, LoadingStatus, ContentError } from '../../shared/models';

// Re-export for backward compatibility (need runtime values for enums)
export { LoadingStatus } from '../../shared/models';
export type { ContentState, ContentError } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private readonly contentCache = new Map<string, string>();
  private readonly currentContentSubject = new BehaviorSubject<ContentState>({
    topicId: '',
    markdown: '',
    renderedHtml: '',
    loadingStatus: LoadingStatus.Idle,
    lastLoaded: new Date(),
    scrollPosition: 0
  });

  readonly currentContent$ = this.currentContentSubject.asObservable();

  // Configure marked for syntax highlighting and security
  private readonly markedOptions = {
    highlight: (code: string, lang: string) => {
      // Prism.js highlighting would be integrated here
      // For now, return code wrapped in pre/code tags
      return `<pre><code class="language-${lang}">${this.escapeHtml(code)}</code></pre>`;
    },
    breaks: true,
    gfm: true
  };

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    marked.setOptions(this.markedOptions);
  }

  /**
   * Load content for a specific topic
   */
  loadContent(topicId: string): Observable<ContentState> {
    this.updateLoadingStatus(LoadingStatus.Loading, topicId);

    // Check cache first
    if (this.contentCache.has(topicId)) {
      const cachedMarkdown = this.contentCache.get(topicId)!;
      return this.processMarkdown(cachedMarkdown, topicId);
    }

    // Load from assets
    const contentPath = this.getContentPath(topicId);
    
    return this.http.get(contentPath, { responseType: 'text' }).pipe(
      map(markdown => {
        this.contentCache.set(topicId, markdown);
        return this.processMarkdownSync(markdown, topicId);
      }),
      catchError(error => {
        const contentError: ContentError = {
          type: 'not-found',
          message: `Content not found for topic: ${topicId}`,
          details: error.message
        };
        
        const errorState: ContentState = {
          topicId,
          markdown: '',
          renderedHtml: this.createErrorContent(contentError),
          loadingStatus: LoadingStatus.Error,
          error: contentError,
          lastLoaded: new Date(),
          scrollPosition: 0
        };

        this.currentContentSubject.next(errorState);
        return of(errorState);
      }),
      shareReplay(1)
    );
  }

  /**
   * Process markdown content and sanitize HTML
   */
  private processMarkdown(markdown: string, topicId: string): Observable<ContentState> {
    try {
      const htmlContent = marked(markdown) as string;
      const sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
      
      const contentState: ContentState = {
        topicId,
        markdown,
        renderedHtml: sanitizedHtml,
        loadingStatus: LoadingStatus.Loaded,
        lastLoaded: new Date(),
        scrollPosition: 0
      };

      this.currentContentSubject.next(contentState);
      return of(contentState);
      
    } catch (error) {
      const contentError: ContentError = {
        type: 'parse-error',
        message: 'Failed to parse markdown content',
        details: error instanceof Error ? error.message : 'Unknown parsing error'
      };

      return throwError(() => contentError);
    }
  }

  /**
   * Synchronous markdown processing for cached content
   */
  private processMarkdownSync(markdown: string, topicId: string): ContentState {
    try {
      const htmlContent = marked(markdown) as string;
      const sanitizedHtml = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
      
      const contentState: ContentState = {
        topicId,
        markdown,
        renderedHtml: sanitizedHtml,
        loadingStatus: LoadingStatus.Loaded,
        lastLoaded: new Date(),
        scrollPosition: 0
      };

      this.currentContentSubject.next(contentState);
      return contentState;
      
    } catch (error) {
      const contentError: ContentError = {
        type: 'parse-error',
        message: 'Failed to parse markdown content',
        details: error instanceof Error ? error.message : 'Unknown parsing error'
      };

      const errorState: ContentState = {
        topicId,
        markdown: '',
        renderedHtml: this.createErrorContent(contentError),
        loadingStatus: LoadingStatus.Error,
        error: contentError,
        lastLoaded: new Date(),
        scrollPosition: 0
      };

      this.currentContentSubject.next(errorState);
      return errorState;
    }
  }

  /**
   * Get the file path for a topic's content
   */
  private getContentPath(topicId: string): string {
    // Topic ID format: "level/topic-name"
    // e.g., "fundamentals/introduction-to-angular"
    return `/assets/concepts/${topicId}.md`;
  }

  /**
   * Update loading status
   */
  private updateLoadingStatus(status: LoadingStatus, topicId?: string): void {
    const currentState = this.currentContentSubject.value;
    const updatedState: ContentState = {
      ...currentState,
      loadingStatus: status,
      topicId: topicId || currentState.topicId
    };
    
    this.currentContentSubject.next(updatedState);
  }

  /**
   * Create error content HTML
   */
  private createErrorContent(error: ContentError): SafeHtml {
    const errorHtml = `
      <div class="error-content">
        <h2>⚠️ Content Error</h2>
        <p><strong>Type:</strong> ${error.type}</p>
        <p><strong>Message:</strong> ${error.message}</p>
        ${error.details ? `<p><strong>Details:</strong> ${error.details}</p>` : ''}
        <p>This is a learning opportunity! Check the console for more details.</p>
      </div>
    `;
    
    return this.sanitizer.bypassSecurityTrustHtml(errorHtml);
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Preload content for better performance
   */
  preloadContent(topicIds: string[]): Observable<void> {
    const loadPromises = topicIds.map(id => 
      this.http.get(this.getContentPath(id), { responseType: 'text' }).pipe(
        map(content => {
          this.contentCache.set(id, content);
        }),
        catchError(() => of(null)) // Ignore preload errors
      ).toPromise()
    );

    return new Observable(subscriber => {
      Promise.all(loadPromises).then(() => {
        subscriber.next();
        subscriber.complete();
      });
    });
  }

  /**
   * Clear content cache
   */
  clearCache(): void {
    this.contentCache.clear();
  }

  /**
   * Get cache size information
   */
  getCacheInfo(): { size: number; topics: string[] } {
    return {
      size: this.contentCache.size,
      topics: Array.from(this.contentCache.keys())
    };
  }
}