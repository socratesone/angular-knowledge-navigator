import { Component, ChangeDetectionStrategy, ViewChild, signal, computed, inject, effect, AfterViewInit, ElementRef, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenav } from '@angular/material/sidenav';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NavigationTreeComponent } from '../../navigation/components/navigation-tree.component';
import { SearchComponent } from '../../navigation/components/search.component';
import { MobileMenuComponent } from './mobile-menu.component';
import { LayoutSplitterComponent } from '../../shared/components/layout-splitter/layout-splitter.component';
import { SearchService } from '../../core/services/search.service';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { GestureService } from '../../core/services/gesture.service';
import { NavigationLayoutService } from '../../core/services/navigation-layout.service';
import { LayoutBreakpoint } from '../../shared/models/navigation.model';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    NavigationTreeComponent,
    SearchComponent,
    MobileMenuComponent,
    LayoutSplitterComponent
  ],
  template: `
    <div class="app-layout" 
         [class.nav-collapsed]="!sidenavOpened()"
         [class.nav-open]="sidenavOpened() && isMobileLayout()"
         [class.user-resizing]="isResizing()"
         [class.animated]="!isResizing()"
         [ngStyle]="layoutStyles()"
         data-testid="app-layout">
      
      <!-- Application Header -->
      <header class="app-header">
        <div class="header-title">
          <!-- Mobile/Tablet menu button -->
          @if (isMobileLayout() || isTabletLayout()) {
            <button 
              mat-icon-button 
              (click)="toggleSidenav()" 
              class="nav-toggle"
              [attr.aria-label]="sidenavOpened() ? 'Close navigation' : 'Open navigation'"
              [attr.aria-expanded]="sidenavOpened()">
              <mat-icon>{{ sidenavOpened() ? 'close' : 'menu' }}</mat-icon>
            </button>
          } @else {
            <!-- Desktop collapse toggle -->
            <button 
              mat-icon-button 
              (click)="toggleNavigationCollapse()" 
              class="nav-toggle"
              [attr.aria-label]="sidenavOpened() ? 'Collapse navigation' : 'Expand navigation'"
              [attr.aria-expanded]="sidenavOpened()"
              matTooltip="{{ sidenavOpened() ? 'Collapse' : 'Expand' }} navigation">
              <mat-icon>{{ sidenavOpened() ? 'menu_open' : 'menu' }}</mat-icon>
            </button>
          }
          
          <div class="app-icon">
            <mat-icon>school</mat-icon>
          </div>
          <h1>Angular Knowledge Navigator</h1>
        </div>
        
        <div class="header-actions">
          <!-- Search Toggle -->
          <button 
            mat-icon-button 
            (click)="toggleSearch()"
            [class.search-active]="showSearch()"
            matTooltip="Toggle search"
            class="search-toggle">
            <mat-icon>{{ showSearch() ? 'search_off' : 'search' }}</mat-icon>
          </button>
          
          <!-- Search Results Count -->
          @if (showSearch() && searchResultsCount() > 0) {
            <span class="search-results-badge">
              {{ searchResultsCount() }}
            </span>
          }
          
          <!-- Layout Controls (Desktop only) -->
          <div class="layout-controls">
            @if (isDesktopLayout()) {
              <button 
                mat-icon-button 
                (click)="resetLayout()"
                matTooltip="Reset layout"
                class="reset-layout">
                <mat-icon>refresh</mat-icon>
              </button>
            }
            
            <button 
              mat-icon-button 
              matTooltip="Settings"
              class="settings">
              <mat-icon>settings</mat-icon>
            </button>
          </div>
        </div>
      </header>

      <!-- Navigation Panel -->
      @if (sidenavOpened() || !isMobileLayout()) {
        <nav class="navigation-panel"
             [class.open]="sidenavOpened() && isMobileLayout()"
             [class.resizing]="isResizing()">
          
          <!-- Navigation Content -->
          <div class="nav-content">
            <!-- Search Panel -->
            @if (showSearch()) {
              <div class="search-section">
                <div class="search-header">
                  <h3>
                    <mat-icon class="header-icon">search</mat-icon>
                    Search
                  </h3>
                  <button 
                    mat-icon-button 
                    (click)="toggleSearch()" 
                    matTooltip="Close search"
                    class="close-search">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <app-search></app-search>
              </div>
            } @else {
              <!-- Navigation Tree -->
              <div class="navigation-section">
                <app-navigation-tree
                  [class.mobile-layout]="isMobileLayout()">
                </app-navigation-tree>
              </div>
            }
          </div>

          <!-- Resize Handle (Desktop only) -->
          @if (canResize()) {
            <app-layout-splitter
              orientation="vertical"
              [disabled]="!canResize()"
              [showPreviewLine]="true"
              [showSnapIndicators]="false"
              ariaLabel="Resize navigation panel"
              (dragStart)="onResizeStart($event)"
              (dragMove)="onResizeMove($event)"
              (dragEnd)="onResizeEnd($event)"
              (doubleClick)="resetLayout()">
            </app-layout-splitter>
          }
        </nav>
      }

      <!-- Main Content Area -->
      <main class="content-area">
        <div class="content-wrapper">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Mobile Backdrop -->
      @if (sidenavOpened() && isMobileLayout()) {
        <div class="mobile-backdrop" 
             (click)="toggleSidenav()"
             aria-hidden="true">
        </div>
      }
    </div>
  `,
  styleUrl: './app-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent implements AfterViewInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('sidenav', { read: ElementRef }) sidenavElement!: ElementRef<HTMLElement>;
  
  // Services
  readonly breakpointService = inject(BreakpointService);
  private readonly navigationLayoutService = inject(NavigationLayoutService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly searchService = inject(SearchService);
  private readonly gestureService = inject(GestureService);
  
  // Component state
  private readonly _showSearch = signal<boolean>(false);
  private readonly _sidenavOpened = signal<boolean>(true);
  private readonly _isResizing = signal<boolean>(false);
  private resizeStartX = 0;
  private initialWidth = 0;
  
  // Public computed properties
  readonly showSearch = computed(() => this._showSearch());
  readonly sidenavOpened = computed(() => this._sidenavOpened());
  readonly searchResultsCount = computed(() => this.searchService.enhancedSearchState().totalResults);
  readonly isResizing = computed(() => this._isResizing());
  
  // Layout computed properties
  readonly currentLayout = computed(() => this.navigationLayoutService.currentLayout());
  readonly canResize = computed(() => this.navigationLayoutService.canUserResize());
  readonly navigationWidth = computed(() => this.navigationLayoutService.currentWidth());
  readonly isMobileLayout = computed(() => this.navigationLayoutService.isMobile());
  readonly isTabletLayout = computed(() => this.navigationLayoutService.isTablet());
  readonly isDesktopLayout = computed(() => this.navigationLayoutService.isDesktop());
  
  // Responsive computed properties
  readonly sidenavMode = computed(() => {
    return this.breakpointService.useDrawer() ? 'over' : 'side';
  });

  // CSS custom properties for dynamic layout
  readonly layoutStyles = computed(() => this.navigationLayoutService.getLayoutCSSProperties());

  constructor() {
    // Effect to handle responsive behavior
    effect(() => {
      const responsiveState = this.breakpointService.responsiveState();
      
      // Close sidenav on mobile when switching to mobile layout
      if (responsiveState.isMobile && this._sidenavOpened()) {
        this._sidenavOpened.set(false);
      }
      
      // Auto-open sidenav on desktop
      if (responsiveState.isDesktop && !this._sidenavOpened()) {
        this._sidenavOpened.set(true);
      }
    });

    // Setup edge gestures immediately
    this.setupEdgeGestures();
  }

  ngAfterViewInit(): void {
    // Setup sidenav-specific gestures after view init
    this.setupSidenavGestures();
  }

  /**
   * Setup edge gesture handlers for mobile navigation
   */
  private setupEdgeGestures(): void {
    // Enable edge swipe gestures for opening/closing navigation
    this.gestureService.enableEdgeSwipe(
      () => {
        // Swipe right from left edge - open navigation
        if (!this._sidenavOpened() && this.breakpointService.useDrawer()) {
          this._sidenavOpened.set(true);
          if (this.sidenav) {
            this.sidenav.open();
          }
        }
      },
      () => {
        // Swipe left from right edge - close navigation if open
        if (this._sidenavOpened() && this.breakpointService.useDrawer()) {
          this._sidenavOpened.set(false);
          if (this.sidenav) {
            this.sidenav.close();
          }
        }
      }
    );
  }

  /**
   * Setup sidenav-specific gesture handlers
   */
  private setupSidenavGestures(): void {
    if (!this.sidenavElement) return;

    // Enable swipe left on sidenav content to close
    this.gestureService.enableSwipeGestures(
      this.sidenavElement.nativeElement,
      (gesture) => {
        if (gesture.direction === 'left' && 
            this._sidenavOpened() && 
            this.breakpointService.useDrawer()) {
          this._sidenavOpened.set(false);
          if (this.sidenav) {
            this.sidenav.close();
          }
        }
      },
      { horizontal: true, vertical: false, threshold: 75 }
    );
  }
  
  /**
   * Toggle sidenav open/closed
   */
  toggleSidenav(): void {
    this._sidenavOpened.update(opened => !opened);
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }

  /**
   * Toggle search panel
   */
  toggleSearch(): void {
    this._showSearch.update(show => !show);
    
    // Ensure sidenav is open when showing search
    if (this._showSearch() && !this._sidenavOpened()) {
      this._sidenavOpened.set(true);
      if (this.sidenav) {
        this.sidenav.open();
      }
    }

    // Clear search when hiding
    if (!this._showSearch()) {
      this.searchService.clearSearch();
    }
  }

  /**
   * Close search panel
   */
  closeSearch(): void {
    this._showSearch.set(false);
    this.searchService.clearSearch();
  }

  /**
   * Open search panel
   */
  openSearch(): void {
    this._showSearch.set(true);
    
    // Ensure sidenav is open
    if (!this._sidenavOpened()) {
      this._sidenavOpened.set(true);
      if (this.sidenav) {
        this.sidenav.open();
      }
    }
  }

  /**
   * Handle mobile navigation close
   */
  closeMobileNavigation(): void {
    if (this.breakpointService.useDrawer()) {
      this._sidenavOpened.set(false);
      if (this.sidenav) {
        this.sidenav.close();
      }
    }
  }

  /**
   * Handle sidenav closed event
   */
  onSidenavClosed(): void {
    this._sidenavOpened.set(false);
  }

  /**
   * Handle navigation panel resize start
   */
  onResizeStart(event: any): void {
    if (!this.canResize()) return;
    
    this._isResizing.set(true);
    console.log('Resize started:', event);
  }

  /**
   * Handle navigation panel resize move
   */
  onResizeMove(event: any): void {
    if (!this._isResizing()) return;
    
    // Apply width from splitter event
    this.navigationLayoutService.setWidth(event.width).subscribe();
  }

  /**
   * Handle navigation panel resize end
   */
  onResizeEnd(event: any): void {
    this._isResizing.set(false);
    
    // Apply final width and save preference
    this.navigationLayoutService.setWidth(event.width).subscribe({
      next: () => {
        this.navigationLayoutService.saveUserPreference().subscribe();
      }
    });
    
    console.log('Resize ended:', event);
  }

  /**
   * Handle window resize for responsive adjustments
   */
  @HostListener('window:resize', ['$event'])
  onWindowResize(event: Event): void {
    // Auto-adjust layout if needed
    this.navigationLayoutService.autoAdjustLayout().subscribe();
  }

  /**
   * Toggle navigation panel collapse state
   */
  toggleNavigationCollapse(): void {
    this.navigationLayoutService.toggleCollapsed().subscribe();
  }

  /**
   * Reset navigation layout to defaults
   */
  resetLayout(): void {
    this.navigationLayoutService.resetToDefault().subscribe();
  }

  /**
   * Handle mobile menu toggle from mobile menu component
   */
  onMobileMenuToggle(isOpen: boolean): void {
    this._sidenavOpened.set(isOpen);
    if (this.sidenav) {
      if (isOpen) {
        this.sidenav.open();
      } else {
        this.sidenav.close();
      }
    }
  }

  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    // Clean up any remaining listeners or subscriptions
    console.log('AppLayoutComponent destroyed');
  }
}