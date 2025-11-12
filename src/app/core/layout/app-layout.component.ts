import { Component, ChangeDetectionStrategy, ViewChild, signal, computed, inject, effect, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSidenav } from '@angular/material/sidenav';
import { NavigationTreeComponent } from '../../navigation/components/navigation-tree.component';
import { SearchComponent } from '../../navigation/components/search.component';
import { MobileMenuComponent } from './mobile-menu.component';
import { SearchService } from '../../core/services/search.service';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { GestureService } from '../../core/services/gesture.service';

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
    MobileMenuComponent
  ],
  template: `
    <div class="app-layout" 
         [class.mobile-layout]="breakpointService.isMobile()"
         [class.tablet-layout]="breakpointService.isTablet()"
         [class.desktop-layout]="breakpointService.isDesktop()"
         data-testid="app-layout">
      <mat-toolbar color="primary" class="app-header">
        <!-- Mobile menu button -->
        @if (breakpointService.useDrawer()) {
          <app-mobile-menu
            [isMenuOpen]="sidenavOpened()"
            (menuToggle)="onMobileMenuToggle($event)">
          </app-mobile-menu>
        } @else if (!sidenavOpened()) {
          <!-- Desktop menu toggle when sidebar is closed -->
          <button 
            mat-icon-button 
            (click)="toggleSidenav()" 
            class="menu-toggle"
            matTooltip="Open navigation">
            <mat-icon>menu</mat-icon>
          </button>
        }
        
        <span class="app-title">Angular Knowledge Navigator</span>
        
        <!-- Search Toggle Button -->
        <button 
          mat-icon-button 
          (click)="toggleSearch()"
          [class.search-active]="showSearch()"
          matTooltip="Toggle search"
          class="search-toggle">
          <mat-icon>{{ showSearch() ? 'search_off' : 'search' }}</mat-icon>
        </button>
        
        <span class="spacer"></span>
        
        <!-- Search Results Count -->
        @if (showSearch() && searchResultsCount() > 0) {
          <span class="search-results-badge">
            {{ searchResultsCount() }} results
          </span>
        }
        
        <button mat-icon-button matTooltip="Settings">
          <mat-icon>settings</mat-icon>
        </button>
      </mat-toolbar>

      <mat-sidenav-container class="app-container">
        <mat-sidenav 
          #sidenav 
          [mode]="sidenavMode()" 
          [opened]="sidenavOpened()" 
          [disableClose]="breakpointService.isDesktop()"
          class="app-sidenav"
          (closedStart)="onSidenavClosed()"
          [fixedInViewport]="true"
        >
          <div class="sidenav-content">
            <!-- Search Panel -->
            @if (showSearch()) {
              <div class="search-panel">
                <div class="search-header">
                  <h3>Search</h3>
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
              <div class="navigation-panel">
                <div class="navigation-header">
                  <h3>Navigation</h3>
                  <button 
                    mat-icon-button 
                    (click)="toggleSearch()" 
                    matTooltip="Open search"
                    class="open-search">
                    <mat-icon>search</mat-icon>
                  </button>
                </div>
                <app-navigation-tree 
                  [showMobileHeader]="breakpointService.isMobile()"
                  (mobileNavigationClose)="closeMobileNavigation()"
                  data-testid="navigation-tree">
                </app-navigation-tree>
              </div>
            }
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="app-content">
          <main class="content-area">
            <router-outlet></router-outlet>
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styleUrls: ['./app-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent implements AfterViewInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  @ViewChild('sidenav', { read: ElementRef }) sidenavElement!: ElementRef<HTMLElement>;
  
  // Constitutional services
  readonly breakpointService = inject(BreakpointService);
  private searchService = inject(SearchService);
  private gestureService = inject(GestureService);
  
  // Component state
  private readonly _showSearch = signal<boolean>(false);
  private readonly _sidenavOpened = signal<boolean>(true);
  
  // Public computed properties
  readonly showSearch = computed(() => this._showSearch());
  readonly sidenavOpened = computed(() => this._sidenavOpened());
  readonly searchResultsCount = computed(() => this.searchService.enhancedSearchState().totalResults);
  
  // Responsive computed properties
  readonly sidenavMode = computed(() => {
    return this.breakpointService.useDrawer() ? 'over' : 'side';
  });

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
}