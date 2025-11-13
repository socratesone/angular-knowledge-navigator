import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ArticleMetadata, TOCSection, SkillLevel } from '../../models/vocabulary.model';
import { 
  scrollToAnchor, 
  getCurrentAnchor, 
  getCurrentVisibleSection,
  isElementInViewport,
  ScrollToAnchorOptions 
} from '../../utils/anchor-utils';

export interface TOCSelectionEvent {
  section: TOCSection;
  sectionId: string;
}

@Component({
  selector: 'app-article-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './article-header.component.html',
  styleUrls: ['./article-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArticleHeaderComponent implements OnInit, OnDestroy {
  @Input() metadata: ArticleMetadata | null = null;
  @Input() showTOC: boolean = true;
  @Input() showReadingTime: boolean = true;
  @Input() showLevel: boolean = true;
  @Input() isLoading: boolean = false;
  @Input() scrollOffset: number = 80; // Offset for fixed headers
  @Input() enableAutoHighlight: boolean = true; // Auto-highlight current section

  @Output() tocSectionSelected = new EventEmitter<TOCSelectionEvent>();
  @Output() tocToggled = new EventEmitter<boolean>();
  @Output() sectionInView = new EventEmitter<string | null>();

  // Internal state
  private readonly tocExpanded = signal<boolean>(false);
  private readonly hoveredSection = signal<string | null>(null);
  private readonly currentSection = signal<string | null>(null);
  private scrollListener: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Computed properties
  readonly hasTOC = computed(() => {
    const toc = this.metadata?.tableOfContents;
    return toc && toc.length > 0;
  });

  readonly levelBadgeConfig = computed(() => {
    const level = this.metadata?.level;
    if (!level) return null;

    const configs = {
      [SkillLevel.FUNDAMENTALS]: {
        label: 'Fundamentals',
        color: 'primary',
        icon: 'school',
        description: 'Beginner-friendly concepts',
        cssClass: 'level-fundamentals',
        order: 1
      },
      [SkillLevel.INTERMEDIATE]: {
        label: 'Intermediate',
        color: 'accent',
        icon: 'trending_up',
        description: 'Building on the basics',
        cssClass: 'level-intermediate',
        order: 2
      },
      [SkillLevel.ADVANCED]: {
        label: 'Advanced',
        color: 'warn',
        icon: 'psychology',
        description: 'Complex concepts and patterns',
        cssClass: 'level-advanced',
        order: 3
      },
      [SkillLevel.EXPERT]: {
        label: 'Expert',
        color: 'primary',
        icon: 'star',
        description: 'Cutting-edge techniques',
        cssClass: 'level-expert',
        order: 4
      }
    };

    return configs[level] || null;
  });

  readonly levelProgress = computed(() => {
    const config = this.levelBadgeConfig();
    if (!config) return 0;
    
    // Calculate progress as percentage (25%, 50%, 75%, 100%)
    return (config.order / 4) * 100;
  });

  readonly readingTimeDisplay = computed(() => {
    const time = this.metadata?.readingTime;
    if (!time) return '';
    
    if (time === 1) return '1 min read';
    if (time < 60) return `${time} mins read`;
    
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    if (minutes === 0) return `${hours}h read`;
    return `${hours}h ${minutes}m read`;
  });

  readonly tocSections = computed(() => {
    return this.metadata?.tableOfContents || [];
  });

  readonly articleTitle = computed(() => {
    return this.metadata?.title || 'Untitled Article';
  });

  readonly codeBlockCount = computed(() => {
    return this.metadata?.codeBlockCount || 0;
  });

  readonly hasCodeExamples = computed(() => {
    return this.metadata?.hasInteractiveExamples || false;
  });

  /**
   * Toggle TOC dropdown visibility
   */
  toggleTOC(): void {
    const newState = !this.tocExpanded();
    this.tocExpanded.set(newState);
    this.tocToggled.emit(newState);
  }

  ngOnInit(): void {
    this.initializeScrollTracking();
    this.checkInitialSection();
  }

  ngOnDestroy(): void {
    this.cleanupScrollTracking();
  }

  /**
   * Handle TOC section selection with smooth scrolling
   */
  onTOCSectionClick(section: TOCSection): void {
    const scrollOptions: ScrollToAnchorOptions = {
      offset: this.scrollOffset,
      behavior: 'smooth',
      block: 'start',
      updateUrl: true,
      focusTarget: true
    };

    // Perform smooth scroll
    scrollToAnchor(section.id, scrollOptions);

    // Update current section
    this.currentSection.set(section.id);

    // Emit events
    const event: TOCSelectionEvent = {
      section,
      sectionId: section.id
    };
    
    this.tocSectionSelected.emit(event);
    this.sectionInView.emit(section.id);
    
    // Close dropdown after selection
    this.tocExpanded.set(false);

    // Track navigation for analytics
    this.trackTOCNavigation(section);
  }

  /**
   * Handle section hover for preview
   */
  onSectionHover(sectionId: string | null): void {
    this.hoveredSection.set(sectionId);
  }

  /**
   * Get indentation class for TOC item based on heading level
   */
  getTOCIndentClass(level: number): string {
    return `toc-indent-${Math.min(level, 6)}`;
  }

  /**
   * Check if section is currently hovered
   */
  isSectionHovered(sectionId: string): boolean {
    return this.hoveredSection() === sectionId;
  }

  /**
   * Get TOC section icon based on heading level
   */
  getTOCSectionIcon(level: number): string {
    const icons = {
      1: 'title',
      2: 'subject',
      3: 'list',
      4: 'radio_button_unchecked',
      5: 'fiber_manual_record',
      6: 'more_horiz'
    };
    return icons[level as keyof typeof icons] || 'radio_button_unchecked';
  }

  /**
   * Format section title for display
   */
  formatSectionTitle(title: string, maxLength: number = 40): string {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  }

  /**
   * Check if TOC is currently expanded
   */
  isTOCExpanded(): boolean {
    return this.tocExpanded();
  }

  /**
   * Get accessibility label for level badge
   */
  getLevelBadgeAriaLabel(): string {
    const config = this.levelBadgeConfig();
    return config ? `Article difficulty: ${config.label}. ${config.description}` : '';
  }

  /**
   * Get accessibility label for reading time
   */
  getReadingTimeAriaLabel(): string {
    const display = this.readingTimeDisplay();
    return display ? `Estimated reading time: ${display}` : '';
  }

  /**
   * Get accessibility label for TOC button
   */
  getTOCButtonAriaLabel(): string {
    const sectionsCount = this.tocSections().length;
    const expanded = this.isTOCExpanded();
    return `Table of contents with ${sectionsCount} sections. Currently ${expanded ? 'expanded' : 'collapsed'}`;
  }

  /**
   * Track function for TOC sections to optimize ngFor performance
   */
  trackTOCSection(index: number, section: TOCSection): string {
    return section.id;
  }

  /**
   * Initialize scroll tracking for automatic section highlighting
   */
  private initializeScrollTracking(): void {
    if (!this.enableAutoHighlight) return;

    this.scrollListener = this.throttle(() => {
      this.updateCurrentSection();
    }, 100);

    window.addEventListener('scroll', this.scrollListener);
    
    // Also track viewport changes
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCurrentSection();
    });
    
    if (document.body) {
      this.resizeObserver.observe(document.body);
    }
  }

  /**
   * Cleanup scroll event listeners
   */
  private cleanupScrollTracking(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
      this.scrollListener = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  /**
   * Check initial section based on URL hash
   */
  private checkInitialSection(): void {
    const currentAnchor = getCurrentAnchor();
    if (currentAnchor && this.isSectionInTOC(currentAnchor)) {
      this.currentSection.set(currentAnchor);
      this.sectionInView.emit(currentAnchor);
    }
  }

  /**
   * Update currently visible section
   */
  private updateCurrentSection(): void {
    const sections = this.tocSections();
    if (sections.length === 0) return;

    const anchorIds = sections.map(section => section.id);
    const visibleSection = getCurrentVisibleSection(anchorIds, this.scrollOffset);
    
    if (visibleSection && visibleSection !== this.currentSection()) {
      this.currentSection.set(visibleSection);
      this.sectionInView.emit(visibleSection);
    }
  }

  /**
   * Check if section ID exists in current TOC
   */
  private isSectionInTOC(sectionId: string): boolean {
    const sections = this.tocSections();
    return sections.some(section => 
      section.id === sectionId || 
      (section.children && section.children.some(child => child.id === sectionId))
    );
  }

  /**
   * Track TOC navigation for analytics
   */
  private trackTOCNavigation(section: TOCSection): void {
    // This could be enhanced to send analytics events
    console.log('TOC Navigation:', {
      sectionId: section.id,
      sectionTitle: section.title,
      sectionLevel: section.level,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Throttle function to limit scroll event frequency
   */
  private throttle<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastExecTime = 0;
    
    return (...args: Parameters<T>) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  /**
   * Get CSS class for active/current section
   */
  getSectionCSSClass(sectionId: string): string {
    const classes = ['toc-link'];
    
    if (this.currentSection() === sectionId) {
      classes.push('current-section');
    }
    
    if (this.hoveredSection() === sectionId) {
      classes.push('hovered');
    }
    
    return classes.join(' ');
  }

  /**
   * Check if section is currently active
   */
  isSectionActive(sectionId: string): boolean {
    return this.currentSection() === sectionId;
  }

  /**
   * Get section progress (estimated scroll position)
   */
  getSectionProgress(sectionId: string): number {
    const element = document.getElementById(sectionId);
    if (!element) return 0;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate how much of the section is visible
    const visibleTop = Math.max(0, -rect.top);
    const visibleBottom = Math.min(rect.height, viewportHeight - rect.top);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    
    return rect.height > 0 ? (visibleHeight / rect.height) * 100 : 0;
  }
}