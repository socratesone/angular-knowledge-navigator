import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  Renderer2,
  NgZone,
  signal,
  computed,
  effect
} from '@angular/core';
import { fromEvent, Subject, merge, of } from 'rxjs';
import { debounceTime, takeUntil, switchMap, delay } from 'rxjs/operators';
import { VocabularyService } from '../../core/services/vocabulary.service';
import { TooltipService } from '../../core/services/tooltip.service';
import { ConceptVocabulary } from '../models/vocabulary.model';
import { TooltipPlacement } from '../models/tooltip.model';

export interface CodeTooltipConfig {
  enabled?: boolean;
  hoverDelay?: number;
  hideDelay?: number;
  concepts?: string[];
  autoDetect?: boolean;
  interactive?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
}

@Directive({
  selector: '[appCodeTooltip]',
  standalone: true
})
export class CodeTooltipDirective implements OnInit, OnDestroy {
  @Input() codeTooltipConfig = signal<CodeTooltipConfig>({
    enabled: true,
    hoverDelay: 300,
    hideDelay: 100,
    autoDetect: true,
    interactive: false,
    position: 'top',
    maxWidth: 300
  });

  @Input() codeLanguage = signal<string>('typescript');
  @Input() conceptOverrides = signal<string[]>([]);

  private readonly destroy$ = new Subject<void>();
  private detectedConcepts = signal<Map<string, ConceptVocabulary>>(new Map());
  private annotatedElements = signal<HTMLElement[]>([]);
  private currentTooltipElement: HTMLElement | null = null;

  // Computed properties
  private isEnabled = computed(() => this.codeTooltipConfig().enabled !== false);
  private shouldAutoDetect = computed(() => this.codeTooltipConfig().autoDetect !== false);

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private ngZone: NgZone,
    private vocabularyService: VocabularyService,
    private tooltipService: TooltipService
  ) {
    // React to configuration changes
    effect(() => {
      if (this.isEnabled()) {
        this.initializeTooltips();
      } else {
        this.cleanupTooltips();
      }
    });
  }

  ngOnInit(): void {
    // Initialize vocabulary loading
    this.vocabularyService.loadVocabulary().pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (this.isEnabled()) {
        this.initializeTooltips();
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanupTooltips();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize tooltip functionality
   */
  private initializeTooltips(): void {
    const element = this.elementRef.nativeElement;
    
    if (!element || !this.vocabularyService.isLoaded()) {
      return;
    }

    // Clear any existing annotations
    this.cleanupTooltips();

    // Detect and annotate concepts
    if (this.shouldAutoDetect()) {
      this.detectAndAnnotateConcepts();
    } else {
      this.annotateSpecificConcepts();
    }

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Detect programming concepts in code content and annotate them
   */
  private detectAndAnnotateConcepts(): void {
    const element = this.elementRef.nativeElement;
    const codeText = element.textContent || '';
    const language = this.codeLanguage();
    
    // Get vocabulary concepts that might appear in this code
    const vocabularyConcepts = this.vocabularyService.searchConcepts('', undefined);
    const detectedMap = new Map<string, ConceptVocabulary>();
    
    // Find concepts in the code text
    vocabularyConcepts.forEach(concept => {
      const conceptTerms = [concept.term, ...(concept.keywords || [])];
      
      conceptTerms.forEach(term => {
        // Create regex for whole word matching (programming context)
        const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
        
        if (regex.test(codeText)) {
          detectedMap.set(term.toLowerCase(), concept);
        }
      });
    });

    this.detectedConcepts.set(detectedMap);
    this.annotateConceptsInDOM();
  }

  /**
   * Annotate specific concepts provided in configuration
   */
  private annotateSpecificConcepts(): void {
    const concepts = this.conceptOverrides();
    const detectedMap = new Map<string, ConceptVocabulary>();
    
    concepts.forEach(conceptTerm => {
      const concept = this.vocabularyService.getConcept(conceptTerm);
      if (concept) {
        detectedMap.set(conceptTerm.toLowerCase(), concept);
      }
    });

    this.detectedConcepts.set(detectedMap);
    this.annotateConceptsInDOM();
  }

  /**
   * Annotate detected concepts in the DOM
   */
  private annotateConceptsInDOM(): void {
    const element = this.elementRef.nativeElement;
    const detectedMap = this.detectedConcepts();
    
    if (detectedMap.size === 0) {
      return;
    }

    // Walk through text nodes and wrap concept terms
    this.walkTextNodes(element, (textNode) => {
      const text = textNode.textContent || '';
      let modifiedText = text;
      let hasChanges = false;
      
      // Sort concepts by length (longest first) to avoid partial matches
      const sortedConcepts = Array.from(detectedMap.entries())
        .sort(([a], [b]) => b.length - a.length);
      
      sortedConcepts.forEach(([term, concept]) => {
        const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
        const replacement = `<span class="concept-term" data-concept="${concept.id}" data-term="${term}">$&</span>`;
        
        if (regex.test(modifiedText)) {
          modifiedText = modifiedText.replace(regex, replacement);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        // Replace text node with annotated HTML
        const wrapper = this.renderer.createElement('span');
        wrapper.innerHTML = modifiedText;
        this.renderer.insertBefore(textNode.parentNode, wrapper, textNode);
        this.renderer.removeChild(textNode.parentNode, textNode);
        
        // Track annotated elements for cleanup
        const conceptElements = wrapper.querySelectorAll('.concept-term');
        conceptElements.forEach((el: HTMLElement) => {
          this.annotatedElements.update(current => [...current, el]);
        });
      }
    });
  }

  /**
   * Walk through text nodes in the element
   */
  private walkTextNodes(element: Node, callback: (textNode: Text) => void): void {
    if (element.nodeType === Node.TEXT_NODE) {
      callback(element as Text);
    } else {
      for (let i = 0; i < element.childNodes.length; i++) {
        this.walkTextNodes(element.childNodes[i], callback);
      }
    }
  }

  /**
   * Set up mouse event listeners for tooltips
   */
  private setupEventListeners(): void {
    const element = this.elementRef.nativeElement;
    const config = this.codeTooltipConfig();
    
    this.ngZone.runOutsideAngular(() => {
      // Mouse enter event (with delegation for concept elements)
      fromEvent<MouseEvent>(element, 'mouseover')
        .pipe(
          debounceTime(config.hoverDelay || 300),
          takeUntil(this.destroy$)
        )
        .subscribe((event) => {
          const target = event.target as HTMLElement;
          const conceptElement = target.closest('.concept-term') as HTMLElement;
          
          if (conceptElement && conceptElement !== this.currentTooltipElement) {
            this.showTooltip(conceptElement);
          }
        });
      
      // Mouse leave event
      fromEvent<MouseEvent>(element, 'mouseleave')
        .pipe(
          delay(config.hideDelay || 100),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.hideTooltip();
        });
      
      // Click event for interactive tooltips
      if (config.interactive) {
        fromEvent<MouseEvent>(element, 'click')
          .pipe(takeUntil(this.destroy$))
          .subscribe((event) => {
            const target = event.target as HTMLElement;
            const conceptElement = target.closest('.concept-term') as HTMLElement;
            
            if (conceptElement) {
              event.preventDefault();
              this.showInteractiveTooltip(conceptElement);
            }
          });
      }
    });
  }

  /**
   * Show tooltip for a concept element
   */
  private showTooltip(conceptElement: HTMLElement): void {
    const conceptId = conceptElement.dataset['concept'];
    const conceptTerm = conceptElement.dataset['term'];
    
    if (!conceptId || !conceptTerm) {
      return;
    }
    
    const concept = this.vocabularyService.getConceptById(conceptId);
    if (!concept) {
      return;
    }
    
    const config = this.codeTooltipConfig();
    
    this.ngZone.run(() => {
      this.tooltipService.showTooltip(conceptId, conceptElement, {
        placement: this.mapPositionToPlacement(config.position || 'top'),
        maxWidth: config.maxWidth || 300,
        interactive: config.interactive || false,
        showDelay: 0 // Already debounced
      }).subscribe();
    });
    
    this.currentTooltipElement = conceptElement;
  }

  /**
   * Show interactive tooltip
   */
  private showInteractiveTooltip(conceptElement: HTMLElement): void {
    const conceptId = conceptElement.dataset['concept'];
    
    if (!conceptId) {
      return;
    }
    
    const concept = this.vocabularyService.getConceptById(conceptId);
    if (!concept) {
      return;
    }
    
    const config = this.codeTooltipConfig();
    
    this.ngZone.run(() => {
      this.tooltipService.showTooltip(conceptId, conceptElement, {
        placement: this.mapPositionToPlacement(config.position || 'top'),
        maxWidth: config.maxWidth || 400,
        interactive: true,
        arrow: true
      }).subscribe();
    });
  }

  /**
   * Hide current tooltip
   */
  private hideTooltip(): void {
    if (this.currentTooltipElement) {
      this.ngZone.run(() => {
        this.tooltipService.hideTooltip();
      });
      this.currentTooltipElement = null;
    }
  }

  /**
   * Clean up tooltips and annotations
   */
  private cleanupTooltips(): void {
    // Hide any active tooltips
    this.hideTooltip();
    
    // Remove concept annotations
    this.annotatedElements().forEach(element => {
      if (element.parentNode) {
        // Replace annotated element with its text content
        const textNode = this.renderer.createText(element.textContent || '');
        this.renderer.insertBefore(element.parentNode, textNode, element);
        this.renderer.removeChild(element.parentNode, element);
      }
    });
    
    this.annotatedElements.set([]);
    this.detectedConcepts.set(new Map());
  }

  /**
   * Map position string to TooltipPlacement enum
   */
  private mapPositionToPlacement(position: string): TooltipPlacement {
    const mappings: Record<string, TooltipPlacement> = {
      'top': TooltipPlacement.TOP,
      'bottom': TooltipPlacement.BOTTOM, 
      'left': TooltipPlacement.LEFT,
      'right': TooltipPlacement.RIGHT
    };
    return mappings[position] || TooltipPlacement.TOP;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }
}