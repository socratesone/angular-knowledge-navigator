import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { CodeSearchService, CodeSearchResult, CodeSearchOptions, CodePattern } from '../../core/services/code-search.service';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-code-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <div class="code-search" [class.mobile-layout]="breakpointService.isMobile()">
      
      <!-- Search Input Section -->
      <div class="search-input-section">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search code examples</mat-label>
          <input 
            matInput
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchInput($event)"
            placeholder="Search for patterns, functions, or keywords..."
            [disabled]="searchService.isSearching()">
          <mat-icon matSuffix>search</mat-icon>
          <mat-hint>Try: component, signal(), pipe(), or use regex patterns</mat-hint>
        </mat-form-field>
        
        <div class="search-actions">
          <button 
            mat-raised-button
            color="primary"
            (click)="performSearch()"
            [disabled]="!searchQuery || searchService.isSearching()">
            <mat-icon>search</mat-icon>
            Search
          </button>
          
          <button 
            mat-stroked-button
            (click)="clearSearch()"
            [disabled]="!searchService.hasResults() && !searchQuery">
            <mat-icon>clear</mat-icon>
            Clear
          </button>
        </div>
      </div>

      <!-- Search Options -->
      <mat-expansion-panel class="search-options">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>tune</mat-icon>
            Search Options
          </mat-panel-title>
          <mat-panel-description>
            {{ getActiveOptionsCount() }} options configured
          </mat-panel-description>
        </mat-expansion-panel-header>
        
        <div class="options-grid">
          <mat-checkbox 
            [(ngModel)]="options.caseSensitive"
            (ngModelChange)="onOptionsChange()">
            Case sensitive
          </mat-checkbox>
          
          <mat-checkbox 
            [(ngModel)]="options.wholeWord"
            (ngModelChange)="onOptionsChange()">
            Whole word
          </mat-checkbox>
          
          <mat-checkbox 
            [(ngModel)]="options.useRegex"
            (ngModelChange)="onOptionsChange()">
            Use regex
          </mat-checkbox>
          
          <mat-checkbox 
            [(ngModel)]="options.includeComments"
            (ngModelChange)="onOptionsChange()">
            Include comments
          </mat-checkbox>
        </div>
      </mat-expansion-panel>

      <!-- Predefined Patterns -->
      <mat-expansion-panel class="pattern-section">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>auto_awesome</mat-icon>
            Angular Patterns
          </mat-panel-title>
          <mat-panel-description>
            Common Angular code patterns
          </mat-panel-description>
        </mat-expansion-panel-header>
        
        <div class="patterns-grid">
          <mat-chip-set>
            <mat-chip 
              *ngFor="let pattern of availablePatterns(); trackBy: trackByPattern"
              (click)="searchPattern(pattern)"
              [matTooltip]="pattern.description"
              class="pattern-chip">
              <mat-icon>{{ getPatternIcon(pattern) }}</mat-icon>
              {{ pattern.name }}
              <mat-badge 
                [content]="pattern.difficulty"
                size="small"
                color="accent">
              </mat-badge>
            </mat-chip>
          </mat-chip-set>
        </div>
      </mat-expansion-panel>

      <!-- Search Results -->
      <div class="search-results" *ngIf="searchService.hasResults() || searchService.isSearching()">
        
        <!-- Loading State -->
        <div class="loading-state" *ngIf="searchService.isSearching()">
          <mat-progress-spinner [diameter]="40" mode="indeterminate"></mat-progress-spinner>
          <span>Searching code examples...</span>
        </div>
        
        <!-- Results Header -->
        <div class="results-header" *ngIf="searchService.hasResults() && !searchService.isSearching()">
          <h3>Search Results</h3>
          <div class="results-stats">
            <span class="result-count">{{ searchService.resultCount() }} examples</span>
            <span class="match-count">{{ searchService.totalMatches() }} matches</span>
          </div>
        </div>
        
        <!-- Results List -->
        <div class="results-list" *ngIf="!searchService.isSearching()">
          <mat-card 
            *ngFor="let result of searchService.searchResults(); trackBy: trackByResult"
            class="result-card"
            (click)="selectResult(result)">
            
            <mat-card-header>
              <mat-card-title>
                {{ result.codeBlock.title || 'Code Example' }}
                <mat-badge 
                  [content]="result.matches.length"
                  color="primary">
                </mat-badge>
              </mat-card-title>
              
              <mat-card-subtitle>
                <mat-chip class="language-chip">{{ result.codeBlock.language.toUpperCase() }}</mat-chip>
                <span class="relevance-score">Score: {{ result.relevanceScore }}</span>
              </mat-card-subtitle>
            </mat-card-header>
            
            <mat-card-content>
              <div class="context-preview">
                <pre><code [innerHTML]="getHighlightedPreview(result)"></code></pre>
              </div>
              
              <div class="matches-summary">
                <h4>Matches ({{ result.matches.length }}):</h4>
                <div class="matches-list">
                  <span 
                    *ngFor="let match of result.matches.slice(0, 5); trackBy: trackByMatch"
                    class="match-item"
                    [matTooltip]="getMatchTooltip(match)">
                    Line {{ match.line }}:{{ match.column }}
                  </span>
                  <span *ngIf="result.matches.length > 5" class="more-matches">
                    +{{ result.matches.length - 5 }} more
                  </span>
                </div>
              </div>
            </mat-card-content>
            
            <mat-card-actions>
              <button 
                mat-button
                (click)="viewFullCode(result); $event.stopPropagation()">
                <mat-icon>code</mat-icon>
                View Code
              </button>
              
              <button 
                mat-button
                (click)="copyMatches(result); $event.stopPropagation()">
                <mat-icon>content_copy</mat-icon>
                Copy Matches
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
        
        <!-- No Results -->
        <div class="no-results" *ngIf="!searchService.hasResults() && !searchService.isSearching() && searchQuery">
          <mat-icon>search_off</mat-icon>
          <h3>No matches found</h3>
          <p>Try adjusting your search terms or options</p>
          <button mat-stroked-button (click)="showSearchTips()">
            <mat-icon>help</mat-icon>
            Search Tips
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./code-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeSearchComponent implements OnDestroy {
  @Output() resultSelected = new EventEmitter<CodeSearchResult>();
  @Output() viewCodeRequested = new EventEmitter<CodeSearchResult>();

  // Services
  readonly searchService = inject(CodeSearchService);
  readonly breakpointService = inject(BreakpointService);

  // Component state
  searchQuery = '';
  options: CodeSearchOptions = {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    includeComments: true,
    languages: [],
    categories: [],
    tags: []
  };

  // Search input debouncing
  private searchInput$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Computed properties
  readonly availablePatterns = computed(() => this.searchService.getAvailablePatterns());

  constructor() {
    // Setup debounced search
    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query.trim().length > 2) {
        this.performSearch();
      } else if (query.trim().length === 0) {
        this.clearSearch();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle search input changes
   */
  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.searchInput$.next(query);
  }

  /**
   * Handle search options changes
   */
  onOptionsChange(): void {
    this.searchService.updateSearchOptions(this.options);
    if (this.searchQuery.trim()) {
      this.performSearch();
    }
  }

  /**
   * Perform search with current query and options
   */
  async performSearch(): Promise<void> {
    if (!this.searchQuery.trim()) return;
    
    await this.searchService.searchCode(this.searchQuery, this.options);
  }

  /**
   * Search for a specific pattern
   */
  async searchPattern(pattern: CodePattern): Promise<void> {
    const results = this.searchService.searchPatterns(pattern.name);
    this.searchService['_searchResults'].set(results);
    this.searchQuery = `Pattern: ${pattern.name}`;
  }

  /**
   * Clear search results
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.searchService.clearSearch();
  }

  /**
   * Select a search result
   */
  selectResult(result: CodeSearchResult): void {
    this.resultSelected.emit(result);
  }

  /**
   * View full code for a result
   */
  viewFullCode(result: CodeSearchResult): void {
    this.viewCodeRequested.emit(result);
  }

  /**
   * Copy matches to clipboard
   */
  async copyMatches(result: CodeSearchResult): Promise<void> {
    const matchesText = result.matches.map(match => 
      `Line ${match.line}:${match.column} - "${match.text}"`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(matchesText);
      // Could emit success event or show toast
    } catch (error) {
      console.error('Failed to copy matches:', error);
    }
  }

  /**
   * Get count of active search options
   */
  getActiveOptionsCount(): number {
    let count = 0;
    if (this.options.caseSensitive) count++;
    if (this.options.wholeWord) count++;
    if (this.options.useRegex) count++;
    if (!this.options.includeComments) count++; // Non-default value
    return count;
  }

  /**
   * Get highlighted preview for result
   */
  getHighlightedPreview(result: CodeSearchResult): string {
    return this.searchService.highlightMatches(result.contextPreview, result.matches);
  }

  /**
   * Get tooltip for match
   */
  getMatchTooltip(match: any): string {
    return `"${match.text}" at line ${match.line}, column ${match.column}`;
  }

  /**
   * Get icon for pattern based on category
   */
  getPatternIcon(pattern: CodePattern): string {
    const iconMap: Record<string, string> = {
      'components': 'widgets',
      'services': 'build',
      'routing': 'navigation',
      'forms': 'dynamic_form',
      'performance': 'speed',
      'constitutional': 'verified'
    };
    
    return iconMap[pattern.category] || 'code';
  }

  /**
   * Show search tips dialog
   */
  showSearchTips(): void {
    // Could open a dialog with search tips
    console.log('Search tips requested');
  }

  /**
   * Track functions for ngFor
   */
  trackByPattern(index: number, pattern: CodePattern): string {
    return pattern.name;
  }

  trackByResult(index: number, result: CodeSearchResult): string {
    return result.codeBlock.id;
  }

  trackByMatch(index: number, match: any): string {
    return `${match.line}:${match.column}`;
  }
}