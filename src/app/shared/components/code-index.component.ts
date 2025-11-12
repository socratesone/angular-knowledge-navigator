import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { CodeIndexService, CodeIndexEntry, IndexSearchResult, CodeIndexStats } from '../../core/services/code-index.service';
import { BreakpointService } from '../../core/services/breakpoint.service';

@Component({
  selector: 'app-code-index',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    MatSelectModule
  ],
  template: `
    <div class="code-index" [class.mobile-layout]="breakpointService.isMobile()">
      
      <!-- Header Section -->
      <div class="index-header">
        <div class="header-content">
          <h2>
            <mat-icon>storage</mat-icon>
            Code Example Index
          </h2>
          <p>Comprehensive searchable index of all code examples</p>
        </div>
        
        <div class="header-actions">
          <button 
            mat-raised-button
            color="primary"
            (click)="rebuildIndex()"
            [disabled]="indexService.isIndexing()">
            <mat-icon>refresh</mat-icon>
            {{ indexService.isIndexing() ? 'Rebuilding...' : 'Rebuild Index' }}
          </button>
          
          <button 
            mat-stroked-button
            (click)="exportIndex()"
            [disabled]="!indexService.isIndexAvailable()">
            <mat-icon>download</mat-icon>
            Export
          </button>
        </div>
      </div>

      <!-- Index Status -->
      <mat-card class="index-status">
        <mat-card-content>
          <div class="status-grid">
            <div class="status-item">
              <mat-icon color="primary">inventory</mat-icon>
              <div class="status-info">
                <span class="status-value">{{ indexService.indexSize() }}</span>
                <span class="status-label">Total Examples</span>
              </div>
            </div>
            
            <div class="status-item" *ngIf="indexService.lastIndexUpdate()">
              <mat-icon color="accent">schedule</mat-icon>
              <div class="status-info">
                <span class="status-value">{{ getRelativeTime(indexService.lastIndexUpdate()!) }}</span>
                <span class="status-label">Last Updated</span>
              </div>
            </div>
            
            <div class="status-item" *ngIf="indexStats()">
              <mat-icon color="warn">trending_up</mat-icon>
              <div class="status-info">
                <span class="status-value">{{ indexStats()!.averageComplexity.toFixed(1) }}</span>
                <span class="status-label">Avg. Complexity</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="indexService.isIndexing()">
        <mat-progress-spinner [diameter]="60" mode="indeterminate"></mat-progress-spinner>
        <h3>Building Code Index</h3>
        <p>Analyzing and indexing all code examples...</p>
      </div>

      <!-- Main Content Tabs -->
      <mat-tab-group class="index-tabs" *ngIf="indexService.isIndexAvailable() && !indexService.isIndexing()">
        
        <!-- Browse Tab -->
        <mat-tab label="Browse Examples">
          <div class="tab-content">
            
            <!-- Search and Filters -->
            <div class="search-section">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search index</mat-label>
                <input 
                  matInput
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onSearchChange($event)"
                  placeholder="Search by title, keywords, or patterns...">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              
              <div class="filters">
                <mat-form-field appearance="outline">
                  <mat-label>Language</mat-label>
                  <mat-select [(ngModel)]="selectedLanguage" (ngModelChange)="onFiltersChange()">
                    <mat-option value="">All Languages</mat-option>
                    <mat-option 
                      *ngFor="let lang of getAvailableLanguages(); trackBy: trackByString"
                      [value]="lang">
                      {{ getLanguageDisplayName(lang) }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
                
                <mat-form-field appearance="outline">
                  <mat-label>Category</mat-label>
                  <mat-select [(ngModel)]="selectedCategory" (ngModelChange)="onFiltersChange()">
                    <mat-option value="">All Categories</mat-option>
                    <mat-option 
                      *ngFor="let category of getAvailableCategories(); trackBy: trackByString"
                      [value]="category">
                      {{ getCategoryDisplayName(category) }}
                    </mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </div>
            
            <!-- Results -->
            <div class="results-section">
              <div class="results-header" *ngIf="displayedEntries().length > 0">
                <h3>Code Examples ({{ displayedEntries().length }})</h3>
                <div class="view-options">
                  <button 
                    mat-icon-button
                    [color]="viewMode() === 'cards' ? 'primary' : ''"
                    (click)="setViewMode('cards')"
                    matTooltip="Card view">
                    <mat-icon>view_module</mat-icon>
                  </button>
                  <button 
                    mat-icon-button
                    [color]="viewMode() === 'list' ? 'primary' : ''"
                    (click)="setViewMode('list')"
                    matTooltip="List view">
                    <mat-icon>view_list</mat-icon>
                  </button>
                </div>
              </div>
              
              <!-- Card View -->
              <div class="cards-view" *ngIf="viewMode() === 'cards'">
                <mat-card 
                  *ngFor="let entry of displayedEntries(); trackBy: trackByEntry"
                  class="example-card"
                  (click)="selectEntry(entry)">
                  
                  <mat-card-header>
                    <mat-card-title>{{ entry.title }}</mat-card-title>
                    <mat-card-subtitle>
                      <mat-chip class="language-chip">{{ entry.codeBlock.language.toUpperCase() }}</mat-chip>
                      <span class="weight-score">Weight: {{ entry.weight }}</span>
                    </mat-card-subtitle>
                  </mat-card-header>
                  
                  <mat-card-content>
                    <p class="description">{{ entry.description }}</p>
                    
                    <div class="keywords" *ngIf="entry.keywords.length > 0">
                      <mat-chip-set>
                        <mat-chip 
                          *ngFor="let keyword of entry.keywords.slice(0, 5); trackBy: trackByString">
                          {{ keyword }}
                        </mat-chip>
                        <span *ngIf="entry.keywords.length > 5" class="more-keywords">
                          +{{ entry.keywords.length - 5 }} more
                        </span>
                      </mat-chip-set>
                    </div>
                  </mat-card-content>
                  
                  <mat-card-actions>
                    <button 
                      mat-button
                      (click)="viewCode(entry); $event.stopPropagation()">
                      <mat-icon>code</mat-icon>
                      View Code
                    </button>
                    
                    <button 
                      mat-button
                      (click)="findSimilar(entry); $event.stopPropagation()">
                      <mat-icon>find_in_page</mat-icon>
                      Similar
                    </button>
                  </mat-card-actions>
                </mat-card>
              </div>
              
              <!-- List View -->
              <div class="list-view" *ngIf="viewMode() === 'list'">
                <mat-table [dataSource]="displayedEntries()" class="examples-table">
                  
                  <ng-container matColumnDef="title">
                    <mat-header-cell *matHeaderCellDef>Title</mat-header-cell>
                    <mat-cell *matCellDef="let entry">
                      <div class="title-cell">
                        <strong>{{ entry.title }}</strong>
                        <mat-chip class="language-chip">{{ entry.codeBlock.language }}</mat-chip>
                      </div>
                    </mat-cell>
                  </ng-container>
                  
                  <ng-container matColumnDef="description">
                    <mat-header-cell *matHeaderCellDef>Description</mat-header-cell>
                    <mat-cell *matCellDef="let entry">{{ entry.description }}</mat-cell>
                  </ng-container>
                  
                  <ng-container matColumnDef="weight">
                    <mat-header-cell *matHeaderCellDef>Weight</mat-header-cell>
                    <mat-cell *matCellDef="let entry">{{ entry.weight }}</mat-cell>
                  </ng-container>
                  
                  <ng-container matColumnDef="actions">
                    <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
                    <mat-cell *matCellDef="let entry">
                      <button mat-icon-button (click)="viewCode(entry)" matTooltip="View Code">
                        <mat-icon>code</mat-icon>
                      </button>
                      <button mat-icon-button (click)="findSimilar(entry)" matTooltip="Find Similar">
                        <mat-icon>find_in_page</mat-icon>
                      </button>
                    </mat-cell>
                  </ng-container>
                  
                  <mat-header-row *matHeaderRowDef="tableColumns"></mat-header-row>
                  <mat-row 
                    *matRowDef="let entry; columns: tableColumns"
                    (click)="selectEntry(entry)"
                    class="clickable-row"></mat-row>
                </mat-table>
              </div>
            </div>
          </div>
        </mat-tab>
        
        <!-- Statistics Tab -->
        <mat-tab label="Statistics">
          <div class="tab-content" *ngIf="indexStats()">
            
            <div class="stats-grid">
              
              <!-- Language Distribution -->
              <mat-card class="stats-card">
                <mat-card-header>
                  <mat-card-title>Language Distribution</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="distribution-list">
                    <div 
                      *ngFor="let item of getLanguageDistribution(); trackBy: trackByDistribution"
                      class="distribution-item">
                      <span class="item-label">{{ getLanguageDisplayName(item.key) }}</span>
                      <div class="item-bar">
                        <div 
                          class="bar-fill"
                          [style.width.%]="item.percentage">
                        </div>
                      </div>
                      <span class="item-value">{{ item.count }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
              
              <!-- Category Distribution -->
              <mat-card class="stats-card">
                <mat-card-header>
                  <mat-card-title>Category Distribution</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="distribution-list">
                    <div 
                      *ngFor="let item of getCategoryDistribution(); trackBy: trackByDistribution"
                      class="distribution-item">
                      <span class="item-label">{{ getCategoryDisplayName(item.key) }}</span>
                      <div class="item-bar">
                        <div 
                          class="bar-fill"
                          [style.width.%]="item.percentage">
                        </div>
                      </div>
                      <span class="item-value">{{ item.count }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
              
              <!-- Popular Patterns -->
              <mat-card class="stats-card">
                <mat-card-header>
                  <mat-card-title>Popular Patterns</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="patterns-list">
                    <div 
                      *ngFor="let pattern of popularPatterns(); trackBy: trackByPattern"
                      class="pattern-item">
                      <mat-icon>auto_awesome</mat-icon>
                      <div class="pattern-info">
                        <span class="pattern-name">{{ pattern.pattern }}</span>
                        <mat-badge [content]="pattern.count" color="primary"></mat-badge>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>
        
        <!-- Analysis Tab -->
        <mat-tab label="Analysis">
          <div class="tab-content">
            
            <div class="analysis-section" *ngIf="complexityAnalysis()">
              
              <!-- Complexity Distribution -->
              <mat-card class="analysis-card">
                <mat-card-header>
                  <mat-card-title>Complexity Analysis</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="complexity-chart">
                    <div 
                      *ngFor="let item of getComplexityDistribution(); trackBy: trackByDistribution"
                      class="complexity-item">
                      <span class="complexity-label">{{ item.key }}</span>
                      <div class="complexity-bar">
                        <div 
                          class="bar-fill"
                          [style.width.%]="item.percentage"
                          [class]="'complexity-' + item.key.toLowerCase()">
                        </div>
                      </div>
                      <span class="complexity-count">{{ item.count }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
              
              <!-- Recommendations -->
              <mat-card class="analysis-card" *ngIf="complexityAnalysis()!.recommendations.length > 0">
                <mat-card-header>
                  <mat-card-title>Recommendations</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="recommendations-list">
                    <div 
                      *ngFor="let recommendation of complexityAnalysis()!.recommendations; trackBy: trackByString"
                      class="recommendation-item">
                      <mat-icon color="primary">lightbulb</mat-icon>
                      <span>{{ recommendation }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
              
              <!-- Trends -->
              <mat-card class="analysis-card" *ngIf="complexityAnalysis()!.trends.length > 0">
                <mat-card-header>
                  <mat-card-title>Trends</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="trends-list">
                    <div 
                      *ngFor="let trend of complexityAnalysis()!.trends; trackBy: trackByString"
                      class="trend-item">
                      <mat-icon color="accent">trending_up</mat-icon>
                      <span>{{ trend }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
      
      <!-- Empty State -->
      <div class="empty-state" *ngIf="!indexService.isIndexAvailable() && !indexService.isIndexing()">
        <mat-icon>storage</mat-icon>
        <h3>No Index Available</h3>
        <p>Build the code index to start browsing examples</p>
        <button mat-raised-button color="primary" (click)="rebuildIndex()">
          <mat-icon>build</mat-icon>
          Build Index
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./code-index.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeIndexComponent implements OnInit {
  readonly indexService = inject(CodeIndexService);
  readonly breakpointService = inject(BreakpointService);

  // Component state
  searchQuery = '';
  selectedLanguage = '';
  selectedCategory = '';
  readonly viewMode = signal<'cards' | 'list'>('cards');
  
  // Table configuration
  readonly tableColumns = ['title', 'description', 'weight', 'actions'];

  // Computed properties
  readonly indexStats = this.indexService.indexStats;
  
  readonly filteredEntries = computed(() => {
    let entries = this.indexService.indexEntries();
    
    // Apply language filter
    if (this.selectedLanguage) {
      entries = entries.filter(entry => entry.codeBlock.language === this.selectedLanguage);
    }
    
    // Apply category filter
    if (this.selectedCategory) {
      entries = entries.filter(entry => 
        (entry.codeBlock as any).categories?.includes(this.selectedCategory)
      );
    }
    
    return entries;
  });
  
  readonly displayedEntries = computed(() => {
    const entries = this.filteredEntries();
    
    if (!this.searchQuery.trim()) {
      return entries;
    }
    
    // Perform search
    const searchResults = this.indexService.searchIndex(this.searchQuery, {
      languages: this.selectedLanguage ? [this.selectedLanguage] : [],
      categories: this.selectedCategory ? [this.selectedCategory] : [],
      maxResults: 100
    });
    
    return searchResults.map(result => result.entry);
  });
  
  readonly popularPatterns = computed(() => 
    this.indexService.getPopularPatterns(8)
  );
  
  readonly complexityAnalysis = computed(() => 
    this.indexService.getComplexityAnalysis()
  );

  async ngOnInit(): Promise<void> {
    // Build index if not available
    if (!this.indexService.isIndexAvailable()) {
      await this.rebuildIndex();
    }
  }

  /**
   * Rebuild the code index
   */
  async rebuildIndex(): Promise<void> {
    await this.indexService.generateIndex();
  }

  /**
   * Export the index
   */
  exportIndex(): void {
    const indexData = this.indexService.exportIndex();
    const blob = new Blob([indexData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `code-index-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Handle search changes
   */
  onSearchChange(query: string): void {
    this.searchQuery = query;
  }

  /**
   * Handle filter changes
   */
  onFiltersChange(): void {
    // Trigger computed property updates
  }

  /**
   * Set view mode
   */
  setViewMode(mode: 'cards' | 'list'): void {
    this.viewMode.set(mode);
  }

  /**
   * Select an entry
   */
  selectEntry(entry: CodeIndexEntry): void {
    console.log('Selected entry:', entry);
    // Could emit event or navigate
  }

  /**
   * View code for entry
   */
  viewCode(entry: CodeIndexEntry): void {
    console.log('View code:', entry);
    // Could open code viewer
  }

  /**
   * Find similar examples
   */
  findSimilar(entry: CodeIndexEntry): void {
    const similar = this.indexService.getSimilarExamples(entry);
    console.log('Similar examples:', similar);
    // Could show similar examples
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): string[] {
    const stats = this.indexStats();
    return stats ? Object.keys(stats.byLanguage) : [];
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): string[] {
    const stats = this.indexStats();
    return stats ? Object.keys(stats.byCategory) : [];
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
      'bash': 'Bash'
    };
    return displayNames[language] || language.toUpperCase();
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  /**
   * Get relative time string
   */
  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  }

  /**
   * Get distribution data for charts
   */
  getLanguageDistribution(): Array<{ key: string; count: number; percentage: number }> {
    return this.getDistribution(this.indexStats()?.byLanguage || {});
  }

  getCategoryDistribution(): Array<{ key: string; count: number; percentage: number }> {
    return this.getDistribution(this.indexStats()?.byCategory || {});
  }

  getComplexityDistribution(): Array<{ key: string; count: number; percentage: number }> {
    const analysis = this.complexityAnalysis();
    return analysis ? this.getDistribution(analysis.distribution) : [];
  }

  private getDistribution(data: Record<string, number>): Array<{ key: string; count: number; percentage: number }> {
    const total = Object.values(data).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(data)
      .map(([key, count]) => ({
        key,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Track functions for ngFor
   */
  trackByString(index: number, item: string): string {
    return item;
  }

  trackByEntry(index: number, entry: CodeIndexEntry): string {
    return entry.id;
  }

  trackByDistribution(index: number, item: { key: string; count: number }): string {
    return item.key;
  }

  trackByPattern(index: number, pattern: { pattern: string; count: number }): string {
    return pattern.pattern;
  }
}