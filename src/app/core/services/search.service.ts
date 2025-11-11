import { Injectable, signal, computed } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, startWith, switchMap, catchError } from 'rxjs/operators';
import { ConceptTopic, SkillLevel, SearchFilters } from '../../shared/models';
import { 
  SearchFilter as SearchFilterInterface, 
  SearchState, 
  SearchResultItem, 
  SearchResultGroup, 
  SearchCategory, 
  SearchMatchType,
  SearchSuggestion
} from '../../shared/models/search-filter.interface';
import { NavigationService } from './navigation.service';

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

  // Enhanced search state using new interfaces
  private readonly enhancedFilters = signal<SearchFilterInterface>({
    query: '',
    categories: [],
    skillLevels: [],
    tags: [],
    constitutional: null,
    difficulty: { min: 1, max: 5 },
    hasCodeExamples: null,
    hasBestPractices: null
  });
  
  private readonly enhancedResults = signal<SearchResultItem[]>([]);
  private readonly searchError = signal<string | null>(null);
  private readonly searchTime = signal<number>(0);
  readonly suggestions = signal<SearchSuggestion[]>([]);

  // Enhanced computed signals
  readonly enhancedSearchState = computed<SearchState>(() => ({
    query: this.searchQuery(),
    filters: this.enhancedFilters(),
    results: this.enhancedResults(),
    groupedResults: this.groupResultsBySkillLevel(this.enhancedResults()),
    isLoading: this.isSearching(),
    hasError: this.searchError() !== null,
    errorMessage: this.searchError(),
    totalResults: this.enhancedResults().length,
    searchTime: this.searchTime(),
    suggestions: this.suggestions()
  }));

  readonly groupedResults = computed(() => this.groupResultsBySkillLevel(this.enhancedResults()));

  constructor(private navigationService: NavigationService) {
    // Update signals when observables change
    this.debouncedSearch$.subscribe(query => {
      this.searchQuery.set(query);
      this.isSearching.set(false);
    });

    this.skillLevelFilterSubject.subscribe(levels => {
      this.selectedSkillLevels.set(levels);
    });

    this.initializeEnhancedSearch();
    this.loadSearchSuggestions();
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
        subscriber.next([]);
        subscriber.complete();
      });
    }

    return new Observable(subscriber => {
      const topicSuggestions = [
        'components', 'services', 'routing', 'forms', 'observables',
        'dependency injection', 'standalone', 'signals', 'onpush', 'testing'
      ];
      const suggestions = topicSuggestions.filter((suggestion: string) =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);

      setTimeout(() => {
        subscriber.next(suggestions);
        subscriber.complete();
      }, 100);
    });
  }

  /**
   * Initialize enhanced search functionality
   */
  private initializeEnhancedSearch(): void {
    // Enhanced search with debouncing
    combineLatest([
      this.debouncedSearch$,
      this.skillLevelFilterSubject.pipe(startWith([]))
    ]).pipe(
      switchMap(([query, skillLevels]) => {
        if (!query.trim()) {
          return of([]);
        }
        return this.performEnhancedSearch(query, { 
          ...this.enhancedFilters(), 
          query, 
          skillLevels 
        });
      }),
      catchError(error => {
        this.searchError.set(`Search failed: ${error.message}`);
        return of([]);
      })
    ).subscribe(results => {
      this.enhancedResults.set(results);
      this.searchError.set(null);
    });
  }

  /**
   * Perform enhanced search with filtering and scoring
   */
  private performEnhancedSearch(query: string, filters: SearchFilterInterface): Observable<SearchResultItem[]> {
    return this.navigationService.navigationTree$.pipe(
      map(nodes => {
        const startTime = performance.now();
        const allTopics = this.extractTopicsFromNodes(nodes);
        const results = this.filterAndScoreResults(allTopics, query, filters);
        const endTime = performance.now();
        
        this.searchTime.set(Math.round(endTime - startTime));
        return this.sortResultsByRelevance(results);
      })
    );
  }

  /**
   * Extract topics from navigation nodes
   */
  private extractTopicsFromNodes(nodes: any[]): ConceptTopic[] {
    const topics: ConceptTopic[] = [];
    
    const traverse = (nodeList: any[]) => {
      nodeList.forEach(node => {
        if (node.type === 'topic') {
          const topic: ConceptTopic = {
            id: node.id,
            title: node.title,
            slug: node.slug,
            level: node.level,
            skillLevel: node.level,
            description: `Learn about ${node.title} in Angular development`,
            tags: [node.level, 'angular'],
            estimatedReadingTime: 10,
            difficulty: this.getTopicDifficulty(node.level) as 1 | 2 | 3 | 4 | 5,
            prerequisites: [],
            relatedTopics: [],
            lastUpdated: new Date(),
            constitutional: this.isConstitutionalTopic(node.title),
            category: node.level,
            contentPath: `/assets/concepts/${node.id}.md`
          };
          topics.push(topic);
        }
        
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    
    traverse(nodes);
    return topics;
  }

  /**
   * Filter and score search results
   */
  private filterAndScoreResults(
    topics: ConceptTopic[], 
    query: string, 
    filters: SearchFilterInterface
  ): SearchResultItem[] {
    const queryLower = query.toLowerCase();
    const results: SearchResultItem[] = [];

    topics.forEach(topic => {
      let relevanceScore = 0;
      let matchType = SearchMatchType.Fuzzy;
      const highlightedContent: string[] = [];

      // Title matching (highest weight)
      if (topic.title.toLowerCase().includes(queryLower)) {
        if (topic.title.toLowerCase() === queryLower) {
          relevanceScore += 100;
          matchType = SearchMatchType.Exact;
        } else if (topic.title.toLowerCase().startsWith(queryLower)) {
          relevanceScore += 80;
          matchType = SearchMatchType.Partial;
        } else {
          relevanceScore += 60;
          matchType = SearchMatchType.Partial;
        }
        highlightedContent.push(topic.title);
      }

      // Description matching
      if (topic.description.toLowerCase().includes(queryLower)) {
        relevanceScore += 30;
        highlightedContent.push(topic.description);
      }

      // Tag matching
      const matchingTags = topic.tags.filter(tag => 
        tag.toLowerCase().includes(queryLower)
      );
      relevanceScore += matchingTags.length * 20;
      highlightedContent.push(...matchingTags);

      // Apply filters
      if (!this.passesFilters(topic, filters)) {
        return;
      }

      // Only include results with some relevance
      if (relevanceScore > 0) {
        const result: SearchResultItem = {
          id: topic.id,
          title: topic.title,
          slug: topic.slug,
          description: topic.description,
          skillLevel: topic.skillLevel,
          difficulty: topic.difficulty,
          tags: topic.tags,
          constitutional: topic.constitutional || false,
          hasCodeExamples: Math.random() > 0.3, // Mock
          hasBestPractices: topic.constitutional || Math.random() > 0.5, // Mock
          contentPath: topic.contentPath || '',
          relevanceScore,
          highlightedContent,
          matchType
        };
        
        results.push(result);
      }
    });

    return results;
  }

  /**
   * Check if topic passes current filters
   */
  private passesFilters(topic: ConceptTopic, filters: SearchFilterInterface): boolean {
    // Skill level filter
    if (filters.skillLevels.length > 0 && !filters.skillLevels.includes(topic.skillLevel)) {
      return false;
    }

    // Difficulty filter
    if (topic.difficulty < filters.difficulty.min || topic.difficulty > filters.difficulty.max) {
      return false;
    }

    // Constitutional filter
    if (filters.constitutional !== null && (topic.constitutional || false) !== filters.constitutional) {
      return false;
    }

    return true;
  }

  /**
   * Sort results by relevance score
   */
  private sortResultsByRelevance(results: SearchResultItem[]): SearchResultItem[] {
    return results.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      if (a.constitutional !== b.constitutional) {
        return b.constitutional ? 1 : -1;
      }
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Group results by skill level
   */
  private groupResultsBySkillLevel(results: SearchResultItem[]): SearchResultGroup[] {
    const groups = new Map<SkillLevel, SearchResultItem[]>();
    
    Object.values(SkillLevel).forEach(level => {
      groups.set(level, []);
    });
    
    results.forEach(result => {
      const group = groups.get(result.skillLevel);
      if (group) {
        group.push(result);
      }
    });
    
    return Array.from(groups.entries()).map(([skillLevel, results]) => ({
      skillLevel,
      results,
      totalCount: results.length
    })).filter(group => group.totalCount > 0);
  }

  /**
   * Load search suggestions
   */
  private loadSearchSuggestions(): void {
    const commonSuggestions: SearchSuggestion[] = [
      { text: 'components', type: 'category', count: 15 },
      { text: 'services', type: 'category', count: 8 },
      { text: 'signals', type: 'topic', count: 3 },
      { text: 'standalone', type: 'tag', count: 12 },
      { text: 'OnPush', type: 'tag', count: 6 }
    ];
    
    this.suggestions.set(commonSuggestions);
  }

  /**
   * Helper methods
   */
  private getTopicDifficulty(level: SkillLevel): number {
    const difficultyMap = {
      [SkillLevel.Fundamentals]: 1,
      [SkillLevel.Intermediate]: 2,
      [SkillLevel.Advanced]: 3,
      [SkillLevel.Expert]: 4
    };
    return difficultyMap[level] || 1;
  }

  private isConstitutionalTopic(title: string): boolean {
    const keywords = ['standalone', 'onpush', 'signals', 'constitutional'];
    return keywords.some(keyword => title.toLowerCase().includes(keyword));
  }

  /**
   * Enhanced search method for external use
   */
  searchEnhanced(query: string, filters?: Partial<SearchFilterInterface>): void {
    const startTime = performance.now();
    
    this.isSearching.set(true);
    this.searchError.set(null);
    
    if (filters) {
      const updatedFilters = { ...this.enhancedFilters(), ...filters, query };
      this.enhancedFilters.set(updatedFilters);
    } else {
      const updatedFilters = { ...this.enhancedFilters(), query };
      this.enhancedFilters.set(updatedFilters);
    }
    
    this.searchQuerySubject.next(query);
  }

  /**
   * Update enhanced filters
   */
  updateEnhancedFilters(filters: Partial<SearchFilterInterface>): void {
    const updatedFilters = { ...this.enhancedFilters(), ...filters };
    this.enhancedFilters.set(updatedFilters);
  }
}