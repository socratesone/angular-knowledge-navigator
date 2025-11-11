import { Directive, ElementRef, Input, OnChanges, SimpleChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true
})
export class HighlightDirective implements OnChanges {
  @Input('appHighlight') searchTerms: string | string[] = '';
  @Input() highlightClass: string = 'search-highlight';
  @Input() caseSensitive: boolean = false;
  @Input() wholeWord: boolean = false;

  private originalText: string = '';

  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2
  ) {
    // Store original text on initialization
    this.originalText = this.elementRef.nativeElement.textContent || '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchTerms'] || changes['highlightClass'] || changes['caseSensitive'] || changes['wholeWord']) {
      this.applyHighlight();
    }
  }

  /**
   * Apply highlighting to the element's text content
   */
  private applyHighlight(): void {
    const element = this.elementRef.nativeElement;
    
    // Reset to original text
    if (!this.originalText) {
      this.originalText = element.textContent || '';
    }
    
    // Clear previous highlights
    this.clearHighlight();
    
    // If no search terms, just restore original text
    if (!this.searchTerms || (Array.isArray(this.searchTerms) && this.searchTerms.length === 0)) {
      element.textContent = this.originalText;
      return;
    }

    // Normalize search terms to array
    const terms = Array.isArray(this.searchTerms) ? this.searchTerms : [this.searchTerms];
    const validTerms = terms.filter(term => term && term.trim().length > 0);
    
    if (validTerms.length === 0) {
      element.textContent = this.originalText;
      return;
    }

    // Apply highlighting
    const highlightedHTML = this.createHighlightedHTML(this.originalText, validTerms);
    element.innerHTML = highlightedHTML;
  }

  /**
   * Create HTML with highlighted search terms
   */
  private createHighlightedHTML(text: string, searchTerms: string[]): string {
    if (!text || searchTerms.length === 0) {
      return this.escapeHtml(text);
    }

    // Sort terms by length (longest first) to avoid partial replacements
    const sortedTerms = [...searchTerms].sort((a, b) => b.length - a.length);
    
    // Create regex pattern for all terms
    const flags = this.caseSensitive ? 'g' : 'gi';
    const patterns = sortedTerms.map(term => {
      const escaped = this.escapeRegExp(term);
      return this.wholeWord ? `\\b${escaped}\\b` : escaped;
    });
    
    const combinedPattern = `(${patterns.join('|')})`;
    const regex = new RegExp(combinedPattern, flags);
    
    // Split text by matches and highlight
    const parts = text.split(regex);
    let result = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (this.shouldHighlight(part, sortedTerms)) {
        result += `<span class="${this.highlightClass}">${this.escapeHtml(part)}</span>`;
      } else {
        result += this.escapeHtml(part);
      }
    }
    
    return result;
  }

  /**
   * Check if a text part should be highlighted
   */
  private shouldHighlight(text: string, searchTerms: string[]): boolean {
    if (!text) return false;
    
    return searchTerms.some(term => {
      const compareText = this.caseSensitive ? text : text.toLowerCase();
      const compareTerm = this.caseSensitive ? term : term.toLowerCase();
      
      if (this.wholeWord) {
        const wordRegex = new RegExp(`\\b${this.escapeRegExp(compareTerm)}\\b`, this.caseSensitive ? '' : 'i');
        return wordRegex.test(compareText);
      } else {
        return compareText.includes(compareTerm);
      }
    });
  }

  /**
   * Clear any existing highlights
   */
  private clearHighlight(): void {
    const element = this.elementRef.nativeElement;
    const highlightedElements = element.querySelectorAll(`.${this.highlightClass}`);
    
    highlightedElements.forEach((highlightEl: Element) => {
      const parent = highlightEl.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlightEl.textContent || ''), highlightEl);
      }
    });
    
    // Normalize text nodes
    element.normalize();
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escape RegExp special characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Public method to update search terms
   */
  updateSearchTerms(terms: string | string[]): void {
    this.searchTerms = terms;
    this.applyHighlight();
  }

  /**
   * Public method to clear highlights
   */
  clearHighlights(): void {
    this.searchTerms = '';
    this.applyHighlight();
  }
}