import { Injectable, signal, computed, inject } from '@angular/core';
import { CodeBlock } from './markdown-processor.service';
import { CodeCategoryService, CodeExampleMeta } from './code-category.service';
import { ContentService } from './content.service';

export interface CodeIndexEntry {
  id: string;
  title: string;
  description: string;
  codeBlock: CodeBlock;
  keywords: string[];
  searchableText: string;
  weight: number;
  conceptPath: string;
  lastModified: Date;
}

export interface CodeIndexStats {
  totalExamples: number;
  byLanguage: Record<string, number>;
  byCategory: Record<string, number>;
  byDifficulty: Record<number, number>;
  averageComplexity: number;
  mostUsedPatterns: Array<{ pattern: string; count: number }>;
}

export interface IndexSearchResult {
  entry: CodeIndexEntry;
  score: number;
  matchReasons: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CodeIndexService {
  private categoryService = inject(CodeCategoryService);
  private contentService = inject(ContentService);

  // Index state
  private readonly _indexEntries = signal<CodeIndexEntry[]>([]);
  private readonly _indexStats = signal<CodeIndexStats | null>(null);
  private readonly _lastIndexUpdate = signal<Date | null>(null);
  private readonly _isIndexing = signal<boolean>(false);

  // Computed properties
  readonly indexEntries = this._indexEntries.asReadonly();
  readonly indexStats = this._indexStats.asReadonly();
  readonly lastIndexUpdate = this._lastIndexUpdate.asReadonly();
  readonly isIndexing = this._isIndexing.asReadonly();

  readonly isIndexAvailable = computed(() => this._indexEntries().length > 0);
  readonly indexSize = computed(() => this._indexEntries().length);

  /**
   * Generate comprehensive code index from all available content
   */
  async generateIndex(): Promise<void> {
    this._isIndexing.set(true);
    
    try {
      const entries: CodeIndexEntry[] = [];
      const codeExamples = this.categoryService.codeExamples();
      
      // Process each code example
      for (const example of codeExamples) {
        const entry = await this.createIndexEntry(example);
        if (entry) {
          entries.push(entry);
        }
      }

      // Sort by weight and relevance
      entries.sort((a, b) => b.weight - a.weight);

      // Update state
      this._indexEntries.set(entries);
      this._indexStats.set(this.generateStats(entries));
      this._lastIndexUpdate.set(new Date());

      console.log(`Code index generated with ${entries.length} entries`);
    } finally {
      this._isIndexing.set(false);
    }
  }

  /**
   * Search the code index with advanced scoring
   */
  searchIndex(query: string, options: {
    maxResults?: number;
    minScore?: number;
    languages?: string[];
    categories?: string[];
    conceptPaths?: string[];
  } = {}): IndexSearchResult[] {
    const { 
      maxResults = 50, 
      minScore = 0.1,
      languages = [],
      categories = [],
      conceptPaths = []
    } = options;

    if (!query.trim()) return [];

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 2);
    const results: IndexSearchResult[] = [];

    for (const entry of this._indexEntries()) {
      // Apply filters
      if (languages.length > 0 && !languages.includes(entry.codeBlock.language)) continue;
      if (categories.length > 0 && !(entry.codeBlock as CodeExampleMeta).categories?.some(cat => categories.includes(cat))) continue;
      if (conceptPaths.length > 0 && !conceptPaths.some(path => entry.conceptPath.includes(path))) continue;

      const searchResult = this.scoreEntry(entry, queryLower, queryTerms);
      
      if (searchResult.score >= minScore) {
        results.push(searchResult);
      }
    }

    // Sort by score (descending) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Get index entries by category
   */
  getEntriesByCategory(categoryId: string): CodeIndexEntry[] {
    return this._indexEntries().filter(entry => 
      (entry.codeBlock as CodeExampleMeta).categories?.includes(categoryId)
    );
  }

  /**
   * Get index entries by language
   */
  getEntriesByLanguage(language: string): CodeIndexEntry[] {
    return this._indexEntries().filter(entry => 
      entry.codeBlock.language === language
    );
  }

  /**
   * Get most popular code patterns
   */
  getPopularPatterns(limit: number = 10): Array<{ pattern: string; count: number; examples: CodeIndexEntry[] }> {
    const patternMap = new Map<string, CodeIndexEntry[]>();
    
    // Analyze common patterns in code
    for (const entry of this._indexEntries()) {
      const patterns = this.extractPatterns(entry.codeBlock.code);
      
      for (const pattern of patterns) {
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, []);
        }
        patternMap.get(pattern)!.push(entry);
      }
    }

    // Convert to sorted array
    return Array.from(patternMap.entries())
      .map(([pattern, examples]) => ({ pattern, count: examples.length, examples }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get similar code examples based on content similarity
   */
  getSimilarExamples(targetEntry: CodeIndexEntry, limit: number = 5): CodeIndexEntry[] {
    const similarities: Array<{ entry: CodeIndexEntry; score: number }> = [];

    for (const entry of this._indexEntries()) {
      if (entry.id === targetEntry.id) continue;

      const similarityScore = this.calculateSimilarity(targetEntry, entry);
      if (similarityScore > 0.3) {
        similarities.push({ entry, score: similarityScore });
      }
    }

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.entry);
  }

  /**
   * Get code complexity analysis
   */
  getComplexityAnalysis(): {
    distribution: Record<string, number>;
    recommendations: string[];
    trends: string[];
  } {
    const entries = this._indexEntries();
    const complexityMap = new Map<string, number>();
    
    for (const entry of entries) {
      const complexity = this.calculateComplexity(entry.codeBlock);
      const level = this.getComplexityLevel(complexity);
      complexityMap.set(level, (complexityMap.get(level) || 0) + 1);
    }

    const distribution = Object.fromEntries(complexityMap);
    
    const recommendations = this.generateComplexityRecommendations(distribution);
    const trends = this.analyzeTrends(entries);

    return { distribution, recommendations, trends };
  }

  /**
   * Export index as JSON
   */
  exportIndex(): string {
    const exportData = {
      entries: this._indexEntries(),
      stats: this._indexStats(),
      lastUpdate: this._lastIndexUpdate(),
      metadata: {
        version: '1.0',
        generator: 'Angular Knowledge Navigator',
        exportDate: new Date().toISOString()
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Private helper methods
   */
  private async createIndexEntry(codeExample: CodeExampleMeta): Promise<CodeIndexEntry | null> {
    try {
      const keywords = this.extractKeywords(codeExample);
      const searchableText = this.createSearchableText(codeExample);
      const weight = this.calculateWeight(codeExample);
      const conceptPath = await this.resolveConceptPath(codeExample);

      return {
        id: codeExample.id,
        title: codeExample.title || `${codeExample.language} Example`,
        description: this.generateDescription(codeExample),
        codeBlock: codeExample,
        keywords,
        searchableText,
        weight,
        conceptPath,
        lastModified: codeExample.lastUpdated || new Date()
      };
    } catch (error) {
      console.warn('Failed to create index entry for:', codeExample.id, error);
      return null;
    }
  }

  private extractKeywords(codeExample: CodeExampleMeta): string[] {
    const keywords = new Set<string>();
    
    // Add language
    keywords.add(codeExample.language);
    
    // Add categories
    if (codeExample.categories) {
      codeExample.categories.forEach(cat => keywords.add(cat));
    }
    
    // Add tags
    if (codeExample.tags) {
      codeExample.tags.forEach(tag => keywords.add(tag));
    }
    
    // Extract from code content
    const codeKeywords = this.extractCodeKeywords(codeExample.code);
    codeKeywords.forEach(keyword => keywords.add(keyword));
    
    return Array.from(keywords);
  }

  private extractCodeKeywords(code: string): string[] {
    const keywords: string[] = [];
    
    // Angular-specific patterns
    const angularPatterns = [
      /(@Component|@Injectable|@Directive|@Pipe)/g,
      /(signal|computed|effect)\s*\(/g,
      /(FormControl|FormGroup|Validators)/g,
      /(Observable|Subject|BehaviorSubject)/g,
      /(OnInit|OnDestroy|OnChanges)/g,
      /(HttpClient|Router|ActivatedRoute)/g
    ];
    
    for (const pattern of angularPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        keywords.push(...matches.map(match => match.replace(/[^a-zA-Z]/g, '')));
      }
    }
    
    return [...new Set(keywords)];
  }

  private createSearchableText(codeExample: CodeExampleMeta): string {
    const parts = [
      codeExample.title || '',
      codeExample.code,
      codeExample.categories?.join(' ') || '',
      codeExample.tags?.join(' ') || '',
      codeExample.language
    ];
    
    return parts.join(' ').toLowerCase();
  }

  private calculateWeight(codeExample: CodeExampleMeta): number {
    let weight = 1;
    
    // Difficulty bonus
    weight += (codeExample.difficulty || 1) * 0.2;
    
    // Popularity bonus
    weight += (codeExample.popularity || 0) * 0.3;
    
    // Recent update bonus
    if (codeExample.lastUpdated) {
      const daysSinceUpdate = (Date.now() - codeExample.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) {
        weight += 0.5;
      }
    }
    
    // Code length consideration
    const lines = codeExample.code.split('\n').length;
    weight += Math.min(lines / 50, 1) * 0.3;
    
    return Math.round(weight * 10) / 10;
  }

  private async resolveConceptPath(codeExample: CodeExampleMeta): Promise<string> {
    // Try to resolve the concept path from content service
    // This would typically involve looking up the content structure
    return codeExample.categories?.[0] || 'general';
  }

  private generateDescription(codeExample: CodeExampleMeta): string {
    const parts = [];
    
    if (codeExample.categories?.length) {
      parts.push(`${codeExample.categories[0]} example`);
    }
    
    if (codeExample.difficulty) {
      parts.push(`difficulty level ${codeExample.difficulty}`);
    }
    
    if (codeExample.tags?.length) {
      parts.push(`featuring ${codeExample.tags.slice(0, 3).join(', ')}`);
    }
    
    const lines = codeExample.code.split('\n').length;
    parts.push(`${lines} lines of ${codeExample.language}`);
    
    return parts.join(', ');
  }

  private scoreEntry(entry: CodeIndexEntry, query: string, queryTerms: string[]): IndexSearchResult {
    let score = 0;
    const matchReasons: string[] = [];
    
    // Title match (highest weight)
    if (entry.title.toLowerCase().includes(query)) {
      score += 10;
      matchReasons.push('Title match');
    }
    
    // Exact term matches in searchable text
    for (const term of queryTerms) {
      if (entry.searchableText.includes(term)) {
        score += 5;
        matchReasons.push(`Keyword: ${term}`);
      }
    }
    
    // Keyword matches
    const keywordMatches = entry.keywords.filter(keyword => 
      keyword.toLowerCase().includes(query) || 
      queryTerms.some(term => keyword.toLowerCase().includes(term))
    );
    score += keywordMatches.length * 3;
    if (keywordMatches.length > 0) {
      matchReasons.push(`Keywords: ${keywordMatches.join(', ')}`);
    }
    
    // Weight bonus
    score += entry.weight * 0.5;
    
    // Normalize score
    score = Math.min(score / 20, 1);
    
    return {
      entry,
      score: Math.round(score * 100) / 100,
      matchReasons
    };
  }

  private generateStats(entries: CodeIndexEntry[]): CodeIndexStats {
    const stats: CodeIndexStats = {
      totalExamples: entries.length,
      byLanguage: {},
      byCategory: {},
      byDifficulty: {},
      averageComplexity: 0,
      mostUsedPatterns: []
    };
    
    let totalComplexity = 0;
    
    for (const entry of entries) {
      // Language stats
      const lang = entry.codeBlock.language;
      stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
      
      // Category stats
      const categories = (entry.codeBlock as CodeExampleMeta).categories || [];
      for (const category of categories) {
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      }
      
      // Difficulty stats
      const difficulty = (entry.codeBlock as CodeExampleMeta).difficulty || 1;
      stats.byDifficulty[difficulty] = (stats.byDifficulty[difficulty] || 0) + 1;
      
      // Complexity calculation
      const complexity = this.calculateComplexity(entry.codeBlock);
      totalComplexity += complexity;
    }
    
    stats.averageComplexity = entries.length > 0 ? totalComplexity / entries.length : 0;
    stats.mostUsedPatterns = this.getPopularPatterns(10).map(p => ({ pattern: p.pattern, count: p.count }));
    
    return stats;
  }

  private extractPatterns(code: string): string[] {
    const patterns: string[] = [];
    
    // Common Angular patterns
    const angularPatterns = [
      { pattern: /@Component/, name: 'Component Decorator' },
      { pattern: /@Injectable/, name: 'Injectable Decorator' },
      { pattern: /signal\s*\(/, name: 'Signal Usage' },
      { pattern: /computed\s*\(/, name: 'Computed Signal' },
      { pattern: /\.pipe\s*\(/, name: 'RxJS Pipe' },
      { pattern: /FormControl/, name: 'Form Control' },
      { pattern: /OnPush/, name: 'OnPush Strategy' }
    ];
    
    for (const { pattern, name } of angularPatterns) {
      if (pattern.test(code)) {
        patterns.push(name);
      }
    }
    
    return patterns;
  }

  private calculateSimilarity(entry1: CodeIndexEntry, entry2: CodeIndexEntry): number {
    let similarity = 0;
    
    // Language similarity
    if (entry1.codeBlock.language === entry2.codeBlock.language) {
      similarity += 0.3;
    }
    
    // Category similarity
    const categories1 = (entry1.codeBlock as CodeExampleMeta).categories || [];
    const categories2 = (entry2.codeBlock as CodeExampleMeta).categories || [];
    const commonCategories = categories1.filter(cat => categories2.includes(cat));
    similarity += (commonCategories.length / Math.max(categories1.length, categories2.length, 1)) * 0.4;
    
    // Keyword similarity
    const commonKeywords = entry1.keywords.filter(keyword => entry2.keywords.includes(keyword));
    similarity += (commonKeywords.length / Math.max(entry1.keywords.length, entry2.keywords.length, 1)) * 0.3;
    
    return similarity;
  }

  private calculateComplexity(codeBlock: CodeBlock): number {
    const code = codeBlock.code;
    let complexity = 1;
    
    // Line count factor
    complexity += Math.min(code.split('\n').length / 10, 5);
    
    // Nesting level factor
    const nestingLevel = this.calculateNestingLevel(code);
    complexity += nestingLevel * 0.5;
    
    // Pattern complexity
    const complexPatterns = [
      /async|await/g,
      /Observable|Subject/g,
      /pipe\s*\(/g,
      /switchMap|mergeMap|concatMap/g
    ];
    
    for (const pattern of complexPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length * 0.3;
      }
    }
    
    return Math.round(complexity * 10) / 10;
  }

  private calculateNestingLevel(code: string): number {
    let maxLevel = 0;
    let currentLevel = 0;
    
    for (const char of code) {
      if (char === '{' || char === '(') {
        currentLevel++;
        maxLevel = Math.max(maxLevel, currentLevel);
      } else if (char === '}' || char === ')') {
        currentLevel--;
      }
    }
    
    return maxLevel;
  }

  private getComplexityLevel(complexity: number): string {
    if (complexity <= 2) return 'Simple';
    if (complexity <= 4) return 'Medium';
    if (complexity <= 6) return 'Complex';
    return 'Advanced';
  }

  private generateComplexityRecommendations(distribution: Record<string, number>): string[] {
    const recommendations: string[] = [];
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    
    const simplePercentage = (distribution['Simple'] || 0) / total * 100;
    const advancedPercentage = (distribution['Advanced'] || 0) / total * 100;
    
    if (simplePercentage < 30) {
      recommendations.push('Consider adding more simple examples for beginners');
    }
    
    if (advancedPercentage > 40) {
      recommendations.push('High number of advanced examples - ensure adequate documentation');
    }
    
    return recommendations;
  }

  private analyzeTrends(entries: CodeIndexEntry[]): string[] {
    const trends: string[] = [];
    
    // Analyze recent patterns
    const recentEntries = entries.filter(entry =>
      entry.lastModified && 
      (Date.now() - entry.lastModified.getTime()) < (30 * 24 * 60 * 60 * 1000)
    );
    
    if (recentEntries.length > entries.length * 0.3) {
      trends.push('High recent activity in code examples');
    }
    
    // Signal usage trend
    const signalUsage = entries.filter(entry => 
      entry.keywords.includes('signal') || entry.keywords.includes('computed')
    ).length;
    
    if (signalUsage > entries.length * 0.4) {
      trends.push('Strong adoption of Angular Signals pattern');
    }
    
    return trends;
  }
}