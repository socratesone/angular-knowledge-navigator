import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodeCategoryService, CodeFilter, CodeCategory, CodeTag } from '../../core/services/code-category.service';
import { BreakpointService } from '../../core/services/breakpoint.service';

@Component({
  selector: 'app-code-filter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  template: `
    <div class="code-filter" [class.mobile-layout]="breakpointService.isMobile()">
      
      <!-- Search Input -->
      <div class="search-section">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search code examples</mat-label>
          <input 
            matInput 
            [(ngModel)]="searchTerm"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search by title, content, or tags..."
            [value]="currentFilter().searchTerm || ''">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        
        <!-- Quick Actions -->
        <div class="quick-actions">
          <button 
            mat-stroked-button
            (click)="clearAllFilters()"
            [disabled]="!hasActiveFilters()"
            matTooltip="Clear all filters">
            <mat-icon>clear_all</mat-icon>
            Clear
          </button>
          
          <button
            mat-stroked-button  
            (click)="toggleShowPopular()"
            [color]="showPopular() ? 'accent' : ''"
            matTooltip="Show popular tags">
            <mat-icon>trending_up</mat-icon>
            Popular
          </button>
        </div>
      </div>

      <!-- Active Filters Summary -->
      <div class="active-filters" *ngIf="hasActiveFilters()">
        <div class="filter-summary">
          <span class="filter-count">{{ getActiveFilterCount() }} filters active</span>
          <span class="result-count">{{ filteredCount }} examples found</span>
        </div>
        
        <div class="active-filter-chips">
          <!-- Selected Categories -->
          <mat-chip-set *ngIf="currentFilter().categories.length > 0">
            <mat-chip 
              *ngFor="let categoryId of currentFilter().categories; trackBy: trackById"
              (removed)="removeCategoryFilter(categoryId)"
              [style.background-color]="getCategoryColor(categoryId)"
              class="active-filter-chip">
              <mat-icon>{{ getCategoryIcon(categoryId) }}</mat-icon>
              {{ getCategoryName(categoryId) }}
              <mat-icon matChipRemove>cancel</mat-icon>
            </mat-chip>
          </mat-chip-set>
          
          <!-- Selected Tags -->
          <mat-chip-set *ngIf="currentFilter().tags.length > 0">
            <mat-chip 
              *ngFor="let tagId of currentFilter().tags; trackBy: trackById"
              (removed)="removeTagFilter(tagId)"
              [style.background-color]="getTagColor(tagId)"
              class="active-filter-chip">
              {{ getTagName(tagId) }}
              <mat-icon matChipRemove>cancel</mat-icon>
            </mat-chip>
          </mat-chip-set>
        </div>
      </div>

      <!-- Categories Section -->
      <mat-expansion-panel class="filter-section">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>category</mat-icon>
            Categories
          </mat-panel-title>
          <mat-panel-description *ngIf="currentFilter().categories.length > 0">
            {{ currentFilter().categories.length }} selected
          </mat-panel-description>
        </mat-expansion-panel-header>
        
        <div class="category-grid">
          <div 
            *ngFor="let category of categoryService.categories(); trackBy: trackByCategory"
            class="category-item"
            [class.selected]="isCategorySelected(category.id)"
            (click)="toggleCategory(category.id)">
            
            <div class="category-header">
              <mat-icon 
                [style.color]="category.color"
                class="category-icon">
                {{ category.icon }}
              </mat-icon>
              <span class="category-name">{{ category.name }}</span>
            </div>
            
            <div class="category-stats">
              <mat-badge 
                [content]="getCategoryCount(category.id)"
                [hidden]="getCategoryCount(category.id) === 0"
                color="primary">
                <span class="category-description">{{ category.description }}</span>
              </mat-badge>
            </div>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Tags Section -->
      <mat-expansion-panel class="filter-section">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>local_offer</mat-icon>
            Tags
          </mat-panel-title>
          <mat-panel-description *ngIf="currentFilter().tags.length > 0">
            {{ currentFilter().tags.length }} selected
          </mat-panel-description>
        </mat-expansion-panel-header>
        
        <!-- Popular Tags (when enabled) -->
        <div class="popular-tags" *ngIf="showPopular()">
          <h4>Popular Tags</h4>
          <mat-chip-set>
            <mat-chip 
              *ngFor="let tag of getPopularTags(); trackBy: trackByTag"
              (click)="toggleTag(tag.id)"
              [selected]="isTagSelected(tag.id)"
              [style.background-color]="tag.color">
              {{ tag.name }}
              <mat-badge 
                [content]="tag.count"
                [hidden]="tag.count === 0"
                size="small"
                color="accent">
              </mat-badge>
            </mat-chip>
          </mat-chip-set>
        </div>
        
        <!-- All Tags by Category -->
        <div class="tags-by-category">
          <div 
            *ngFor="let category of categoryService.categories(); trackBy: trackByCategory"
            class="tag-category-group">
            
            <h4 class="tag-category-title">
              <mat-icon [style.color]="category.color">{{ category.icon }}</mat-icon>
              {{ category.name }}
            </h4>
            
            <mat-chip-set>
              <mat-chip 
                *ngFor="let tag of getTagsByCategory(category.id); trackBy: trackByTag"
                (click)="toggleTag(tag.id)"
                [selected]="isTagSelected(tag.id)"
                [style.background-color]="tag.color"
                [matTooltip]="tag.description">
                {{ tag.name }}
                <mat-badge 
                  [content]="getTagCount(tag.id)"
                  [hidden]="getTagCount(tag.id) === 0"
                  size="small"
                  color="accent">
                </mat-badge>
              </mat-chip>
            </mat-chip-set>
          </div>
        </div>
      </mat-expansion-panel>

      <!-- Languages Section -->
      <mat-expansion-panel class="filter-section">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon>code</mat-icon>
            Languages
          </mat-panel-title>
          <mat-panel-description *ngIf="currentFilter().languages.length > 0">
            {{ currentFilter().languages.length }} selected
          </mat-panel-description>
        </mat-expansion-panel-header>
        
        <mat-chip-set>
          <mat-chip 
            *ngFor="let language of availableLanguages(); trackBy: trackById"
            (click)="toggleLanguage(language)"
            [selected]="isLanguageSelected(language)">
            {{ getLanguageDisplayName(language) }}
          </mat-chip>
        </mat-chip-set>
      </mat-expansion-panel>
    </div>
  `,
  styleUrls: ['./code-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeFilterComponent {
  @Input() filteredCount: number = 0;
  @Output() filterChange = new EventEmitter<CodeFilter>();

  // Services
  readonly categoryService = inject(CodeCategoryService);
  readonly breakpointService = inject(BreakpointService);

  // Component state
  readonly showPopular = signal<boolean>(false);
  searchTerm = '';

  // Computed properties
  readonly currentFilter = this.categoryService.activeFilter;
  readonly availableLanguages = computed(() => [
    'typescript', 'javascript', 'html', 'css', 'scss', 'json', 'bash', 'markdown'
  ]);

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    const filter = this.currentFilter();
    return filter.categories.length > 0 ||
           filter.tags.length > 0 ||
           filter.languages.length > 0 ||
           !!filter.searchTerm;
  }

  /**
   * Get count of active filters
   */
  getActiveFilterCount(): number {
    const filter = this.currentFilter();
    return filter.categories.length + 
           filter.tags.length + 
           filter.languages.length +
           (filter.searchTerm ? 1 : 0);
  }

  /**
   * Handle search input changes
   */
  onSearchChange(searchTerm: string): void {
    this.categoryService.updateFilter({ searchTerm: searchTerm || undefined });
    this.emitFilterChange();
  }

  /**
   * Toggle category selection
   */
  toggleCategory(categoryId: string): void {
    const current = this.currentFilter().categories;
    const updated = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];
    
    this.categoryService.updateFilter({ categories: updated });
    this.emitFilterChange();
  }

  /**
   * Toggle tag selection
   */
  toggleTag(tagId: string): void {
    const current = this.currentFilter().tags;
    const updated = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId];
    
    this.categoryService.updateFilter({ tags: updated });
    this.emitFilterChange();
  }

  /**
   * Toggle language selection
   */
  toggleLanguage(language: string): void {
    const current = this.currentFilter().languages;
    const updated = current.includes(language)
      ? current.filter(lang => lang !== language)
      : [...current, language];
    
    this.categoryService.updateFilter({ languages: updated });
    this.emitFilterChange();
  }

  /**
   * Remove category filter
   */
  removeCategoryFilter(categoryId: string): void {
    const updated = this.currentFilter().categories.filter(id => id !== categoryId);
    this.categoryService.updateFilter({ categories: updated });
    this.emitFilterChange();
  }

  /**
   * Remove tag filter
   */
  removeTagFilter(tagId: string): void {
    const updated = this.currentFilter().tags.filter(id => id !== tagId);
    this.categoryService.updateFilter({ tags: updated });
    this.emitFilterChange();
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.searchTerm = '';
    this.categoryService.clearFilters();
    this.emitFilterChange();
  }

  /**
   * Toggle show popular tags
   */
  toggleShowPopular(): void {
    this.showPopular.update(show => !show);
  }

  /**
   * Check if category is selected
   */
  isCategorySelected(categoryId: string): boolean {
    return this.currentFilter().categories.includes(categoryId);
  }

  /**
   * Check if tag is selected
   */
  isTagSelected(tagId: string): boolean {
    return this.currentFilter().tags.includes(tagId);
  }

  /**
   * Check if language is selected
   */
  isLanguageSelected(language: string): boolean {
    return this.currentFilter().languages.includes(language);
  }

  /**
   * Get category information
   */
  getCategoryName(categoryId: string): string {
    return this.categoryService.getCategoryById(categoryId)?.name || categoryId;
  }

  getCategoryColor(categoryId: string): string {
    return this.categoryService.getCategoryById(categoryId)?.color || '#666';
  }

  getCategoryIcon(categoryId: string): string {
    return this.categoryService.getCategoryById(categoryId)?.icon || 'category';
  }

  getCategoryCount(categoryId: string): number {
    return this.categoryService.categoryStats().get(categoryId) || 0;
  }

  /**
   * Get tag information
   */
  getTagName(tagId: string): string {
    return this.categoryService.getTagById(tagId)?.name || tagId;
  }

  getTagColor(tagId: string): string {
    return this.categoryService.getTagById(tagId)?.color || '#666';
  }

  getTagCount(tagId: string): number {
    return this.categoryService.tagStats().get(tagId) || 0;
  }

  /**
   * Get popular tags
   */
  getPopularTags(): CodeTag[] {
    return this.categoryService.getPopularTags(8);
  }

  /**
   * Get tags by category
   */
  getTagsByCategory(categoryId: string): CodeTag[] {
    return this.categoryService.getTagsByCategory(categoryId);
  }

  /**
   * Get language display name
   */
  getLanguageDisplayName(language: string): string {
    const displayNames: Record<string, string> = {
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'bash': 'Bash',
      'markdown': 'Markdown'
    };
    
    return displayNames[language] || language.toUpperCase();
  }

  /**
   * Emit filter change event
   */
  private emitFilterChange(): void {
    this.filterChange.emit(this.currentFilter());
  }

  /**
   * Track functions for ngFor
   */
  trackById(index: number, item: string): string {
    return item;
  }

  trackByCategory(index: number, category: CodeCategory): string {
    return category.id;
  }

  trackByTag(index: number, tag: CodeTag): string {
    return tag.id;
  }
}