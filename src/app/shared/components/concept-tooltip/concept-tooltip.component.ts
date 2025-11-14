import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy, 
  OnInit, 
  OnDestroy,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { 
  Overlay, 
  OverlayRef, 
  OverlayPositionBuilder,
  ConnectedPosition 
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ConceptVocabulary } from '../../models/vocabulary.model';

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface TooltipConfig {
  maxWidth?: number;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showArrow?: boolean;
  interactive?: boolean;
}

@Component({
  selector: 'app-concept-tooltip',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div 
      class="concept-tooltip"
      [class.interactive]="config?.interactive"
      [style.max-width.px]="config?.maxWidth || 300"
      role="tooltip"
      [attr.aria-describedby]="'tooltip-' + concept().id"
    >
      @if (config?.showArrow !== false) {
        <div class="tooltip-arrow" [class]="'arrow-' + effectivePosition()"></div>
      }
      
      <div class="tooltip-content">
        <div class="tooltip-header">
          <h4 class="concept-term">{{ concept().term }}</h4>
          @if (concept().category) {
            <span class="concept-category">{{ formatCategory(concept().category) }}</span>
          }
        </div>
        
        <div class="tooltip-body">
          <p class="concept-definition">{{ concept().definition }}</p>
          
          @if (concept().detailedExplanation && showDetails()) {
            <div class="detailed-explanation">
              <p>{{ concept().detailedExplanation }}</p>
            </div>
          }
          
          @if (concept().examples && concept().examples.length > 0) {
            <div class="concept-examples">
              <span class="examples-label">Examples:</span>
              <ul>
                @for (example of concept().examples; track example) {
                  <li><code>{{ example }}</code></li>
                }
              </ul>
            </div>
          }
        </div>
        
        @if (concept().relatedArticles && concept().relatedArticles.length > 0) {
          <div class="tooltip-footer">
            <div class="related-links">
              <span class="learn-more-label">Learn more:</span>
              @for (articleId of concept().relatedArticles; track articleId; let first = $first) {
                @if (!first) { <span class="separator">•</span> }
                <button 
                  mat-button 
                  class="article-link"
                  (click)="onArticleLinkClick(articleId)"
                  [attr.aria-label]="'Learn more about ' + concept().term + ' in article ' + articleId"
                >
                  {{ formatArticleTitle(articleId) }}
                </button>
              }
            </div>
          </div>
        }
        
        @if (config?.interactive) {
          <div class="tooltip-actions">
            <button
              mat-icon-button
              class="details-toggle"
              (click)="toggleDetails()"
              [attr.aria-label]="showDetails() ? 'Hide details' : 'Show details'"
            >
              <mat-icon>{{ showDetails() ? 'expand_less' : 'expand_more' }}</mat-icon>
            </button>
            
            <button
              mat-icon-button
              class="close-button"
              (click)="onClose()"
              aria-label="Close tooltip"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrls: ['./concept-tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConceptTooltipComponent implements OnInit, OnDestroy {
  @Input({ required: true }) concept = signal<ConceptVocabulary>({} as ConceptVocabulary);
  @Input() position = signal<TooltipPosition>({ x: 0, y: 0 });
  @Input() config = signal<TooltipConfig | undefined>(undefined);
  @Input() targetElement = signal<HTMLElement | undefined>(undefined);

  @Output() articleLinkClick = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() detailsToggle = new EventEmitter<boolean>();

  private showDetails = signal(false);
  private effectivePosition = computed(() => this.config()?.position || 'top');

  constructor(
    private overlay: Overlay,
    private positionBuilder: OverlayPositionBuilder
  ) {}

  ngOnInit(): void {
    // Set up keyboard navigation for interactive tooltips
    if (this.config()?.interactive) {
      this.setupKeyboardHandlers();
    }
  }

  ngOnDestroy(): void {
    // Cleanup handled by parent service
  }

  /**
   * Toggle showing detailed explanation
   */
  toggleDetails(): void {
    this.showDetails.update(current => !current);
    this.detailsToggle.emit(this.showDetails());
  }

  /**
   * Handle article link clicks
   */
  onArticleLinkClick(articleId: string): void {
    this.articleLinkClick.emit(articleId);
  }

  /**
   * Handle tooltip close
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Format category for display
   */
  formatCategory(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format article ID to readable title
   */
  formatArticleTitle(articleId: string): string {
    return articleId
      .split('/')
      .pop()
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()) || articleId;
  }

  /**
   * Get optimal position for tooltip based on target element and viewport
   */
  calculateOptimalPosition(targetElement: HTMLElement, tooltipElement: HTMLElement): ConnectedPosition[] {
    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const positions: ConnectedPosition[] = [];
    const primaryPosition = this.config()?.position || 'top';
    
    // Define position configurations
    const positionConfigs = {
      top: {
        originX: 'center' as const,
        originY: 'top' as const,
        overlayX: 'center' as const,
        overlayY: 'bottom' as const,
        offsetY: -8
      },
      bottom: {
        originX: 'center' as const,
        originY: 'bottom' as const,
        overlayX: 'center' as const,
        overlayY: 'top' as const,
        offsetY: 8
      },
      left: {
        originX: 'start' as const,
        originY: 'center' as const,
        overlayX: 'end' as const,
        overlayY: 'center' as const,
        offsetX: -8
      },
      right: {
        originX: 'end' as const,
        originY: 'center' as const,
        overlayX: 'start' as const,
        overlayY: 'center' as const,
        offsetX: 8
      }
    };
    
    // Add primary position first
    positions.push(positionConfigs[primaryPosition]);
    
    // Add fallback positions
    const fallbackOrder = this.getFallbackPositions(primaryPosition);
    fallbackOrder.forEach(pos => {
      positions.push(positionConfigs[pos]);
    });
    
    return positions;
  }

  /**
   * Get fallback positions based on primary position
   */
  private getFallbackPositions(primary: string): ('top' | 'bottom' | 'left' | 'right')[] {
    const fallbacks: Record<string, ('top' | 'bottom' | 'left' | 'right')[]> = {
      top: ['bottom', 'right', 'left'],
      bottom: ['top', 'right', 'left'],
      left: ['right', 'top', 'bottom'],
      right: ['left', 'top', 'bottom']
    };
    
    return fallbacks[primary] || ['top', 'bottom', 'right', 'left'];
  }

  /**
   * Setup keyboard event handlers for interactive tooltips
   */
  private setupKeyboardHandlers(): void {
    // Handle Escape key to close tooltip
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    // Cleanup on destroy
    const originalNgOnDestroy = this.ngOnDestroy;
    this.ngOnDestroy = () => {
      document.removeEventListener('keydown', handleKeydown);
      originalNgOnDestroy.call(this);
    };
  }
}