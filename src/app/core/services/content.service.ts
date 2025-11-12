import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentState, LoadingStatus, ContentError, CodeExample, BestPractice } from '../../shared/models';
import { MarkdownProcessorService, ProcessedContent } from './markdown-processor.service';

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

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private markdownProcessor: MarkdownProcessorService
  ) {}

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
   * Process markdown content with frontmatter support and sanitize HTML
   */
  private processMarkdown(markdown: string, topicId: string): Observable<ContentState> {
    try {
      // Use our enhanced markdown processor with frontmatter support
      const processedContent = this.markdownProcessor.processMarkdown(markdown);
      
      const contentState: ContentState = {
        topicId,
        markdown,
        renderedHtml: processedContent.html,
        loadingStatus: LoadingStatus.Loaded,
        lastLoaded: new Date(),
        scrollPosition: 0,
        // Store frontmatter metadata for potential UI enhancements
        metadata: processedContent.frontmatter
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
      // Process cross-references before markdown conversion
      const processedMarkdown = this.processCrossReferences(markdown);
      
      // Use our enhanced markdown processor with frontmatter support
      const processedContent = this.markdownProcessor.processMarkdown(processedMarkdown);
      
      const contentState: ContentState = {
        topicId,
        markdown: processedMarkdown,
        renderedHtml: processedContent.html,
        loadingStatus: LoadingStatus.Loaded,
        lastLoaded: new Date(),
        scrollPosition: 0,
        metadata: processedContent.frontmatter
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

  /**
   * Process cross-reference links in markdown content
   */
  private processCrossReferences(markdown: string): string {
    // Replace cross-reference syntax [[topic-id]] with proper links
    return markdown.replace(/\[\[([^\]]+)\]\]/g, (match, topicId) => {
      const cleanTopicId = topicId.trim();
      const displayText = cleanTopicId.replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      return `[${displayText}](/concepts/${cleanTopicId})`;
    });
  }

  /**
   * Extract best practice indicators from content
   */
  extractBestPractices(markdown: string): BestPractice[] {
    const practices: BestPractice[] = [];
    const bestPracticeRegex = /## ✅ Best Practice: (.+)\n([\s\S]*?)(?=\n## |$)/g;
    
    let match;
    while ((match = bestPracticeRegex.exec(markdown)) !== null) {
      const title = match[1];
      const content = match[2];
      
      practices.push({
        id: this.generateId(title),
        title: title,
        description: content.trim(),
        category: 'architecture', // Default category
        level: 'fundamentals', // Default level
        constitutional: title.toLowerCase().includes('constitutional'),
        examples: [],
        antiPatterns: [],
        relatedPractices: [],
        checklist: [],
        resources: []
      });
    }
    
    return practices;
  }

  /**
   * Extract code examples from markdown
   */
  extractCodeExamples(markdown: string): CodeExample[] {
    const examples: CodeExample[] = [];
    const codeBlockRegex = /```(\w+)\n([\s\S]*?)\n```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      const language = match[1];
      const code = match[2];
      
      examples.push({
        id: this.generateId(`code-${examples.length}`),
        title: `${language.toUpperCase()} Example`,
        description: 'Code example from content',
        language: language as any,
        code: code.trim(),
        explanation: '',
        bestPractice: code.includes('// Best practice') || code.includes('<!-- Best practice -->'),
        constitutional: code.includes('standalone') || code.includes('OnPush') || code.includes('signal'),
        difficulty: 1,
        tags: [language],
        relatedConcepts: [],
        prerequisites: [],
        category: 'component'
      });
    }
    
    return examples;
  }

  /**
   * Get related topics based on content analysis
   */
  getRelatedTopics(topicId: string): Observable<string[]> {
    const currentContent = this.currentContentSubject.value;
    if (currentContent.topicId !== topicId) {
      return of([]);
    }

    // Extract cross-references from current content
    const crossRefs = this.extractCrossReferences(currentContent.markdown);
    
    // Get prerequisites from topic level
    const level = topicId.split('/')[0];
    const relatedByLevel = this.getTopicsByLevel(level);
    
    return of([...crossRefs, ...relatedByLevel].slice(0, 5));
  }

  /**
   * Extract cross-reference links from markdown
   */
  private extractCrossReferences(markdown: string): string[] {
    const crossRefs: string[] = [];
    const crossRefRegex = /\[\[([^\]]+)\]\]/g;
    
    let match;
    while ((match = crossRefRegex.exec(markdown)) !== null) {
      crossRefs.push(match[1].trim());
    }
    
    return crossRefs;
  }

  /**
   * Get topics for a specific skill level
   */
  private getTopicsByLevel(level: string): string[] {
    // This would normally come from the navigation service
    const levelTopics: { [key: string]: string[] } = {
      'fundamentals': [
        'fundamentals/introduction-to-angular',
        'fundamentals/components-and-templates',
        'fundamentals/data-binding'
      ],
      'intermediate': [
        'intermediate/angular-signals',
        'intermediate/component-communication'
      ],
      'advanced': [
        'advanced/change-detection-strategies',
        'advanced/lazy-loading'
      ],
      'expert': [
        'expert/angular-constitution-and-best-practices'
      ]
    };
    
    return levelTopics[level] || [];
  }

  /**
   * Generate a unique ID from a string
   */
  private generateId(text: string): string {
    return text.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Check if content has prerequisites
   */
  hasPrerequisites(topicId: string): boolean {
    const level = topicId.split('/')[0];
    return level !== 'fundamentals';
  }

  /**
   * Get prerequisite topics for a given topic
   */
  getPrerequisites(topicId: string): string[] {
    const [level, topic] = topicId.split('/');
    
    // Define prerequisite relationships
    const prerequisites: { [key: string]: string[] } = {
      'intermediate/angular-signals': ['fundamentals/components-and-templates', 'fundamentals/data-binding'],
      'intermediate/component-communication': ['fundamentals/components-and-templates'],
      'advanced/change-detection-strategies': ['intermediate/angular-signals'],
      'advanced/lazy-loading': ['fundamentals/introduction-to-angular'],
      'expert/angular-constitution-and-best-practices': ['advanced/change-detection-strategies']
    };
    
    return prerequisites[topicId] || [];
  }
}