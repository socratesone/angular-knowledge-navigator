import { Injectable, signal, computed, inject } from '@angular/core';
import { CodeBlock } from './markdown-processor.service';
import { CodeCategoryService, CodeExampleMeta } from './code-category.service';

export interface CodeSearchResult {
  codeBlock: CodeBlock;
  matches: CodeMatch[];
  relevanceScore: number;
  contextPreview: string;
}

export interface CodeMatch {
  line: number;
  column: number;
  length: number;
  text: string;
  context: string;
  type: 'exact' | 'pattern' | 'semantic';
}

export interface CodeSearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includeComments: boolean;
  languages: string[];
  categories: string[];
  tags: string[];
}

export interface CodePattern {
  name: string;
  description: string;
  pattern: string | RegExp;
  examples: string[];
  category: string;
  difficulty: number;
}

@Injectable({
  providedIn: 'root'
})
export class CodeSearchService {
  private categoryService = inject(CodeCategoryService);

  // Search state
  private readonly _searchQuery = signal<string>('');
  private readonly _searchOptions = signal<CodeSearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    includeComments: true,
    languages: [],
    categories: [],
    tags: []
  });
  private readonly _searchResults = signal<CodeSearchResult[]>([]);
  private readonly _isSearching = signal<boolean>(false);

  // Predefined code patterns for Angular development
  private readonly angularPatterns: CodePattern[] = [
    {
      name: 'Component Declaration',
      description: 'Find Angular component decorators',
      pattern: /@Component\s*\(\s*\{[\s\S]*?\}\s*\)/g,
      examples: ['@Component({...})', '@Component({ selector: "app-*" })'],
      category: 'components',
      difficulty: 1
    },
    {
      name: 'Injectable Service',
      description: 'Find Angular service declarations',
      pattern: /@Injectable\s*\(\s*\{[\s\S]*?\}\s*\)/g,
      examples: ['@Injectable({ providedIn: "root" })'],
      category: 'services',
      difficulty: 1
    },
    {
      name: 'Signal Usage',
      description: 'Find Angular signals implementation',
      pattern: /signal\s*\(\s*[^)]*\s*\)|computed\s*\(\s*[^)]*\s*\)/g,
      examples: ['signal(initialValue)', 'computed(() => ...)'],
      category: 'constitutional',
      difficulty: 2
    },
    {
      name: 'RxJS Operators',
      description: 'Find RxJS operator usage',
      pattern: /\.(pipe|map|filter|switchMap|mergeMap|concatMap|catchError|tap|takeUntil|startWith|combineLatest)\s*\(/g,
      examples: ['.pipe(map(...))', '.switchMap(...)'],
      category: 'services',
      difficulty: 3
    },
    {
      name: 'Form Controls',
      description: 'Find reactive form implementations',
      pattern: /FormControl|FormGroup|FormBuilder|Validators\./g,
      examples: ['new FormControl()', 'Validators.required'],
      category: 'forms',
      difficulty: 2
    },
    {
      name: 'Route Configuration',
      description: 'Find routing configurations',
      pattern: /Routes\s*=|RouterModule\.(forRoot|forChild)|loadChildren\s*:/g,
      examples: ['Routes = [...]', 'loadChildren: () => ...'],
      category: 'routing',
      difficulty: 2
    },
    {
      name: 'OnPush Strategy',
      description: 'Find OnPush change detection usage',
      pattern: /ChangeDetectionStrategy\.OnPush/g,
      examples: ['ChangeDetectionStrategy.OnPush'],
      category: 'performance',
      difficulty: 3
    },
    {
      name: 'Dependency Injection',
      description: 'Find dependency injection patterns',
      pattern: /inject\s*\(\s*\w+\s*\)|constructor\s*\([^)]*\)/g,
      examples: ['inject(ServiceName)', 'constructor(private service: ...)'],
      category: 'services',
      difficulty: 2
    }
  ];

  // Computed properties
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly searchOptions = this._searchOptions.asReadonly();
  readonly searchResults = this._searchResults.asReadonly();
  readonly isSearching = this._isSearching.asReadonly();

  readonly hasResults = computed(() => this._searchResults().length > 0);
  readonly resultCount = computed(() => this._searchResults().length);
  readonly totalMatches = computed(() => 
    this._searchResults().reduce((total, result) => total + result.matches.length, 0)
  );

  /**
   * Search for code patterns across all code blocks
   */
  async searchCode(query: string, options: Partial<CodeSearchOptions> = {}): Promise<CodeSearchResult[]> {
    if (!query.trim()) {
      this._searchResults.set([]);
      return [];
    }

    this._isSearching.set(true);
    this._searchQuery.set(query);
    this._searchOptions.update(current => ({ ...current, ...options }));

    try {
      const codeBlocks = this.getFilteredCodeBlocks();
      const results: CodeSearchResult[] = [];

      for (const codeBlock of codeBlocks) {
        const matches = this.findMatches(codeBlock, query, this._searchOptions());
        
        if (matches.length > 0) {
          const relevanceScore = this.calculateRelevanceScore(codeBlock, matches, query);
          const contextPreview = this.generateContextPreview(codeBlock, matches);
          
          results.push({
            codeBlock,
            matches,
            relevanceScore,
            contextPreview
          });
        }
      }

      // Sort by relevance score (highest first)
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      this._searchResults.set(results);
      return results;
    } finally {
      this._isSearching.set(false);
    }
  }

  /**
   * Search for predefined Angular patterns
   */
  searchPatterns(patternName?: string): CodeSearchResult[] {
    const patterns = patternName 
      ? this.angularPatterns.filter(p => p.name === patternName)
      : this.angularPatterns;

    const results: CodeSearchResult[] = [];
    const codeBlocks = this.getFilteredCodeBlocks();

    for (const pattern of patterns) {
      for (const codeBlock of codeBlocks) {
        const matches = this.findPatternMatches(codeBlock, pattern);
        
        if (matches.length > 0) {
          const relevanceScore = this.calculatePatternRelevanceScore(codeBlock, pattern, matches);
          const contextPreview = this.generatePatternPreview(codeBlock, pattern, matches);
          
          results.push({
            codeBlock,
            matches,
            relevanceScore,
            contextPreview
          });
        }
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get available Angular patterns
   */
  getAvailablePatterns(): CodePattern[] {
    return this.angularPatterns;
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(categoryId: string): CodePattern[] {
    return this.angularPatterns.filter(pattern => pattern.category === categoryId);
  }

  /**
   * Clear search results
   */
  clearSearch(): void {
    this._searchQuery.set('');
    this._searchResults.set([]);
  }

  /**
   * Update search options
   */
  updateSearchOptions(options: Partial<CodeSearchOptions>): void {
    this._searchOptions.update(current => ({ ...current, ...options }));
  }

  /**
   * Highlight matches in code text
   */
  highlightMatches(code: string, matches: CodeMatch[]): string {
    if (matches.length === 0) return code;

    const lines = code.split('\n');
    const highlightedLines = [...lines];

    // Sort matches by line and column to process from end to start
    const sortedMatches = [...matches].sort((a, b) => {
      if (a.line === b.line) return b.column - a.column;
      return b.line - a.line;
    });

    for (const match of sortedMatches) {
      const lineIndex = match.line - 1;
      if (lineIndex >= 0 && lineIndex < highlightedLines.length) {
        const line = highlightedLines[lineIndex];
        const before = line.substring(0, match.column);
        const matchText = line.substring(match.column, match.column + match.length);
        const after = line.substring(match.column + match.length);
        
        highlightedLines[lineIndex] = 
          `${before}<mark class="code-search-highlight">${matchText}</mark>${after}`;
      }
    }

    return highlightedLines.join('\n');
  }

  /**
   * Private helper methods
   */
  private getFilteredCodeBlocks(): CodeBlock[] {
    // Get code blocks from category service
    const allExamples = this.categoryService.codeExamples();
    const options = this._searchOptions();

    return allExamples.filter(example => {
      // Language filter
      if (options.languages.length > 0 && !options.languages.includes(example.language)) {
        return false;
      }

      // Category filter
      if (options.categories.length > 0) {
        const hasMatchingCategory = options.categories.some(categoryId =>
          (example as CodeExampleMeta).categories?.includes(categoryId)
        );
        if (!hasMatchingCategory) return false;
      }

      // Tag filter
      if (options.tags.length > 0) {
        const hasMatchingTag = options.tags.some(tagId =>
          example.tags?.includes(tagId)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }

  private findMatches(codeBlock: CodeBlock, query: string, options: CodeSearchOptions): CodeMatch[] {
    const matches: CodeMatch[] = [];
    const lines = codeBlock.code.split('\n');
    
    let searchPattern: RegExp;
    
    try {
      if (options.useRegex) {
        const flags = options.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(query, flags);
      } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = options.wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
        const flags = options.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(pattern, flags);
      }
    } catch (error) {
      // Invalid regex, fall back to literal search
      const flags = options.caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    }

    lines.forEach((line, lineIndex) => {
      // Skip comments if not included
      if (!options.includeComments && this.isCommentLine(line, codeBlock.language)) {
        return;
      }

      let match;
      while ((match = searchPattern.exec(line)) !== null) {
        const context = this.getLineContext(lines, lineIndex, 2);
        
        matches.push({
          line: lineIndex + 1,
          column: match.index,
          length: match[0].length,
          text: match[0],
          context,
          type: 'exact'
        });

        // Prevent infinite loop with zero-length matches
        if (match[0].length === 0) {
          searchPattern.lastIndex++;
        }
      }
    });

    return matches;
  }

  private findPatternMatches(codeBlock: CodeBlock, pattern: CodePattern): CodeMatch[] {
    const matches: CodeMatch[] = [];
    const lines = codeBlock.code.split('\n');
    const code = codeBlock.code;

    let searchPattern: RegExp;
    
    if (pattern.pattern instanceof RegExp) {
      searchPattern = new RegExp(pattern.pattern.source, 'g');
    } else {
      searchPattern = new RegExp(pattern.pattern, 'g');
    }

    let match;
    while ((match = searchPattern.exec(code)) !== null) {
      const position = this.getLineColumnFromIndex(code, match.index);
      const context = this.getLineContext(lines, position.line - 1, 2);
      
      matches.push({
        line: position.line,
        column: position.column,
        length: match[0].length,
        text: match[0],
        context,
        type: 'pattern'
      });

      // Prevent infinite loop
      if (match[0].length === 0) {
        searchPattern.lastIndex++;
      }
    }

    return matches;
  }

  private calculateRelevanceScore(codeBlock: CodeBlock, matches: CodeMatch[], query: string): number {
    let score = 0;

    // Base score for number of matches
    score += matches.length * 10;

    // Bonus for matches in title or filename
    if (codeBlock.title?.toLowerCase().includes(query.toLowerCase())) {
      score += 50;
    }
    if (codeBlock.fileName?.toLowerCase().includes(query.toLowerCase())) {
      score += 30;
    }

    // Bonus for exact matches
    const exactMatches = matches.filter(m => m.type === 'exact').length;
    score += exactMatches * 5;

    // Bonus for matches in important code sections (function names, class names)
    const importantMatches = matches.filter(m => 
      m.context.includes('function ') || 
      m.context.includes('class ') ||
      m.context.includes('interface ')
    ).length;
    score += importantMatches * 15;

    return score;
  }

  private calculatePatternRelevanceScore(codeBlock: CodeBlock, pattern: CodePattern, matches: CodeMatch[]): number {
    let score = matches.length * 20;

    // Bonus for difficulty match
    if (codeBlock.difficulty === pattern.difficulty) {
      score += 10;
    }

    // Category match bonus
    if ((codeBlock as CodeExampleMeta).categories?.includes(pattern.category)) {
      score += 25;
    }

    return score;
  }

  private generateContextPreview(codeBlock: CodeBlock, matches: CodeMatch[]): string {
    if (matches.length === 0) return '';

    const firstMatch = matches[0];
    const lines = codeBlock.code.split('\n');
    const startLine = Math.max(0, firstMatch.line - 2);
    const endLine = Math.min(lines.length, firstMatch.line + 1);
    
    return lines.slice(startLine, endLine).join('\n');
  }

  private generatePatternPreview(codeBlock: CodeBlock, pattern: CodePattern, matches: CodeMatch[]): string {
    const preview = this.generateContextPreview(codeBlock, matches);
    return `Pattern: ${pattern.name}\n${preview}`;
  }

  private isCommentLine(line: string, language: string): boolean {
    const trimmed = line.trim();
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        return trimmed.startsWith('//') || 
               trimmed.startsWith('/*') || 
               trimmed.startsWith('*');
      case 'html':
        return trimmed.startsWith('<!--');
      case 'css':
      case 'scss':
        return trimmed.startsWith('/*') || 
               trimmed.startsWith('*') ||
               trimmed.startsWith('//');
      default:
        return false;
    }
  }

  private getLineContext(lines: string[], lineIndex: number, contextLines: number): string {
    const start = Math.max(0, lineIndex - contextLines);
    const end = Math.min(lines.length, lineIndex + contextLines + 1);
    return lines.slice(start, end).join('\n');
  }

  private getLineColumnFromIndex(text: string, index: number): { line: number, column: number } {
    const beforeIndex = text.substring(0, index);
    const lines = beforeIndex.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length
    };
  }
}