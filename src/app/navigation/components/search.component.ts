import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, startWith, map } from 'rxjs/operators';
import { Observable, Subscription } from 'rxjs';
import { SearchService } from '../../core/services/search.service';
import { 
  SearchResultItem, 
  SearchResultGroup, 
  SearchCategory,
  SearchSuggestion 
} from '../../shared/models/search-filter.interface';
import { SkillLevel } from '../../shared/models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatSelectModule,
    MatSliderModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatAutocompleteModule
  ],
  template: `
    <div class="search-container">
      
      <!-- Main Search Input -->
      <form [formGroup]="searchForm" class="search-form">
        <mat-form-field class="search-input" appearance="outline">
          <mat-label>Search Angular concepts</mat-label>
          <input 
            matInput 
            formControlName="query"
            placeholder="e.g. components, signals, OnPush..."
            [matAutocomplete]="auto">
          <mat-icon matSuffix>search</mat-icon>
          
          <mat-autocomplete #auto="matAutocomplete" [displayWith]="displaySuggestion">
            @for (suggestion of filteredSuggestions(); track suggestion.text) {
              <mat-option [value]="suggestion.text">
                <div class="suggestion-item">
                  <span class="suggestion-text">{{ suggestion.text }}</span>
                  <mat-chip class="suggestion-type" [class]="'type-' + suggestion.type">
                    {{ suggestion.type }}
                  </mat-chip>
                  <span class="suggestion-count">({{ suggestion.count }})</span>
                </div>
              </mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
        
        <button 
          mat-icon-button 
          type="button"
          (click)="clearSearch()"
          [disabled]="!hasActiveSearch()"
          matTooltip="Clear search">
          <mat-icon>clear</mat-icon>
        </button>
      </form>

      <!-- Search Stats -->
      @if (searchState().totalResults > 0) {
        <div class="search-stats">
          <span class="results-count">
            {{ searchState().totalResults }} results found
          </span>
          <span class="search-time">
            in {{ searchState().searchTime }}ms
          </span>
        </div>
      }

      <!-- Loading Indicator -->
      @if (searchState().isLoading) {
        <div class="search-loading">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>Searching...</p>
        </div>
      }

      <!-- Advanced Filters -->
      <mat-expansion-panel class="filters-panel" [expanded]="showFilters()">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>tune</mat-icon>
            Advanced Filters
          </mat-panel-title>
          <mat-panel-description>
            {{ getActiveFiltersCount() }} filters active
          </mat-panel-description>
        </mat-expansion-panel-header>
        
        <div class="filters-content">
          
          <!-- Skill Level Filter -->
          <div class="filter-group">
            <label class="filter-label">Skill Levels</label>
            <mat-form-field appearance="outline">
              <mat-label>Select skill levels</mat-label>
              <mat-select formControlName="skillLevels" multiple>
                <mat-option value="fundamentals">Fundamentals</mat-option>
                <mat-option value="intermediate">Intermediate</mat-option>
                <mat-option value="advanced">Advanced</mat-option>
                <mat-option value="expert">Expert</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Categories Filter -->
          <div class="filter-group">
            <label class="filter-label">Categories</label>
            <div class="category-chips">
              @for (category of availableCategories; track category.value) {
                <mat-chip-option 
                  [selected]="isCategorySelected(category.value)"
                  (selectionChange)="toggleCategory(category.value, $event.selected)">
                  {{ category.label }}
                </mat-chip-option>
              }
            </div>
          </div>

          <!-- Difficulty Range -->
          <div class="filter-group">
            <label class="filter-label">Difficulty Range</label>
            <div class="difficulty-slider">
              <mat-slider 
                [min]="1" 
                [max]="5" 
                [step]="1"
                [displayWith]="formatDifficulty">
                <input matSliderStartThumb formControlName="minDifficulty">
                <input matSliderEndThumb formControlName="maxDifficulty">
              </mat-slider>
              <div class="difficulty-labels">
                <span>Beginner (1)</span>
                <span>Expert (5)</span>
              </div>
            </div>
          </div>

          <!-- Special Filters -->
          <div class="filter-group">
            <label class="filter-label">Content Features</label>
            <div class="checkbox-group">
              <mat-checkbox formControlName="constitutional">
                Constitutional practices only
              </mat-checkbox>
              <mat-checkbox formControlName="hasCodeExamples">
                Has code examples
              </mat-checkbox>
              <mat-checkbox formControlName="hasBestPractices">
                Has best practices
              </mat-checkbox>
            </div>
          </div>

          <!-- Filter Actions -->
          <div class="filter-actions">
            <button mat-button (click)="resetFilters()">
              <mat-icon>refresh</mat-icon>
              Reset Filters
            </button>
            <button mat-raised-button color="primary" (click)="applyFilters()">
              <mat-icon>search</mat-icon>
              Apply Filters
            </button>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Search Results -->
      @if (searchState().totalResults > 0 && !searchState().isLoading) {
        <div class="search-results">
          
          @for (group of searchState().groupedResults; track group.skillLevel) {
            <div class="results-group">
              <h3 class="group-header">
                <mat-icon [class]="'level-' + group.skillLevel">
                  {{ getSkillLevelIcon(group.skillLevel) }}
                </mat-icon>
                {{ formatSkillLevel(group.skillLevel) }} 
                <span class="group-count">({{ group.totalCount }})</span>
              </h3>
              
              <div class="results-list">
                @for (result of group.results; track result.id) {
                  <div class="result-item" [class.constitutional]="result.constitutional">
                    <div class="result-header">
                      <a [routerLink]="'/concepts/' + result.id" class="result-title">
                        {{ result.title }}
                      </a>
                      <div class="result-badges">
                        @if (result.constitutional) {
                          <mat-chip class="constitutional-badge">
                            <mat-icon>verified</mat-icon>
                            Constitutional
                          </mat-chip>
                        }
                        <mat-chip class="difficulty-badge">
                          Level {{ result.difficulty }}
                        </mat-chip>
                        <mat-chip class="match-badge" [class]="'match-' + result.matchType">
                          {{ result.matchType }}
                        </mat-chip>
                      </div>
                    </div>
                    
                    <p class="result-description">{{ result.description }}</p>
                    
                    @if (result.tags.length > 0) {
                      <div class="result-tags">
                        @for (tag of result.tags.slice(0, 5); track tag) {
                          <mat-chip class="tag-chip">{{ tag }}</mat-chip>
                        }
                      </div>
                    }
                    
                    @if (result.highlightedContent.length > 0) {
                      <div class="result-highlights">
                        <span class="highlights-label">Matches:</span>
                        @for (highlight of result.highlightedContent.slice(0, 3); track highlight) {
                          <span class="highlight-text">{{ highlight }}</span>
                        }
                      </div>
                    }
                    
                    <div class="result-meta">
                      <span class="relevance-score">
                        Relevance: {{ result.relevanceScore }}%
                      </span>
                      @if (result.hasCodeExamples) {
                        <mat-icon class="feature-icon" matTooltip="Has code examples">code</mat-icon>
                      }
                      @if (result.hasBestPractices) {
                        <mat-icon class="feature-icon" matTooltip="Has best practices">star</mat-icon>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- No Results -->
      @if (searchState().totalResults === 0 && !searchState().isLoading && hasActiveSearch()) {
        <div class="no-results">
          <mat-icon class="no-results-icon">search_off</mat-icon>
          <h3>No results found</h3>
          <p>Try adjusting your search terms or filters.</p>
          <div class="search-suggestions">
            <p>Popular searches:</p>
            <div class="suggestion-chips">
              @for (suggestion of popularSearches; track suggestion) {
                <mat-chip (click)="searchSuggestion(suggestion)">
                  {{ suggestion }}
                </mat-chip>
              }
            </div>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (searchState().hasError) {
        <div class="search-error">
          <mat-icon class="error-icon">error</mat-icon>
          <h3>Search Error</h3>
          <p>{{ searchState().errorMessage }}</p>
          <button mat-button (click)="retrySearch()">
            <mat-icon>refresh</mat-icon>
            Try Again
          </button>
        </div>
      }
    </div>
  `,
  styleUrls: ['./search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent implements OnInit, OnDestroy {
  
  // Reactive form for search and filters
  searchForm = new FormGroup({
    query: new FormControl(''),
    skillLevels: new FormControl<SkillLevel[]>([]),
    categories: new FormControl<SearchCategory[]>([]),
    minDifficulty: new FormControl(1),
    maxDifficulty: new FormControl(5),
    constitutional: new FormControl(false),
    hasCodeExamples: new FormControl(false),
    hasBestPractices: new FormControl(false)
  });

  // Component state
  readonly showFilters = signal<boolean>(false);
  readonly selectedCategories = signal<SearchCategory[]>([]);
  
  // Computed properties
  readonly searchState = computed(() => this.searchService.enhancedSearchState());
  readonly hasActiveSearch = computed(() => 
    !!this.searchForm.get('query')?.value || this.getActiveFiltersCount() > 0
  );

  // Autocomplete suggestions
  readonly filteredSuggestions = computed(() => {
    const query = this.searchForm.get('query')?.value || '';
    if (query.length < 2) {
      return this.searchService.suggestions().slice(0, 5);
    }
    
    return this.searchService.suggestions().filter(suggestion =>
      suggestion.text.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8);
  });

  // Available filter options
  readonly availableCategories = [
    { value: SearchCategory.Components, label: 'Components' },
    { value: SearchCategory.Services, label: 'Services' },
    { value: SearchCategory.Directives, label: 'Directives' },
    { value: SearchCategory.Forms, label: 'Forms' },
    { value: SearchCategory.Routing, label: 'Routing' },
    { value: SearchCategory.Testing, label: 'Testing' },
    { value: SearchCategory.Performance, label: 'Performance' },
    { value: SearchCategory.Architecture, label: 'Architecture' }
  ];

  readonly popularSearches = [
    'components',
    'signals',
    'standalone',
    'OnPush',
    'services',
    'routing',
    'forms'
  ];

  private subscriptions = new Subscription();

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    this.initializeSearch();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Initialize search functionality
   */
  private initializeSearch(): void {
    // Setup debounced search on query changes
    const queryControl = this.searchForm.get('query');
    if (queryControl) {
      this.subscriptions.add(
        queryControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged()
        ).subscribe(query => {
          if (query) {
            this.performSearch(query);
          } else {
            this.searchService.clearSearch();
          }
        })
      );
    }
  }

  /**
   * Setup form subscriptions for filter changes
   */
  private setupFormSubscriptions(): void {
    // React to filter changes
    const filterControls = [
      'skillLevels', 'categories', 'minDifficulty', 'maxDifficulty',
      'constitutional', 'hasCodeExamples', 'hasBestPractices'
    ];

    filterControls.forEach(controlName => {
      const control = this.searchForm.get(controlName);
      if (control) {
        this.subscriptions.add(
          control.valueChanges.subscribe(() => {
            if (this.hasActiveSearch()) {
              this.applyFilters();
            }
          })
        );
      }
    });
  }

  /**
   * Perform search with current query and filters
   */
  private performSearch(query: string): void {
    const filters = this.buildFiltersFromForm();
    this.searchService.searchEnhanced(query, filters);
  }

  /**
   * Build search filters from form values
   */
  private buildFiltersFromForm() {
    const formValue = this.searchForm.value;
    
    return {
      skillLevels: formValue.skillLevels || [],
      categories: this.selectedCategories(),
      difficulty: {
        min: formValue.minDifficulty || 1,
        max: formValue.maxDifficulty || 5
      },
      constitutional: formValue.constitutional ? true : null,
      hasCodeExamples: formValue.hasCodeExamples ? true : null,
      hasBestPractices: formValue.hasBestPractices ? true : null
    };
  }

  /**
   * Apply current filters to search
   */
  applyFilters(): void {
    const query = this.searchForm.get('query')?.value || '';
    if (query) {
      this.performSearch(query);
    }
  }

  /**
   * Clear search and reset form
   */
  clearSearch(): void {
    this.searchForm.reset({
      query: '',
      skillLevels: [],
      categories: [],
      minDifficulty: 1,
      maxDifficulty: 5,
      constitutional: false,
      hasCodeExamples: false,
      hasBestPractices: false
    });
    this.selectedCategories.set([]);
    this.searchService.clearSearch();
  }

  /**
   * Reset all filters to default
   */
  resetFilters(): void {
    const query = this.searchForm.get('query')?.value;
    this.searchForm.patchValue({
      skillLevels: [],
      categories: [],
      minDifficulty: 1,
      maxDifficulty: 5,
      constitutional: false,
      hasCodeExamples: false,
      hasBestPractices: false
    });
    this.selectedCategories.set([]);
    
    if (query) {
      this.performSearch(query);
    }
  }

  /**
   * Toggle category selection
   */
  toggleCategory(category: SearchCategory, selected: boolean): void {
    const current = this.selectedCategories();
    if (selected) {
      this.selectedCategories.set([...current, category]);
    } else {
      this.selectedCategories.set(current.filter(c => c !== category));
    }
  }

  /**
   * Check if category is selected
   */
  isCategorySelected(category: SearchCategory): boolean {
    return this.selectedCategories().includes(category);
  }

  /**
   * Get count of active filters
   */
  getActiveFiltersCount(): number {
    let count = 0;
    const formValue = this.searchForm.value;
    
    if (formValue.skillLevels?.length) count++;
    if (this.selectedCategories().length) count++;
    if (formValue.minDifficulty !== 1 || formValue.maxDifficulty !== 5) count++;
    if (formValue.constitutional) count++;
    if (formValue.hasCodeExamples) count++;
    if (formValue.hasBestPractices) count++;
    
    return count;
  }

  /**
   * Search for a suggested term
   */
  searchSuggestion(suggestion: string): void {
    this.searchForm.patchValue({ query: suggestion });
    this.performSearch(suggestion);
  }

  /**
   * Retry search after error
   */
  retrySearch(): void {
    const query = this.searchForm.get('query')?.value;
    if (query) {
      this.performSearch(query);
    }
  }

  /**
   * Display function for autocomplete
   */
  displaySuggestion(suggestion: SearchSuggestion): string {
    return suggestion ? suggestion.text : '';
  }

  /**
   * Format difficulty for slider
   */
  formatDifficulty(value: number): string {
    const labels = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'];
    return labels[value] || value.toString();
  }

  /**
   * Format skill level for display
   */
  formatSkillLevel(level: SkillLevel): string {
    return level.charAt(0).toUpperCase() + level.slice(1);
  }

  /**
   * Get skill level icon
   */
  getSkillLevelIcon(level: SkillLevel): string {
    const icons = {
      [SkillLevel.Fundamentals]: 'school',
      [SkillLevel.Intermediate]: 'trending_up',
      [SkillLevel.Advanced]: 'rocket_launch',
      [SkillLevel.Expert]: 'workspace_premium'
    };
    return icons[level] || 'help';
  }
}