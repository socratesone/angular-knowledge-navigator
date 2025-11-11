import { Directive, ElementRef, Input, OnChanges, SimpleChanges, Renderer2, OnDestroy } from '@angular/core';
import { SearchMatchType } from '../models/search-filter.interface';

export interface HighlightMatch {
  term: string;
  matchType: SearchMatchType;
  className?: string;
}

@Directive({
  selector: '[appAdvancedHighlight]',
  standalone: true
})
export class AdvancedHighlightDirective implements OnChanges, OnDestroy {
  @Input('appAdvancedHighlight') searchTerm: string = '';
  @Input() highlightMatches: HighlightMatch[] = [];
  @Input() baseHighlightClass: string = 'search-highlight';
  @Input() exactMatchClass: string = 'exact-match';
  @Input() partialMatchClass: string = 'partial-match';
  @Input() fuzzyMatchClass: string = 'fuzzy-match';
  @Input() caseSensitive: boolean = false;
  @Input() maxHighlights: number = 50; // Prevent performance issues

  private originalHTML: string = '';
  private observer?: MutationObserver;

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {
    this.originalHTML = this.elementRef.nativeElement.innerHTML;
    this.setupMutationObserver();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchTerm'] || changes['highlightMatches']) {
      this.applyAdvancedHighlight();
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /**
   * Setup mutation observer to watch for content changes
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldReapply = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          // Only reapply if changes weren't made by this directive
          if (!this.isHighlightChange(mutation)) {
            shouldReapply = true;
          }
        }
      });
      
      if (shouldReapply) {
        this.originalHTML = this.getTextContent();
        this.applyAdvancedHighlight();
      }
    });

    this.observer.observe(this.elementRef.nativeElement, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  /**
   * Check if mutation was caused by highlighting
   */
  private isHighlightChange(mutation: MutationRecord): boolean {
    if (mutation.addedNodes.length > 0) {
      return Array.from(mutation.addedNodes).some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          return element.classList.contains(this.baseHighlightClass) ||
                 element.classList.contains(this.exactMatchClass) ||
                 element.classList.contains(this.partialMatchClass) ||
                 element.classList.contains(this.fuzzyMatchClass);
        }
        return false;
      });
    }
    return false;
  }

  /**
   * Apply advanced highlighting based on match types
   */
  private applyAdvancedHighlight(): void {
    const element = this.elementRef.nativeElement;
    
    // Clear previous highlights
    this.clearAllHighlights();
    
    // If no search term and no specific matches, restore original
    if (!this.searchTerm && this.highlightMatches.length === 0) {
      return;
    }

    let textContent = this.getTextContent();
    
    // Create matches from search term if provided
    const allMatches: HighlightMatch[] = [...this.highlightMatches];
    
    if (this.searchTerm) {
      allMatches.push({
        term: this.searchTerm,
        matchType: this.determineMatchType(textContent, this.searchTerm)
      });
    }

    // Apply highlights for each match type
    const highlightedHTML = this.createAdvancedHighlightedHTML(textContent, allMatches);
    element.innerHTML = highlightedHTML;
  }

  /**
   * Create HTML with advanced highlighting
   */
  private createAdvancedHighlightedHTML(text: string, matches: HighlightMatch[]): string {
    if (!text || matches.length === 0) {
      return this.escapeHtml(text);
    }

    // Sort matches by term length (longest first) and priority
    const sortedMatches = [...matches].sort((a, b) => {
      // Prioritize exact matches
      if (a.matchType === SearchMatchType.Exact && b.matchType !== SearchMatchType.Exact) return -1;
      if (b.matchType === SearchMatchType.Exact && a.matchType !== SearchMatchType.Exact) return 1;
      
      // Then by length
      return b.term.length - a.term.length;
    });

    // Limit matches to prevent performance issues
    const limitedMatches = sortedMatches.slice(0, this.maxHighlights);
    
    // Create replacement map
    const replacements: Array<{
      start: number;
      end: number;
      replacement: string;
      priority: number;
    }> = [];

    limitedMatches.forEach((match, index) => {
      const positions = this.findAllPositions(text, match.term);
      const className = this.getHighlightClassName(match);
      
      positions.forEach(pos => {
        replacements.push({
          start: pos.start,
          end: pos.end,
          replacement: `<span class="${className}" data-match-type="${match.matchType}">${this.escapeHtml(pos.text)}</span>`,
          priority: this.getMatchPriority(match.matchType)
        });
      });
    });

    // Sort by position and priority, resolve conflicts
    const resolvedReplacements = this.resolveConflicts(replacements);
    
    // Apply replacements from end to start
    let result = text;
    resolvedReplacements
      .sort((a, b) => b.start - a.start)
      .forEach(replacement => {
        result = result.substring(0, replacement.start) + 
                replacement.replacement + 
                result.substring(replacement.end);
      });

    return result;
  }

  /**
   * Find all positions of a term in text
   */
  private findAllPositions(text: string, term: string): Array<{start: number, end: number, text: string}> {
    const positions: Array<{start: number, end: number, text: string}> = [];
    const searchText = this.caseSensitive ? text : text.toLowerCase();
    const searchTerm = this.caseSensitive ? term : term.toLowerCase();
    
    let startIndex = 0;
    while (startIndex < text.length) {
      const index = searchText.indexOf(searchTerm, startIndex);
      if (index === -1) break;
      
      positions.push({
        start: index,
        end: index + term.length,
        text: text.substring(index, index + term.length)
      });
      
      startIndex = index + 1;
    }
    
    return positions;
  }

  /**
   * Resolve overlapping replacements
   */
  private resolveConflicts(replacements: Array<{start: number, end: number, replacement: string, priority: number}>): Array<{start: number, end: number, replacement: string}> {
    if (replacements.length === 0) return [];
    
    // Sort by start position
    const sorted = replacements.sort((a, b) => a.start - b.start);
    const resolved: Array<{start: number, end: number, replacement: string}> = [];
    
    let lastEnd = -1;
    
    sorted.forEach(replacement => {
      // If no overlap, add it
      if (replacement.start >= lastEnd) {
        resolved.push(replacement);
        lastEnd = replacement.end;
      } else {
        // Handle overlap - prioritize higher priority matches
        const lastReplacement = resolved[resolved.length - 1];
        if (replacement.priority > (lastReplacement as any).priority) {
          // Replace the last one with higher priority match
          resolved[resolved.length - 1] = replacement;
          lastEnd = replacement.end;
        }
        // Otherwise, skip this overlapping match
      }
    });
    
    return resolved;
  }

  /**
   * Get CSS class name for highlight based on match type
   */
  private getHighlightClassName(match: HighlightMatch): string {
    if (match.className) {
      return `${this.baseHighlightClass} ${match.className}`;
    }
    
    switch (match.matchType) {
      case SearchMatchType.Exact:
        return `${this.baseHighlightClass} ${this.exactMatchClass}`;
      case SearchMatchType.Partial:
        return `${this.baseHighlightClass} ${this.partialMatchClass}`;
      case SearchMatchType.Fuzzy:
        return `${this.baseHighlightClass} ${this.fuzzyMatchClass}`;
      default:
        return this.baseHighlightClass;
    }
  }

  /**
   * Get priority for match type (higher = more important)
   */
  private getMatchPriority(matchType: SearchMatchType): number {
    switch (matchType) {
      case SearchMatchType.Exact: return 4;
      case SearchMatchType.Partial: return 3;
      case SearchMatchType.Fuzzy: return 2;
      case SearchMatchType.Semantic: return 1;
      default: return 0;
    }
  }

  /**
   * Determine match type for a term
   */
  private determineMatchType(text: string, term: string): SearchMatchType {
    const searchText = this.caseSensitive ? text : text.toLowerCase();
    const searchTerm = this.caseSensitive ? term : term.toLowerCase();
    
    if (searchText === searchTerm) {
      return SearchMatchType.Exact;
    } else if (searchText.includes(searchTerm)) {
      if (searchText.startsWith(searchTerm) || searchText.endsWith(searchTerm)) {
        return SearchMatchType.Partial;
      } else {
        return SearchMatchType.Partial;
      }
    } else {
      return SearchMatchType.Fuzzy;
    }
  }

  /**
   * Clear all highlights
   */
  private clearAllHighlights(): void {
    const element = this.elementRef.nativeElement;
    const highlightClasses = [
      this.baseHighlightClass,
      this.exactMatchClass,
      this.partialMatchClass,
      this.fuzzyMatchClass
    ];
    
    highlightClasses.forEach(className => {
      const elements = element.querySelectorAll(`.${className}`);
      elements.forEach((el: Element) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        }
      });
    });
    
    element.normalize();
  }

  /**
   * Get text content from element
   */
  private getTextContent(): string {
    return this.elementRef.nativeElement.textContent || '';
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Public method to update highlights
   */
  updateHighlights(term: string, matches: HighlightMatch[] = []): void {
    this.searchTerm = term;
    this.highlightMatches = matches;
    this.applyAdvancedHighlight();
  }

  /**
   * Public method to clear all highlights
   */
  clearHighlights(): void {
    this.searchTerm = '';
    this.highlightMatches = [];
    this.clearAllHighlights();
  }
}