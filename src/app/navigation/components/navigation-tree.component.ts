import { Component, ChangeDetectionStrategy, OnInit, signal, computed, effect, untracked, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationService, NavigationNode, NodeType, SkillLevel } from '../../core/services/navigation.service';
import { BreakpointService } from '../../core/services/breakpoint.service';

@Component({
  selector: 'app-navigation-tree',
  standalone: true,
  imports: [
    CommonModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSidenavModule,
    MatToolbarModule
  ],
  template: `
    <div class="navigation-tree" [class.mobile-layout]="breakpointService.isMobile()">
      <!-- Mobile Header with Close Button -->
      @if (breakpointService.isMobile() && showMobileHeader) {
        <mat-toolbar class="mobile-toolbar">
          <span>Learning Path</span>
          <span class="toolbar-spacer"></span>
          <button mat-icon-button (click)="closeMobileNavigation()" aria-label="Close navigation">
            <mat-icon>close</mat-icon>
          </button>
        </mat-toolbar>
      }

      <!-- Desktop/Tablet Header -->
      @if (!breakpointService.isMobile() || !showMobileHeader) {
        <div class="tree-header">
          <h3>Learning Path</h3>
          <div class="tree-actions">
            <button mat-icon-button (click)="expandAll()" title="Expand All">
              <mat-icon>unfold_more</mat-icon>
            </button>
            <button mat-icon-button (click)="collapseAll()" title="Collapse All">
              <mat-icon>unfold_less</mat-icon>
            </button>
          </div>
        </div>
      }

      @if (isLoading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <div class="tree-content" role="tree">
        @for (node of navigationNodes(); track node.id) {
          <div class="node-item" [class.selected]="node.isSelected">
            
            @if (node.type === NodeType.Category) {
              <div class="category-node" [attr.data-testid]="'category-' + node.id">
                <button 
                  mat-button 
                  class="category-button"
                  (click)="toggleNode(node.id)"
                  [class.expanded]="node.isExpanded"
                  role="treeitem"
                  [attr.aria-expanded]="node.isExpanded"
                >
                  <mat-icon class="expand-icon">
                    {{ node.isExpanded ? 'expand_more' : 'chevron_right' }}
                  </mat-icon>
                  <span class="category-title">{{ node.title }}</span>
                  <span class="topic-count">({{ node.topicCount }} topics)</span>
                </button>
              </div>
            }

            @if (node.type === NodeType.Category && node.isExpanded && node.children && node.children.length > 0) {
              <div class="children-container">
                @for (child of node.children; track child.id) {
                  <div 
                    class="topic-node"
                    [class.selected]="child.isSelected"
                    (click)="selectTopic(child)"
                    role="treeitem"
                    [attr.data-testid]="'topic-' + child.slug"
                  >
                    <mat-icon class="topic-icon">article</mat-icon>
                    <span class="topic-title">{{ child.title }}</span>
                    @if (isConstitutionalTopic(child.id)) {
                      <mat-icon class="constitutional-badge" title="Constitutional Principle">
                        verified
                      </mat-icon>
                    }
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      @if (navigationNodes().length === 0 && !isLoading()) {
        <div class="empty-state">
          <mat-icon>folder_open</mat-icon>
          <p>No navigation data available</p>
          <p class="helper-text">Check if learning-path.json is properly loaded</p>
        </div>
      }
    </div>
  `,
  styleUrls: ['./navigation-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationTreeComponent implements OnInit {
  
  // Mobile navigation inputs/outputs
  @Input() showMobileHeader = true;
  @Output() mobileNavigationClose = new EventEmitter<void>();

  // Expose enums to template
  readonly NodeType = NodeType;
  readonly SkillLevel = SkillLevel;

  // Reactive state
  readonly navigationNodes = signal<NavigationNode[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly selectedNodeId = signal<string | null>(null);

  // Computed values
  readonly hasSelectedNode = computed(() => this.selectedNodeId() !== null);

  // Constitutional services
  readonly breakpointService = inject(BreakpointService);
  private navigationService = inject(NavigationService);
  private router = inject(Router);

  constructor() {
    // Effect to track selected topic changes
    effect(() => {
      const selectedTopic = this.navigationService.selectedTopic$();
      untracked(() => {
        this.selectedNodeId.set(selectedTopic?.id || null);
      });
    });
  }

  ngOnInit(): void {
    // Subscribe to navigation tree changes (RxJS Observable)
    this.navigationService.navigationTree$.subscribe(nodes => {
      this.navigationNodes.set(nodes);
      this.isLoading.set(false);
    });
  }

  /**
   * Toggle expansion of a category node
   */
  toggleNode(nodeId: string): void {
    this.navigationService.toggleNode(nodeId);
  }

  /**
   * Select a topic and navigate to it
   */
  selectTopic(node: NavigationNode): void {
    if (node.type === NodeType.Topic) {
      this.navigationService.selectTopic(node.id);
      
      // Navigate to the topic
      const [level, topicId] = node.id.split('/');
      this.router.navigate(['/concepts', level, topicId]);

      // Close mobile navigation after selection
      if (this.breakpointService.isMobile()) {
        this.closeMobileNavigation();
      }
    }
  }

  /**
   * Close mobile navigation drawer
   */
  closeMobileNavigation(): void {
    this.mobileNavigationClose.emit();
  }

  /**
   * Expand all category nodes
   */
  expandAll(): void {
    this.navigationService.expandAll();
  }

  /**
   * Collapse all nodes except fundamentals
   */
  collapseAll(): void {
    this.navigationService.collapseAll();
  }

  /**
   * Check if a topic represents a constitutional principle
   */
  isConstitutionalTopic(topicId: string): boolean {
    const topic = this.navigationService.getTopicById(topicId);
    return topic?.constitutional || false;
  }

  /**
   * Get CSS class for skill level
   */
  getSkillLevelClass(level: SkillLevel): string {
    switch (level) {
      case SkillLevel.Fundamentals:
        return 'level-fundamentals';
      case SkillLevel.Intermediate:
        return 'level-intermediate';
      case SkillLevel.Advanced:
        return 'level-advanced';
      case SkillLevel.Expert:
        return 'level-expert';
      default:
        return '';
    }
  }
}