import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { ContentService } from '../../core/services/content.service';
import { NavigationService } from '../../core/services/navigation.service';
import { MarkdownProcessorService } from '../../core/services/markdown-processor.service';
import { SearchService } from '../../core/services/search.service';
import { ContentState, LoadingStatus, BestPractice, Caveat, CodeExample } from '../../shared/models';
import { ArticleMetadata, TOCSection } from '../../shared/models/vocabulary.model';
import { HighlightDirective, AdvancedHighlightDirective } from '../../shared/directives';
import { CodeHighlighterComponent } from '../../shared/components/code-highlighter.component';
import { ArticleHeaderComponent, TOCSelectionEvent } from '../../shared/components/article-header/article-header.component';
import { ContentCleanupPipe } from '../../shared/pipes/content-cleanup.pipe';
import { BestPracticesComponent } from './best-practices.component';
import { CaveatsComponent } from './caveats.component';

@Component({
  selector: 'app-content-viewer',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    HighlightDirective,
    AdvancedHighlightDirective,
    CodeHighlighterComponent,
    ArticleHeaderComponent,
    ContentCleanupPipe,
    BestPracticesComponent,
    CaveatsComponent
  ],
  template: `
    <div class="content-viewer" data-testid="content-viewer">
      @if (contentState().loadingStatus === LoadingStatus.Loading) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading content...</p>
        </div>
      }
      
      @if (contentState().loadingStatus === LoadingStatus.Loaded) {
        <!-- Article Header -->
        <app-article-header
          [metadata]="articleMetadata()"
          [isLoading]="contentState().loadingStatus === LoadingStatus.Loading"
          (tocSectionSelected)="onTOCSectionSelected($event)"
          (tocToggled)="onTOCToggled($event)"
          (sectionInView)="onSectionInView($event)">
        </app-article-header>
        
        <!-- Prerequisites Warning -->
        @if (hasUnmetPrerequisites()) {
          <mat-card class="prerequisites-warning">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>warning</mat-icon>
                Prerequisites Required
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>This topic builds on previous concepts. Consider reviewing these topics first:</p>
              <div class="prerequisite-links">
                @for (prereq of getUnmetPrerequisites(); track prereq) {
                  <a [routerLink]="'/concepts/' + prereq" class="prerequisite-link">
                    <mat-icon>school</mat-icon>
                    {{ formatTopicName(prereq) }}
                  </a>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Main Content Card -->
        <mat-card class="content-card">
          <mat-card-header>
            <mat-card-title>{{ getTopicTitle() }}</mat-card-title>
            <mat-card-subtitle>
              <div class="content-meta">
                <div data-testid="reading-time" class="reading-time">
                  <mat-icon>schedule</mat-icon>
                  {{ getEstimatedReadingTime() }} min read
                </div>
                @if (isConstitutionalTopic()) {
                  <mat-chip class="constitutional-badge">
                    <mat-icon>verified</mat-icon>
                    Constitutional
                  </mat-chip>
                }
                <mat-chip class="difficulty-chip">
                  Level {{ getCurrentTopicDifficulty() }}
                </mat-chip>
              </div>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            
            <!-- Table of Contents -->
            @if (hasTableOfContents()) {
              <div class="table-of-contents" data-testid="table-of-contents">
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-icon>list</mat-icon>
                      Table of Contents
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <nav>
                    <ul>
                      @for (heading of getTableOfContents(); track heading.id) {
                        <li [class]="'toc-level-' + heading.level">
                          <a [href]="'#' + heading.id">{{ heading.text }}</a>
                        </li>
                      }
                    </ul>
                  </nav>
                </mat-expansion-panel>
              </div>
            }

            <!-- Main Content -->
            <div 
              class="markdown-content" 
              data-testid="content-body"
              aria-live="polite"
              [innerHTML]="contentState().renderedHtml | contentCleanup"
            ></div>
            
            <!-- Code Examples -->
            @if (getCodeExamples().length > 0) {
              <div class="code-examples-section">
                <h3>
                  <mat-icon>code</mat-icon>
                  Code Examples
                </h3>
                @for (example of getCodeExamples(); track example.id) {
                  <app-code-highlighter 
                    [codeExample]="example"
                    [showMetadata]="true">
                  </app-code-highlighter>
                }
              </div>
            }

            <!-- Best Practices -->
            @if (getBestPractices().length > 0) {
              <div class="best-practices-section">
                <h3>
                  <mat-icon>star</mat-icon>
                  Best Practices
                </h3>
                @for (practice of getBestPractices(); track practice.id) {
                  <app-best-practices [bestPractice]="practice"></app-best-practices>
                }
              </div>
            }

            <!-- Caveats -->
            @if (getCaveats().length > 0) {
              <div class="caveats-section">
                <h3>
                  <mat-icon>warning</mat-icon>
                  Important Caveats
                </h3>
                <app-caveats [caveatList]="getCaveats()"></app-caveats>
              </div>
            }

          </mat-card-content>
        </mat-card>

        <!-- Related Topics -->
        @if (getRelatedTopics().length > 0) {
          <mat-card class="related-topics">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>link</mat-icon>
                Related Topics
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="related-links">
                @for (topic of getRelatedTopics(); track topic) {
                  <a [routerLink]="'/concepts/' + topic" class="related-link">
                    {{ formatTopicName(topic) }}
                  </a>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Next Recommended Topics -->
        @if (getNextRecommendedTopics().length > 0) {
          <mat-card class="next-topics">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>arrow_forward</mat-icon>
                Continue Learning
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p>Based on your progress, here are recommended next topics:</p>
              <div class="next-topic-links">
                @for (topic of getNextRecommendedTopics(); track topic) {
                  <a [routerLink]="'/concepts/' + topic" class="next-topic-link">
                    <mat-icon>play_arrow</mat-icon>
                    {{ formatTopicName(topic) }}
                  </a>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }
      }
      
      @if (contentState().loadingStatus === LoadingStatus.Error) {
        <mat-card class="error-card">
          <mat-card-header>
            <mat-card-title>Content Error</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div [innerHTML]="contentState().renderedHtml | contentCleanup"></div>
          </mat-card-content>
        </mat-card>
      }
      
      @if (contentState().loadingStatus === LoadingStatus.Idle) {
        <mat-card class="default-loading-card">
          <mat-card-header>
            <mat-card-title>Loading Angular Knowledge Navigator</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Preparing your Angular learning experience...</p>
            </div>
            <p class="loading-hint">Loading "Introduction to Angular" to get you started!</p>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styleUrls: ['./content-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentViewerComponent implements OnInit {
  
  // Expose LoadingStatus enum to template
  readonly LoadingStatus = LoadingStatus;
  
  // Reactive state
  readonly contentState = signal<ContentState>({
    topicId: '',
    markdown: '',
    renderedHtml: '',
    loadingStatus: LoadingStatus.Idle,
    lastLoaded: new Date(),
    scrollPosition: 0
  });

  // Additional reactive state for enhanced features
  readonly currentTopicId = signal<string>('');
  readonly articleMetadata = signal<ArticleMetadata | null>(null);
  readonly prerequisites = signal<string[]>([]);
  readonly relatedTopics = signal<string[]>([]);
  readonly codeExamples = signal<CodeExample[]>([]);
  readonly bestPractices = signal<BestPractice[]>([]);
  readonly caveats = signal<Caveat[]>([]);

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService,
    private navigationService: NavigationService,
    private markdownProcessor: MarkdownProcessorService
  ) {}

  ngOnInit(): void {
    // Initialize navigation service with default content
    this.navigationService.initializeNavigation();
    
    // Subscribe to content changes
    this.contentService.currentContent$.subscribe(state => {
      this.contentState.set(state);
      if (state.topicId) {
        this.extractEnhancedContent(state);
      }
    });

    // Listen to route changes
    this.route.params.subscribe(params => {
      const level = params['level'];
      const topicId = params['topicId'];
      
      if (level && topicId) {
        const fullTopicId = `${level}/${topicId}`;
        this.currentTopicId.set(fullTopicId);
        this.loadContent(fullTopicId);
        this.loadEnhancedData(fullTopicId);
      } else {
        // No topic specified - load default content
        this.loadDefaultContent();
      }
    });
  }

  private loadContent(topicId: string): void {
    this.contentService.loadContent(topicId).subscribe({
      next: (state) => {
        console.log('Content loaded:', state);
        // Extract article metadata after content is loaded
        this.extractArticleMetadata(state);
      },
      error: (error) => {
        console.error('Failed to load content:', error);
      }
    });
  }

  /**
   * Extract article metadata from loaded content
   */
  private extractArticleMetadata(contentState: ContentState): void {
    if (contentState.markdown && contentState.topicId) {
      const metadata = this.markdownProcessor.extractArticleMetadata(
        contentState.markdown, 
        contentState.topicId
      );
      this.articleMetadata.set(metadata);
    }
  }

  /**
   * Load default content (Introduction to Angular)
   */
  private loadDefaultContent(): void {
    // Set loading state
    this.contentState.set({
      ...this.contentState(),
      loadingStatus: LoadingStatus.Loading
    });

    // Load default content from ContentService
    this.contentService.loadDefaultContent().subscribe({
      next: (state) => {
        this.currentTopicId.set(state.topicId);
        this.loadEnhancedData(state.topicId);
        this.extractArticleMetadata(state);
        console.log('Default content loaded:', state);
      },
      error: (error) => {
        console.error('Failed to load default content:', error);
        // Fallback to idle state with welcome message
        this.contentState.set({
          ...this.contentState(),
          loadingStatus: LoadingStatus.Idle
        });
      }
    });
  }

  /**
   * Handle TOC section selection from ArticleHeaderComponent
   */
  onTOCSectionSelected(event: TOCSelectionEvent): void {
    this.navigateToSection(event.sectionId, event.section.title);
  }

  /**
   * Navigate to a specific section with enhanced handling
   */
  private navigateToSection(sectionId: string, sectionTitle?: string): void {
    const targetElement = document.getElementById(sectionId);
    
    if (!targetElement) {
      console.warn(`Section with ID "${sectionId}" not found`);
      return;
    }

    // Calculate offset for fixed headers
    const headerOffset = 80;
    const elementPosition = targetElement.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    // Smooth scroll with custom implementation for better control
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });

    // Update URL hash without triggering navigation
    this.updateUrlHash(sectionId);
    
    // Focus the target element for accessibility
    this.focusSection(targetElement);
    
    // Track navigation for analytics and user behavior
    this.trackSectionNavigation(sectionId, sectionTitle);
    
    // Update any visual indicators
    this.highlightCurrentSection(sectionId);
  }

  /**
   * Update URL hash without triggering page navigation
   */
  private updateUrlHash(sectionId: string): void {
    try {
      const url = new URL(window.location.href);
      url.hash = sectionId;
      window.history.replaceState(null, '', url.toString());
    } catch (error) {
      console.warn('Failed to update URL hash:', error);
    }
  }

  /**
   * Focus section for accessibility
   */
  private focusSection(element: HTMLElement): void {
    // Set tabindex temporarily if not focusable
    const originalTabIndex = element.getAttribute('tabindex');
    
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '-1');
    }
    
    // Focus with a slight delay to ensure scroll is complete
    setTimeout(() => {
      element.focus({ preventScroll: true });
      
      // Restore original tabindex after focus
      if (originalTabIndex === null) {
        element.removeAttribute('tabindex');
      } else {
        element.setAttribute('tabindex', originalTabIndex);
      }
    }, 300);
  }

  /**
   * Track section navigation for analytics
   */
  private trackSectionNavigation(sectionId: string, sectionTitle?: string): void {
    const navigationData = {
      sectionId,
      sectionTitle: sectionTitle || 'Unknown Section',
      articleId: this.currentTopicId(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    // Log for debugging (replace with actual analytics in production)
    console.log('TOC Navigation:', navigationData);

    // Example: Send to analytics service
    // this.analyticsService.trackEvent('toc_navigation', navigationData);
  }

  /**
   * Highlight current section visually
   */
  private highlightCurrentSection(sectionId: string): void {
    // Remove previous highlights
    document.querySelectorAll('.content-heading.active-section')
      .forEach(el => el.classList.remove('active-section'));

    // Add highlight to current section
    const currentSection = document.getElementById(sectionId);
    if (currentSection) {
      currentSection.classList.add('active-section');
    }
  }

  /**
   * Handle TOC dropdown toggle
   */
  onTOCToggled(expanded: boolean): void {
    console.log('TOC toggled:', expanded);
    
    // Track TOC usage for analytics
    this.trackTOCUsage(expanded);
  }

  /**
   * Handle section coming into view (from ArticleHeaderComponent)
   */
  onSectionInView(sectionId: string | null): void {
    if (sectionId) {
      this.highlightCurrentSection(sectionId);
      this.updateUrlHash(sectionId);
    }
  }

  /**
   * Track TOC usage patterns
   */
  private trackTOCUsage(expanded: boolean): void {
    const usageData = {
      action: expanded ? 'toc_expanded' : 'toc_collapsed',
      articleId: this.currentTopicId(),
      timestamp: new Date().toISOString(),
      sectionCount: this.articleMetadata()?.tableOfContents?.length || 0
    };

    console.log('TOC Usage:', usageData);
  }

  /**
   * Initialize section intersection observer for auto-highlighting
   */
  private initializeSectionObserver(): void {
    // This would be called if we want additional intersection-based highlighting
    const options = {
      root: null,
      rootMargin: '-80px 0px -60% 0px', // Account for header offset
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          if (sectionId) {
            this.highlightCurrentSection(sectionId);
          }
        }
      });
    }, options);

    // Observe all headings
    setTimeout(() => {
      document.querySelectorAll('.content-heading[id]').forEach(heading => {
        observer.observe(heading);
      });
    }, 1000); // Delay to ensure content is rendered
  }

  /**
   * Check if default content should be loaded
   */
  private shouldLoadDefaultContent(): boolean {
    const currentState = this.contentState();
    return currentState.loadingStatus === LoadingStatus.Idle && !currentState.topicId;
  }

  getTopicTitle(): string {
    const state = this.contentState();
    return state.topicId 
      ? state.topicId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Angular Concept';
  }

  getEstimatedReadingTime(): number {
    const state = this.contentState();
    const wordCount = state.markdown.split(/\s+/).length;
    return Math.ceil(wordCount / 200); // Assume 200 words per minute
  }

  hasTableOfContents(): boolean {
    const state = this.contentState();
    return state.markdown.includes('#') && state.markdown.split('#').length > 2;
  }

  // Enhanced content methods
  private extractEnhancedContent(state: ContentState): void {
    if (state.markdown) {
      // Extract code examples
      const examples = this.contentService.extractCodeExamples(state.markdown);
      this.codeExamples.set(examples);

      // Extract best practices
      const practices = this.contentService.extractBestPractices(state.markdown);
      this.bestPractices.set(practices);

      // Mark topic as visited for progress tracking
      if (state.topicId) {
        this.navigationService.markTopicVisited(state.topicId);
      }
    }
  }

  private loadEnhancedData(topicId: string): void {
    // Load prerequisites
    const prereqs = this.navigationService.getPrerequisites(topicId);
    this.prerequisites.set(prereqs);

    // Load related topics
    this.contentService.getRelatedTopics(topicId).subscribe(related => {
      this.relatedTopics.set(related);
    });

    // Mock caveats for demonstration
    this.caveats.set(this.getMockCaveats(topicId));
  }

  // UI helper methods
  hasUnmetPrerequisites(): boolean {
    const topicId = this.currentTopicId();
    return !this.navigationService.hasCompletedPrerequisites(topicId);
  }

  getUnmetPrerequisites(): string[] {
    const topicId = this.currentTopicId();
    const prereqs = this.navigationService.getPrerequisites(topicId);
    const completed = this.navigationService.getCompletedTopics();
    return prereqs.filter(prereq => !completed.includes(prereq));
  }

  isConstitutionalTopic(): boolean {
    const title = this.getTopicTitle().toLowerCase();
    return title.includes('standalone') || 
           title.includes('onpush') || 
           title.includes('signals') ||
           title.includes('constitutional');
  }

  getCurrentTopicDifficulty(): number {
    const topicId = this.currentTopicId();
    const level = topicId.split('/')[0];
    const difficultyMap: { [key: string]: number } = {
      'fundamentals': 1,
      'intermediate': 2,
      'advanced': 3,
      'expert': 4
    };
    return difficultyMap[level] || 1;
  }

  getTableOfContents(): Array<{ id: string; text: string; level: number }> {
    const state = this.contentState();
    const headings: Array<{ id: string; text: string; level: number }> = [];
    
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = headingRegex.exec(state.markdown)) !== null) {
      const level = match[1].length;
      const text = match[2];
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      headings.push({ id, text, level });
    }
    
    return headings;
  }

  getCodeExamples(): CodeExample[] {
    return this.codeExamples();
  }

  getBestPractices(): BestPractice[] {
    return this.bestPractices();
  }

  getCaveats(): Caveat[] {
    return this.caveats();
  }

  getRelatedTopics(): string[] {
    return this.relatedTopics();
  }

  getNextRecommendedTopics(): string[] {
    return this.navigationService.getRecommendedNextTopics();
  }

  formatTopicName(topicId: string): string {
    return topicId.replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  private getMockCaveats(topicId: string): Caveat[] {
    // Mock caveats for demonstration
    const caveatMap: { [key: string]: Caveat[] } = {
      'advanced/change-detection-strategies': [
        {
          id: 'onpush-caveat',
          title: 'OnPush with Mutable Objects',
          description: 'OnPush change detection can miss changes if you mutate objects directly.',
          severity: 'high',
          category: 'gotcha',
          relatedConcepts: ['fundamentals/data-binding'],
          workaround: 'Always create new object references when updating data with OnPush strategy.'
        }
      ]
    };

    return caveatMap[topicId] || [];
  }
}