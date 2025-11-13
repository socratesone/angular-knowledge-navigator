import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';

import { 
  ConceptVocabulary, 
  VocabularyCategory, 
  VocabularyReference,
  SkillLevel 
} from '../../shared/models/vocabulary.model';

@Injectable({
  providedIn: 'root'
})
export class VocabularyService {
  private vocabulary = signal<ConceptVocabulary[]>([]);
  private conceptMap = new Map<string, ConceptVocabulary>();
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private vocabulary$ = this.http.get<ConceptVocabulary[]>('assets/data/vocabulary.json').pipe(
    shareReplay(1)
  );

  // Computed signals
  readonly isLoaded = computed(() => this.vocabulary().length > 0);
  readonly conceptCount = computed(() => this.vocabulary().length);
  readonly categories = computed(() => {
    const cats = new Set(this.vocabulary().map(v => v.category));
    return Array.from(cats);
  });

  constructor(private http: HttpClient) {}

  /**
   * Load vocabulary data from assets
   * @returns Observable of vocabulary entries
   */
  loadVocabulary(): Observable<ConceptVocabulary[]> {
    if (this.isLoaded()) {
      return of(this.vocabulary());
    }

    this.loadingSubject.next(true);
    
    return this.vocabulary$.pipe(
      tap(concepts => {
        this.vocabulary.set(concepts);
        this.buildConceptMap(concepts);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Failed to load vocabulary:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  /**
   * Get concept definition by term
   * @param term The concept term to look up
   * @returns Concept definition or null if not found
   */
  getConcept(term: string): ConceptVocabulary | null {
    return this.conceptMap.get(term.toLowerCase()) || null;
  }

  /**
   * Get concept definition by ID
   * @param id The concept ID to look up
   * @returns Concept definition or null if not found
   */
  getConceptById(id: string): ConceptVocabulary | null {
    return this.vocabulary().find(concept => concept.id === id) || null;
  }

  /**
   * Search concepts by keyword
   * @param keyword Search term
   * @param category Optional category filter
   * @returns Array of matching concepts
   */
  searchConcepts(keyword: string, category?: VocabularyCategory): ConceptVocabulary[] {
    const searchTerm = keyword.toLowerCase();
    const concepts = category 
      ? this.vocabulary().filter(v => v.category === category)
      : this.vocabulary();

    return concepts.filter(concept => 
      concept.term.toLowerCase().includes(searchTerm) ||
      concept.definition.toLowerCase().includes(searchTerm) ||
      concept.keywords.some(k => k.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get all concepts in a category
   * @param category The vocabulary category
   * @returns Array of concepts in category
   */
  getConceptsByCategory(category: VocabularyCategory): ConceptVocabulary[] {
    return this.vocabulary().filter(concept => concept.category === category);
  }

  /**
   * Detect vocabulary terms in text content
   * @param content Text content to analyze
   * @param minConfidence Minimum confidence threshold (default: 0.7)
   * @returns Array of detected vocabulary references
   */
  detectVocabularyTerms(content: string, minConfidence: number = 0.7): VocabularyReference[] {
    const references: VocabularyReference[] = [];
    const contentLower = content.toLowerCase();

    this.vocabulary().forEach(concept => {
      concept.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
        let match;

        while ((match = regex.exec(contentLower)) !== null) {
          const confidence = this.calculateConfidence(keyword, match[0], content);
          
          if (confidence >= minConfidence) {
            references.push({
              term: keyword,
              conceptId: concept.id,
              position: {
                line: this.getLineNumber(content, match.index),
                column: this.getColumnNumber(content, match.index),
                offset: match.index,
                length: match[0].length
              },
              context: this.getContext(content, match.index, 50),
              confidence
            });
          }
        }
      });
    });

    return references.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get related concepts for a given concept
   * @param conceptId The base concept ID
   * @param maxResults Maximum number of results (default: 5)
   * @returns Array of related concepts
   */
  getRelatedConcepts(conceptId: string, maxResults: number = 5): ConceptVocabulary[] {
    const baseConcept = this.getConceptById(conceptId);
    if (!baseConcept) return [];

    const related = this.vocabulary()
      .filter(concept => 
        concept.id !== conceptId &&
        (concept.category === baseConcept.category ||
         concept.relatedArticles.some(article => 
           baseConcept.relatedArticles.includes(article)
         ))
      )
      .slice(0, maxResults);

    return related;
  }

  /**
   * Get vocabulary loading status
   * @returns Observable of loading state
   */
  getLoadingStatus(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  /**
   * Build internal concept map for fast lookups
   * @param concepts Array of vocabulary concepts
   */
  private buildConceptMap(concepts: ConceptVocabulary[]): void {
    this.conceptMap.clear();
    
    concepts.forEach(concept => {
      // Map by term
      this.conceptMap.set(concept.term.toLowerCase(), concept);
      
      // Map by keywords
      concept.keywords.forEach(keyword => {
        this.conceptMap.set(keyword.toLowerCase(), concept);
      });
    });
  }

  /**
   * Calculate confidence score for term detection
   * @param originalTerm Original vocabulary term
   * @param matchedTerm Matched text
   * @param context Surrounding context
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(originalTerm: string, matchedTerm: string, context: string): number {
    let confidence = 0.8; // Base confidence

    // Exact match bonus
    if (originalTerm.toLowerCase() === matchedTerm.toLowerCase()) {
      confidence += 0.1;
    }

    // Context bonus (check if surrounded by code-like syntax)
    const surroundingContext = this.getContext(context, context.indexOf(matchedTerm), 20);
    if (surroundingContext.includes('@') || surroundingContext.includes('()') || 
        surroundingContext.includes('{}') || surroundingContext.includes('[]')) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get line number for character offset
   * @param content Full content
   * @param offset Character offset
   * @returns Line number (1-based)
   */
  private getLineNumber(content: string, offset: number): number {
    return content.substring(0, offset).split('\n').length;
  }

  /**
   * Get column number for character offset
   * @param content Full content
   * @param offset Character offset
   * @returns Column number (0-based)
   */
  private getColumnNumber(content: string, offset: number): number {
    const beforeOffset = content.substring(0, offset);
    const lastNewline = beforeOffset.lastIndexOf('\n');
    return lastNewline === -1 ? offset : offset - lastNewline - 1;
  }

  /**
   * Get surrounding context for a position
   * @param content Full content
   * @param offset Character offset
   * @param contextLength Characters before and after
   * @returns Context string
   */
  private getContext(content: string, offset: number, contextLength: number): string {
    const start = Math.max(0, offset - contextLength);
    const end = Math.min(content.length, offset + contextLength);
    return content.substring(start, end);
  }
}