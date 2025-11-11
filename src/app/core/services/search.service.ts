import { Injectable, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { ConceptTopic, SkillLevel, NavigationService } from './navigation.service';

export interface SearchFilter {
  query: string;
  skillLevels: SkillLevel[];
  topics: string[];
  isActive: boolean;
  resultCount: number;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  
  // Reactive search state using Angular Signals
  private readonly searchQuery = signal<string>('');
  private readonly selectedSkillLevels = signal<SkillLevel[]>([]);
  private readonly isSearching = signal<boolean>(false);
  
  // BehaviorSubject for complex filtering operations
  private readonly searchQuerySubject = new BehaviorSubject<string>('');
  private readonly skillLevelFilterSubject = new BehaviorSubject<SkillLevel[]>([]);
  
  // Computed signals for reactive UI
  readonly currentSearchFilter$ = computed<SearchFilter>(() => ({
    query: this.searchQuery(),
    skillLevels: this.selectedSkillLevels(),
    topics: [], // Will be populated by search results
    isActive: this.searchQuery().length > 0 || this.selectedSkillLevels().length > 0,
    resultCount: 0, // Will be updated by search results
    lastUpdated: new Date()
  }));

  readonly isSearchActive$ = computed(() => this.searchQuery().length > 0);
  readonly isLoading$ = computed(() => this.isSearching());

  // Debounced search observable
  private readonly debouncedSearch$ = this.searchQuerySubject.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    startWith('')
  );

  // Combined search and filter observable
  readonly searchResults$: Observable<ConceptTopic[]> = combineLatest([
    this.debouncedSearch$,
    this.skillLevelFilterSubject.pipe(startWith([]))
  ]).pipe(
    map(([query, skillLevels]) => this.performSearch(query, skillLevels))
  );

  constructor(private navigationService: NavigationService) {
    // Update signals when observables change
    this.debouncedSearch$.subscribe(query => {
      this.searchQuery.set(query);
      this.isSearching.set(false);
    });

    this.skillLevelFilterSubject.subscribe(levels => {
      this.selectedSkillLevels.set(levels);
    });
  }

  /**
   * Update search query
   */
  search(query: string): void {
    this.isSearching.set(true);
    this.searchQuerySubject.next(query.trim());
  }

  /**
   * Set skill level filters
   */
  setSkillLevelFilter(levels: SkillLevel[]): void {
    this.skillLevelFilterSubject.next([...levels]);
  }

  /**
   * Clear search query
   */
  clearSearch(): void {
    this.searchQuerySubject.next('');
    this.searchQuery.set('');
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.clearSearch();
    this.skillLevelFilterSubject.next([]);
  }

  /**
   * Perform the actual search operation
   */
  private performSearch(query: string, skillLevels: SkillLevel[]): ConceptTopic[] {
    // Get all topics from navigation service
    const allTopics = this.getAllTopics();
    let filteredTopics = [...allTopics];

    // Apply skill level filter
    if (skillLevels.length > 0) {
      filteredTopics = filteredTopics.filter(topic => 
        skillLevels.includes(topic.level)
      );
    }

    // Apply text search if query exists
    if (query.length > 0) {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      filteredTopics = filteredTopics.filter(topic => {
        const searchableText = [
          topic.title,
          topic.description,
          topic.category,
          ...topic.relatedTopics
        ].join(' ').toLowerCase();

        // Check if all search terms are found (AND logic)
        return searchTerms.every(term => 
          searchableText.includes(term) ||
          this.fuzzyMatch(term, searchableText)
        );
      });

      // Sort by relevance
      filteredTopics = this.sortByRelevance(filteredTopics, query);
    }

    return filteredTopics;
  }

  /**
   * Get all topics from navigation service
   */
  private getAllTopics(): ConceptTopic[] {
    const allLevels = [
      SkillLevel.Fundamentals,
      SkillLevel.Intermediate,
      SkillLevel.Advanced,
      SkillLevel.Expert
    ];

    return allLevels.flatMap(level => 
      this.navigationService.getTopicsByLevel(level)
    );
  }

  /**
   * Simple fuzzy matching for better search results
   */
  private fuzzyMatch(term: string, text: string): boolean {
    if (term.length < 3) return false;

    // Check for partial matches with at least 70% similarity
    const words = text.split(' ');
    return words.some(word => {
      if (word.length < 3) return false;
      
      const similarity = this.calculateSimilarity(term, word);
      return similarity > 0.7;
    });
  }

  /**
   * Calculate string similarity (simplified Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Sort topics by search relevance
   */
  private sortByRelevance(topics: ConceptTopic[], query: string): ConceptTopic[] {
    const queryLower = query.toLowerCase();
    
    return topics.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, queryLower);
      const bScore = this.calculateRelevanceScore(b, queryLower);
      
      return bScore - aScore; // Higher score first
    });
  }

  /**
   * Calculate relevance score for sorting
   */
  private calculateRelevanceScore(topic: ConceptTopic, query: string): number {
    let score = 0;
    const titleLower = topic.title.toLowerCase();
    const descriptionLower = topic.description.toLowerCase();

    // Exact title match gets highest score
    if (titleLower === query) {
      score += 100;
    }
    // Title starts with query
    else if (titleLower.startsWith(query)) {
      score += 50;
    }
    // Title contains query
    else if (titleLower.includes(query)) {
      score += 25;
    }

    // Description matches
    if (descriptionLower.includes(query)) {
      score += 10;
    }

    // Constitutional topics get slight boost
    if (topic.constitutional) {
      score += 5;
    }

    // Fundamentals get slight boost for beginners
    if (topic.level === SkillLevel.Fundamentals) {
      score += 2;
    }

    return score;
  }

  /**
   * Get popular search terms (mock implementation)
   */
  getPopularSearches(): string[] {
    return [
      'components',
      'services',
      'routing',
      'forms',
      'observables',
      'dependency injection',
      'standalone',
      'signals',
      'onpush',
      'testing'
    ];
  }

  /**
   * Get search suggestions based on current query
   */
  getSuggestions(query: string): Observable<string[]> {
    if (query.length < 2) {
      return new Observable(subscriber => {
        subscriber.next(this.getPopularSearches());
        subscriber.complete();
      });
    }

    const allTopics = this.getAllTopics();
    const suggestions = new Set<string>();

    // Add matching topic titles
    allTopics.forEach(topic => {
      if (topic.title.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(topic.title);
      }
    });

    // Add popular searches that match
    this.getPopularSearches().forEach(term => {
      if (term.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(term);
      }
    });

    return new Observable(subscriber => {
      subscriber.next(Array.from(suggestions).slice(0, 8)); // Limit to 8 suggestions
      subscriber.complete();
    });
  }

  /**
   * Track search analytics (for future enhancement)
   */
  trackSearch(query: string, resultCount: number): void {
    // In a real application, this would send analytics data
    console.log('Search tracked:', { query, resultCount, timestamp: new Date() });
  }
}