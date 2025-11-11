import { Component, ChangeDetectionStrategy, ViewChild, signal, computed } from '@angular/core';
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
import { SearchService } from '../../core/services/search.service';

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
    SearchComponent
  ],
  template: `
    <div class="app-layout" data-testid="app-layout">
      <mat-toolbar color="primary" class="app-header">
        <button 
          mat-icon-button 
          (click)="toggleSidenav()" 
          class="menu-toggle"
          matTooltip="Toggle navigation">
          <mat-icon>menu</mat-icon>
        </button>
        
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
          mode="side" 
          [opened]="sidenavOpened()" 
          class="app-sidenav"
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
                <app-navigation-tree data-testid="navigation-tree"></app-navigation-tree>
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
export class AppLayoutComponent {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  
  // Component state
  private readonly _showSearch = signal<boolean>(false);
  private readonly _sidenavOpened = signal<boolean>(true);
  
  // Public computed properties
  readonly showSearch = computed(() => this._showSearch());
  readonly sidenavOpened = computed(() => this._sidenavOpened());
  readonly searchResultsCount = computed(() => this.searchService.enhancedSearchState().totalResults);

  constructor(private searchService: SearchService) {}
  
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
}