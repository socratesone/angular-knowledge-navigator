import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ContentState, LoadingStatus, ContentError, CodeExample, BestPractice } from '../../shared/models';
import { MarkdownProcessorService, ProcessedContent } from './markdown-processor.service';
import { AssetPathService } from './asset-path.service';

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
    private markdownProcessor: MarkdownProcessorService,
    private assetPathService: AssetPathService
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
      // Remove duplicate code example blocks (keep first occurrence)
      const cleanedMarkdown = this.removeDuplicateCodeExamples(markdown);

      // Use our enhanced markdown processor with frontmatter support
      const processedContent = this.markdownProcessor.processMarkdown(cleanedMarkdown);
      
      const contentState: ContentState = {
        topicId,
        markdown: cleanedMarkdown,
        renderedHtml: processedContent.html,
        loadingStatus: LoadingStatus.Loaded,
        lastLoaded: new Date(),
        scrollPosition: 0,
        // Store filtered frontmatter metadata (educational fields only)
        metadata: this.filterEducationalMetadata(processedContent.frontmatter)
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
      let processedMarkdown = this.processCrossReferences(markdown);
      
      // Remove duplicate code example blocks before processing
      processedMarkdown = this.removeDuplicateCodeExamples(processedMarkdown);

      // Use our enhanced markdown processor with frontmatter support
      const processedContent = this.markdownProcessor.processMarkdown(processedMarkdown);
      
      const contentState: ContentState = {
        topicId,
        markdown: processedMarkdown,
        renderedHtml: processedContent.html,
        loadingStatus: LoadingStatus.Loaded,
        lastLoaded: new Date(),
        scrollPosition: 0,
        metadata: this.filterEducationalMetadata(processedContent.frontmatter)
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
   * Remove duplicate fenced code blocks from markdown while preserving the first occurrence.
   * This helps eliminate light/dark duplicate examples or accidental repeated snippets.
   */
  private removeDuplicateCodeExamples(markdown: string): string {
    if (!markdown) return markdown;

    // Match fenced code blocks including info string (```lang ... ```)
    const fenceRegex = /```[\s\S]*?```/g;
    const seen = new Set<string>();
    let lastIndex = 0;
    let result = '';

    const matches = [...markdown.matchAll(fenceRegex)];

    if (matches.length === 0) return markdown;

    for (const m of matches) {
      const match = m[0];
      const index = m.index ?? -1;

      // Append the content between lastIndex and this match start
      result += markdown.slice(lastIndex, index);

      // Normalize the code block content for comparison (strip info string and trim)
      const inner = match.replace(/^```\s*[^\n]*\n?|```$/g, '').replace(/\r\n/g, '\n').trim();

      if (!seen.has(inner)) {
        // Keep first occurrence
        seen.add(inner);
        result += match;
      } else {
        // Duplicate found: remove it (skip adding)
        // Also remove any immediately preceding single-line caption like '```output' or simple titles
        // (Keep it simple: we already removed the block itself)
      }

      lastIndex = index + match.length;
    }

    // Append any remaining tail content
    result += markdown.slice(lastIndex);

    return result;
  }

  /**
   * Get the file path for content based on topic ID
   */
  private getContentPath(topicId: string): string {
    // Topic ID format: "level/topic-name"
    // e.g., "fundamentals/introduction-to-angular"
    // Use relative path to respect base href for subdirectory deployments
    const assetPath = `assets/concepts/${topicId}.md`;
    return this.assetPathService.resolveAssetPath(assetPath);
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

  /**
   * Load default content on application startup
   * @returns Observable that emits when default content is loaded
   */
  loadDefaultContent(): Observable<ContentState> {
    const defaultTopicId = 'fundamentals/introduction-to-angular';
    return this.loadContent(defaultTopicId);
  }

  /**
   * Generate table of contents from current content
   * @returns Observable with TOC sections
   */
  generateTOC(): Observable<any[]> {
    const currentState = this.currentContentSubject.value;
    if (!currentState.markdown) {
      return of([]);
    }

    const toc = this.markdownProcessor.generateTOCFromContent(currentState.markdown);
    return of(toc);
  }

  /**
   * Extract headings with enhanced metadata for TOC generation
   * @param topicId Topic identifier
   * @returns Observable with enhanced heading data
   */
  extractEnhancedHeadings(topicId: string): Observable<any[]> {
    return this.loadContent(topicId).pipe(
      map(state => {
        if (!state.markdown) return [];
        
        const headings = this.markdownProcessor.extractHeadings(state.markdown);
        return headings.map((heading, index) => ({
          ...heading,
          index,
          estimatedPosition: this.estimateHeadingPosition(state.markdown, heading.text),
          sectionLength: this.calculateSectionLength(state.markdown, heading.text, index, headings),
          hasCodeExamples: this.sectionHasCodeExamples(state.markdown, heading.text, index, headings),
          complexity: this.calculateSectionComplexity(state.markdown, heading.text, index, headings)
        }));
      })
    );
  }

  /**
   * Validate TOC anchor IDs in content
   * @param content Markdown content
   * @returns Array of missing or invalid anchor IDs
   */
  validateTOCAnchors(content: string): string[] {
    const headings = this.markdownProcessor.extractHeadings(content);
    const processedContent = this.markdownProcessor.processMarkdown(content);
    
    // Extract HTML string from SafeHtml for validation
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedContent.html.toString();
    const htmlString = tempDiv.innerHTML;
    
    const missingAnchors: string[] = [];
    
    headings.forEach(heading => {
      const expectedId = this.markdownProcessor.generateAnchorId(heading.text);
      if (!htmlString.includes(`id="${expectedId}"`)) {
        missingAnchors.push(expectedId);
      }
    });
    
    return missingAnchors;
  }

  /**
   * Estimate heading position as percentage of document
   */
  private estimateHeadingPosition(content: string, headingText: string): number {
    const headingIndex = content.indexOf(headingText);
    if (headingIndex === -1) return 0;
    
    return Math.round((headingIndex / content.length) * 100);
  }

  /**
   * Calculate section length (characters between this heading and next)
   */
  private calculateSectionLength(content: string, headingText: string, index: number, allHeadings: any[]): number {
    const currentHeadingIndex = content.indexOf(headingText);
    if (currentHeadingIndex === -1) return 0;
    
    // Find next heading
    const nextHeading = allHeadings[index + 1];
    if (!nextHeading) {
      // Last section - measure to end of content
      return content.length - currentHeadingIndex;
    }
    
    const nextHeadingIndex = content.indexOf(nextHeading.text, currentHeadingIndex + 1);
    return nextHeadingIndex - currentHeadingIndex;
  }

  /**
   * Check if section contains code examples
   */
  private sectionHasCodeExamples(content: string, headingText: string, index: number, allHeadings: any[]): boolean {
    const currentHeadingIndex = content.indexOf(headingText);
    if (currentHeadingIndex === -1) return false;
    
    // Find next heading to determine section bounds
    const nextHeading = allHeadings[index + 1];
    let sectionEnd = content.length;
    
    if (nextHeading) {
      const nextHeadingIndex = content.indexOf(nextHeading.text, currentHeadingIndex + 1);
      if (nextHeadingIndex !== -1) {
        sectionEnd = nextHeadingIndex;
      }
    }
    
    const sectionContent = content.substring(currentHeadingIndex, sectionEnd);
    return sectionContent.includes('```') || sectionContent.includes('`');
  }

  /**
   * Calculate section complexity score
   */
  private calculateSectionComplexity(content: string, headingText: string, index: number, allHeadings: any[]): number {
    const currentHeadingIndex = content.indexOf(headingText);
    if (currentHeadingIndex === -1) return 1;
    
    // Find section bounds
    const nextHeading = allHeadings[index + 1];
    let sectionEnd = content.length;
    
    if (nextHeading) {
      const nextHeadingIndex = content.indexOf(nextHeading.text, currentHeadingIndex + 1);
      if (nextHeadingIndex !== -1) {
        sectionEnd = nextHeadingIndex;
      }
    }
    
    const sectionContent = content.substring(currentHeadingIndex, sectionEnd);
    
    // Count complexity indicators
    const codeBlocks = (sectionContent.match(/```[\s\S]*?```/g) || []).length;
    const inlineCode = (sectionContent.match(/`[^`]+`/g) || []).length;
    const links = (sectionContent.match(/\[[^\]]*\]\([^)]+\)/g) || []).length;
    const lists = (sectionContent.match(/^\s*[-*+]\s/gm) || []).length;
    
    // Simple complexity scoring
    let complexity = 1;
    complexity += codeBlocks * 2; // Code blocks add significant complexity
    complexity += Math.floor(inlineCode / 3); // Inline code adds some complexity
    complexity += Math.floor(links / 5); // Links add minimal complexity
    complexity += Math.floor(lists / 10); // Lists add minimal complexity
    
    return Math.min(5, complexity); // Cap at 5
  }

  /**
   * Calculate enhanced reading time with code examples and complexity factors
   * @param markdown Raw markdown content
   * @param complexity Optional complexity multiplier (1.0 = average)
   * @returns Reading time in minutes
   */
  calculateEnhancedReadingTime(markdown: string, complexity: number = 1.0): number {
    if (!markdown) return 0;

    // Remove frontmatter for accurate word count
    const contentWithoutFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');
    
    // Extract different content types
    const codeBlocks = (contentWithoutFrontmatter.match(/```[\s\S]*?```/g) || []).length;
    const inlineCode = (contentWithoutFrontmatter.match(/`[^`]+`/g) || []).length;
    const images = (contentWithoutFrontmatter.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
    const links = (contentWithoutFrontmatter.match(/\[[^\]]*\]\([^)]+\)/g) || []).length;
    const lists = (contentWithoutFrontmatter.match(/^\s*[-*+]\s/gm) || []).length;
    const tables = (contentWithoutFrontmatter.match(/\|.*\|/g) || []).length / 2; // Rough table count
    
    // Remove code blocks and other non-readable content for word count
    const textContent = contentWithoutFrontmatter
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '')        // Remove inline code
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
      .replace(/\[[^\]]*\]\([^)]+\)/g, '') // Remove links
      .replace(/[#*_`\[\]()]/g, ' ')   // Remove markdown formatting
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim();

    const wordCount = textContent ? textContent.split(/\s+/).length : 0;
    
    // Base reading time calculation (200 words per minute)
    const baseReadingTime = wordCount / 200;
    
    // Additional time for different content types
    const codeReadingTime = codeBlocks * 1.5; // 1.5 minutes per code block
    const inlineCodeTime = inlineCode * 0.1; // 6 seconds per inline code
    const imageTime = images * 0.5; // 30 seconds per image
    const listTime = lists * 0.05; // 3 seconds per list item
    const tableTime = tables * 0.3; // 18 seconds per table row
    
    // Calculate total time
    const totalTime = baseReadingTime + codeReadingTime + inlineCodeTime + 
                     imageTime + listTime + tableTime;
    
    // Apply complexity multiplier
    const adjustedTime = totalTime * complexity;
    
    // Round to nearest minute, minimum 1 minute
    return Math.max(1, Math.round(adjustedTime));
  }

  /**
   * Get reading time with difficulty-based adjustment
   * @param markdown Content to analyze
   * @param skillLevel Article skill level
   * @returns Adjusted reading time in minutes
   */
  getAdjustedReadingTime(markdown: string, skillLevel?: string): number {
    const complexityMultipliers = {
      'fundamentals': 0.8,  // Easier to read
      'intermediate': 1.0,  // Standard
      'advanced': 1.3,      // More complex
      'expert': 1.5         // Most complex
    };
    
    const multiplier = complexityMultipliers[skillLevel as keyof typeof complexityMultipliers] || 1.0;
    return this.calculateEnhancedReadingTime(markdown, multiplier);
  }

  /**
   * Load content with enhanced metadata extraction
   * @param topicId Topic identifier
   * @returns Observable with content and metadata
   */
  loadContentWithMetadata(topicId: string): Observable<{
    content: ContentState;
    metadata: any;
  }> {
    return this.loadContent(topicId).pipe(
      map(content => ({
        content,
        metadata: this.markdownProcessor.extractArticleMetadata(content.markdown, topicId)
      }))
    );
  }

  /**
   * Check if content is currently loading
   * @returns True if any content is loading
   */
  isLoading(): boolean {
    return this.currentContentSubject.value.loadingStatus === LoadingStatus.Loading;
  }

  /**
   * Get current content state
   * @returns Current content state
   */
  getCurrentContent(): ContentState {
    return this.currentContentSubject.value;
  }

  /**
   * Preload default content for faster initial loading
   * @returns Observable that completes when preloading is done
   */
  preloadDefaultContent(): Observable<void> {
    const defaultTopicId = 'fundamentals/introduction-to-angular';
    const contentPath = this.getContentPath(defaultTopicId);
    
    return this.http.get(contentPath, { responseType: 'text' }).pipe(
      map(markdown => {
        // Cache the content for instant loading later
        this.contentCache.set(defaultTopicId, markdown);
      }),
      catchError(error => {
        console.warn('Failed to preload default content:', error);
        return of(void 0);
      })
    );
  }



  /**
   * Check if content exists for a topic
   * @param topicId Topic identifier
   * @returns Observable that emits true if content exists
   */
  contentExists(topicId: string): Observable<boolean> {
    if (this.contentCache.has(topicId)) {
      return of(true);
    }

    const contentPath = this.getContentPath(topicId);
    return this.http.head(contentPath).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Filter frontmatter metadata to preserve educational fields while removing development metadata
   * @param frontmatter Raw frontmatter object
   * @returns Cleaned frontmatter with only educational content
   */
  private filterEducationalMetadata(frontmatter: any): any {
    if (!frontmatter) {
      return frontmatter;
    }

    // Educational fields to preserve
    const educationalFields = [
      'title',
      'slug', 
      'category',
      'level',
      'skillLevel',
      'difficulty',
      'estimatedReadingTime',
      'readingTime',
      'tags',
      'keywords',
      'description',
      'summary',
      'prerequisites',
      'relatedTopics',
      'nextTopic',
      'learningObjectives',
      'lastUpdated',
      'contentPath'
    ];

    // Development/internal fields to remove
    const developmentFields = [
      'status',
      'reviewers',
      'pipeline_id',
      'build_number',
      'constitutional',
      'internal_notes',
      'dev_status',
      'review_status',
      'build_timestamp',
      'ci_status',
      'branch',
      'commit_hash'
    ];

    const filtered: any = {};

    // Copy educational fields
    educationalFields.forEach(field => {
      if (field in frontmatter) {
        filtered[field] = frontmatter[field];
      }
    });

    // Explicitly exclude development fields (defensive programming)
    Object.keys(frontmatter).forEach(key => {
      if (!developmentFields.includes(key) && !educationalFields.includes(key)) {
        // Include unknown fields by default unless they look like development fields
        if (!key.includes('_id') && !key.includes('_status') && !key.startsWith('ci_') && !key.startsWith('build_')) {
          filtered[key] = frontmatter[key];
        }
      }
    });

    return filtered;
  }
}