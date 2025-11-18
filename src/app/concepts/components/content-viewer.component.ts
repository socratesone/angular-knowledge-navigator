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
import { ArticleMetadata, SkillLevel } from '../../shared/models/vocabulary.model';
import { HighlightDirective, AdvancedHighlightDirective } from '../../shared/directives';
import { CodeHighlighterComponent } from '../../shared/components/code-highlighter.component';
import { ContentCleanupPipe } from '../../shared/pipes/content-cleanup.pipe';
import { BestPracticesComponent } from './best-practices.component';
import { CaveatsComponent } from './caveats.component';

interface ArticleLevelBadgeView {
  label: string;
  icon: string;
  cssClass: string;
  progress: number;
}

const LEVEL_BADGE_CONFIG: Record<SkillLevel, { label: string; icon: string; cssClass: string; order: number }> = {
  [SkillLevel.FUNDAMENTALS]: {
    label: 'Fundamentals',
    icon: 'school',
    cssClass: 'level-fundamentals',
    order: 1
  },
  [SkillLevel.INTERMEDIATE]: {
    label: 'Intermediate',
    icon: 'trending_up',
    cssClass: 'level-intermediate',
    order: 2
  },
  [SkillLevel.ADVANCED]: {
    label: 'Advanced',
    icon: 'psychology',
    cssClass: 'level-advanced',
    order: 3
  },
  [SkillLevel.EXPERT]: {
    label: 'Expert',
    icon: 'star',
    cssClass: 'level-expert',
    order: 4
  }
};

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
          <mat-card-header class="article-header-inline" data-testid="article-header">
            <mat-card-subtitle>
              @if (hasHeaderMetadataBadges()) {
                <div class="content-meta">
                  <div class="meta-chip reading-time" *ngIf="getArticleReadingTimeLabel() as readingTime" data-testid="reading-time">
                    <mat-icon>schedule</mat-icon>
                    {{ readingTime }}
                  </div>
                  <div class="meta-chip level-chip" *ngIf="getArticleLevelBadge() as levelBadge" [ngClass]="levelBadge.cssClass">
                    <mat-icon>{{ levelBadge.icon }}</mat-icon>
                    {{ levelBadge.label }}
                    <span class="level-progress" aria-hidden="true">
                      <span class="progress-bar" [style.width.%]="levelBadge.progress"></span>
                    </span>
                  </div>
                  @if (isConstitutionalTopic()) {
                    <div class="meta-chip constitutional-badge">
                      <mat-icon>verified</mat-icon>
                      Constitutional
                    </div>
                  }
                  @if (getCodeExampleCount() > 0) {
                    <div class="meta-chip code-count-chip">
                      <mat-icon>code</mat-icon>
                      {{ getCodeExampleCount() }} {{ getCodeExampleCount() === 1 ? 'example' : 'examples' }}
                    </div>
                  }
                  @if (hasInteractiveExamples()) {
                    <div class="meta-chip interactive-chip">
                      <mat-icon>play_circle</mat-icon>
                      Interactive
                    </div>
                  }
                  
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
                  
                </div>
              }

              @if (getArticleTags().length > 0) {
                <div class="article-tags">
                  <mat-icon>sell</mat-icon>
                  <div class="tags-list">
                    @for (tag of getArticleTags(); track tag) {
                      <span class="tag-chip">#{{ tag }}</span>
                    }
                  </div>
                  
                </div>
              }
              
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
           
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

  getArticleTitle(): string {
    return this.articleMetadata()?.title || this.getTopicTitle();
  }

  getArticleDescription(): string | null {
    return this.articleMetadata()?.description || null;
  }

  getArticleTags(): string[] {
    return this.articleMetadata()?.tags || [];
  }

  getArticleReadingTimeLabel(): string | null {
    const totalMinutes = this.getNormalizedReadingTime();
    if (!totalMinutes) {
      return null;
    }

    if (totalMinutes === 1) {
      return '1 min read';
    }

    if (totalMinutes < 60) {
      return `${totalMinutes} mins read`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      return `${hours}h read`;
    }

    return `${hours}h ${minutes}m read`;
  }

  getArticleLevelBadge(): ArticleLevelBadgeView | null {
    const level = this.articleMetadata()?.level;
    if (!level) {
      return null;
    }

    const config = LEVEL_BADGE_CONFIG[level];
    if (!config) {
      return null;
    }

    return {
      label: config.label,
      icon: config.icon,
      cssClass: config.cssClass,
      progress: (config.order / 4) * 100
    };
  }

  getCodeExampleCount(): number {
    return this.articleMetadata()?.codeBlockCount ?? this.getCodeExamples().length;
  }

  hasInteractiveExamples(): boolean {
    return this.articleMetadata()?.hasInteractiveExamples ?? false;
  }

  hasHeaderMetadataBadges(): boolean {
    return Boolean(
      this.getArticleReadingTimeLabel() ||
      this.getArticleLevelBadge() ||
      this.isConstitutionalTopic() ||
      this.getCodeExampleCount() > 0 ||
      this.hasInteractiveExamples()
    );
  }

  scrollToTableOfContents(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const tocElement = document.querySelector('[data-testid="table-of-contents"]');
    if (!tocElement) {
      return;
    }

    tocElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private getNormalizedReadingTime(): number | null {
    const metadata = this.articleMetadata();
    const minutes = metadata?.readingTime ?? metadata?.estimatedTime ?? this.getEstimatedReadingTime();
    return minutes > 0 ? minutes : null;
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
  'advanced/optimizing-change-detection-and-performance': [
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