import { Injectable, inject, signal, computed } from '@angular/core';
import { Overlay, OverlayRef, OverlayPositionBuilder, ConnectedPosition } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Observable, Subject, timer, EMPTY } from 'rxjs';
import { takeUntil, switchMap, tap } from 'rxjs/operators';

import { 
  TooltipState, 
  TooltipOptions, 
  TooltipPlacement, 
  TooltipPosition,
  TooltipContent,
  TooltipInteraction,
  TooltipAction,
  TooltipError,
  TooltipErrorType 
} from '../../shared/models/tooltip.model';
import { VocabularyService } from './vocabulary.service';
import { ConceptTooltipComponent } from '../../shared/components/concept-tooltip/concept-tooltip.component';

@Injectable({
  providedIn: 'root'
})
export class TooltipService {
  private overlay = inject(Overlay);
  private positionBuilder = inject(OverlayPositionBuilder);
  private vocabularyService = inject(VocabularyService);

  // Current tooltip state
  private currentTooltip = signal<OverlayRef | null>(null);
  private tooltipState = signal<TooltipState | null>(null);
  private activeTooltips = new Map<string, OverlayRef>();

  // Configuration
  private defaultOptions: TooltipOptions = {
    placement: TooltipPlacement.AUTO,
    showDelay: 300,
    hideDelay: 100,
    maxWidth: 400,
    offset: 8,
    arrow: true,
    closeOnClick: true,
    closeOnEscape: true,
    interactive: false,
    theme: 'dark'
  };

  // Event streams
  private interactionSubject = new Subject<TooltipInteraction>();
  private errorSubject = new Subject<TooltipError>();
  private destroy$ = new Subject<void>();

  // Computed properties
  readonly isTooltipVisible = computed(() => this.currentTooltip() !== null);
  readonly currentState = computed(() => this.tooltipState());

  constructor() {
    this.setupGlobalEventListeners();
  }

  /**
   * Show tooltip for a concept
   * @param conceptId The vocabulary concept ID
   * @param triggerElement The element that triggered the tooltip
   * @param options Optional tooltip configuration
   * @returns Observable that emits when tooltip is shown
   */
  showTooltip(
    conceptId: string, 
    triggerElement: HTMLElement, 
    options?: TooltipOptions
  ): Observable<void> {
    const config = { ...this.defaultOptions, ...options };
    
    // Hide any existing tooltip first
    if (this.currentTooltip()) {
      this.hideTooltip(true);
    }

    const concept = this.vocabularyService.getConcept(conceptId) || 
                   this.vocabularyService.getConceptById(conceptId);
    
    if (!concept) {
      this.handleError({
        type: TooltipErrorType.CONCEPT_NOT_FOUND,
        message: `Concept not found: ${conceptId}`,
        conceptId,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        recoverable: true
      });
      return EMPTY;
    }

    return timer(config.showDelay || 0).pipe(
      switchMap(() => {
        try {
          const overlayRef = this.createTooltipOverlay(triggerElement, config);
          const content: TooltipContent = {
            title: concept.term,
            description: concept.definition,
            detailedText: concept.detailedExplanation,
            relatedLinks: concept.relatedArticles.map(articleId => ({
              text: `Learn more about ${concept.term}`,
              url: `/concepts/${articleId}`,
              type: 'internal' as const
            }))
          };

          const tooltipComponent = overlayRef.attach(new ComponentPortal(ConceptTooltipComponent));
          tooltipComponent.instance.content = content;
          tooltipComponent.instance.options = config;

          const state: TooltipState = {
            isVisible: true,
            conceptId,
            position: this.calculatePosition(triggerElement, config),
            triggerElement,
            content,
            showDelay: config.showDelay || 0,
            hideDelay: config.hideDelay || 0,
            zIndex: 1000
          };

          this.currentTooltip.set(overlayRef);
          this.tooltipState.set(state);
          this.activeTooltips.set(conceptId, overlayRef);

          this.trackInteraction({
            conceptId,
            action: TooltipAction.SHOW,
            timestamp: new Date(),
            triggerType: 'hover',
            userAgent: navigator.userAgent
          });

          return new Observable<void>(subscriber => {
            subscriber.next();
            subscriber.complete();
          });

        } catch (error) {
          this.handleError({
            type: TooltipErrorType.RENDER_FAILED,
            message: `Failed to render tooltip: ${error}`,
            conceptId,
            timestamp: new Date(),
            userAgent: navigator.userAgent,
            recoverable: true,
            stack: error instanceof Error ? error.stack : undefined
          });
          return EMPTY;
        }
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Hide currently visible tooltip
   * @param immediate Skip hide delay if true
   * @returns Observable that emits when tooltip is hidden
   */
  hideTooltip(immediate: boolean = false): Observable<void> {
    const tooltip = this.currentTooltip();
    if (!tooltip) {
      return new Observable<void>(subscriber => {
        subscriber.next();
        subscriber.complete();
      });
    }

    const delay = immediate ? 0 : (this.tooltipState()?.hideDelay || 0);
    
    return timer(delay).pipe(
      tap(() => {
        const state = this.tooltipState();
        if (state) {
          this.trackInteraction({
            conceptId: state.conceptId,
            action: TooltipAction.HIDE,
            timestamp: new Date(),
            triggerType: 'hover',
            userAgent: navigator.userAgent
          });
        }

        tooltip.dispose();
        this.currentTooltip.set(null);
        this.tooltipState.set(null);
        
        // Remove from active tooltips
        for (const [conceptId, overlayRef] of this.activeTooltips.entries()) {
          if (overlayRef === tooltip) {
            this.activeTooltips.delete(conceptId);
            break;
          }
        }
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Hide all tooltips
   * @returns Observable that emits when all tooltips are hidden
   */
  hideAllTooltips(): Observable<void> {
    const tooltips = Array.from(this.activeTooltips.values());
    
    tooltips.forEach(tooltip => tooltip.dispose());
    
    this.currentTooltip.set(null);
    this.tooltipState.set(null);
    this.activeTooltips.clear();

    return new Observable<void>(subscriber => {
      subscriber.next();
      subscriber.complete();
    });
  }

  /**
   * Configure tooltip default options
   * @param options Default options for all tooltips
   */
  setDefaultOptions(options: Partial<TooltipOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Register tooltip trigger elements
   * @param elements Array of elements to attach hover listeners
   * @param conceptMap Map of element to concept ID
   */
  registerTriggers(elements: HTMLElement[], conceptMap: Map<HTMLElement, string>): void {
    elements.forEach(element => {
      const conceptId = conceptMap.get(element);
      if (!conceptId) return;

      const mouseEnterHandler = () => {
        this.showTooltip(conceptId, element).subscribe();
      };

      const mouseLeaveHandler = () => {
        this.hideTooltip().subscribe();
      };

      const focusHandler = () => {
        this.showTooltip(conceptId, element).subscribe();
      };

      const blurHandler = () => {
        this.hideTooltip().subscribe();
      };

      element.addEventListener('mouseenter', mouseEnterHandler);
      element.addEventListener('mouseleave', mouseLeaveHandler);
      element.addEventListener('focus', focusHandler);
      element.addEventListener('blur', blurHandler);

      // Store handlers for cleanup
      (element as any).__tooltipHandlers = {
        mouseEnterHandler,
        mouseLeaveHandler,
        focusHandler,
        blurHandler
      };
    });
  }

  /**
   * Unregister tooltip triggers
   * @param elements Array of elements to remove listeners from
   */
  unregisterTriggers(elements: HTMLElement[]): void {
    elements.forEach(element => {
      const handlers = (element as any).__tooltipHandlers;
      if (handlers) {
        element.removeEventListener('mouseenter', handlers.mouseEnterHandler);
        element.removeEventListener('mouseleave', handlers.mouseLeaveHandler);
        element.removeEventListener('focus', handlers.focusHandler);
        element.removeEventListener('blur', handlers.blurHandler);
        delete (element as any).__tooltipHandlers;
      }
    });
  }

  /**
   * Update tooltip position
   * @param position New position coordinates
   */
  updatePosition(position: Partial<TooltipPosition>): void {
    const currentState = this.tooltipState();
    if (currentState) {
      const updatedState = {
        ...currentState,
        position: { ...currentState.position, ...position }
      };
      this.tooltipState.set(updatedState);
    }
  }

  /**
   * Get tooltip interaction stream
   * @returns Observable of tooltip interactions
   */
  getInteractions(): Observable<TooltipInteraction> {
    return this.interactionSubject.asObservable();
  }

  /**
   * Get tooltip error stream
   * @returns Observable of tooltip errors
   */
  getErrors(): Observable<TooltipError> {
    return this.errorSubject.asObservable();
  }

  /**
   * Create overlay for tooltip
   * @param triggerElement Element that triggered tooltip
   * @param options Tooltip configuration
   * @returns OverlayRef for the tooltip
   */
  private createTooltipOverlay(triggerElement: HTMLElement, options: TooltipOptions): OverlayRef {
    const positions = this.getOverlayPositions(options.placement || TooltipPlacement.AUTO);
    
    const positionStrategy = this.positionBuilder
      .flexibleConnectedTo(triggerElement)
      .withPositions(positions)
      .withPush(true)
      .withFlexibleDimensions(true)
      .withViewportMargin(8);

    return this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: [`tooltip-overlay`, `tooltip-${options.theme || 'dark'}`],
      maxWidth: options.maxWidth || 400,
      hasBackdrop: false
    });
  }

  /**
   * Get overlay positions based on placement preference
   * @param placement Preferred placement
   * @returns Array of connected positions
   */
  private getOverlayPositions(placement: TooltipPlacement): ConnectedPosition[] {
    const positions: ConnectedPosition[] = [];

    switch (placement) {
      case TooltipPlacement.TOP:
        positions.push(
          { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' }
        );
        break;
      case TooltipPlacement.BOTTOM:
        positions.push(
          { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' }
        );
        break;
      case TooltipPlacement.LEFT:
        positions.push(
          { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' }
        );
        break;
      case TooltipPlacement.RIGHT:
        positions.push(
          { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' }
        );
        break;
      default: // AUTO
        positions.push(
          { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
          { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
          { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
          { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' }
        );
    }

    return positions;
  }

  /**
   * Calculate tooltip position
   * @param triggerElement Trigger element
   * @param options Tooltip options
   * @returns Tooltip position
   */
  private calculatePosition(triggerElement: HTMLElement, options: TooltipOptions): TooltipPosition {
    const rect = triggerElement.getBoundingClientRect();
    
    return {
      x: rect.left + rect.width / 2,
      y: rect.top,
      placement: options.placement || TooltipPlacement.AUTO,
      strategy: 'fixed'
    };
  }

  /**
   * Track user interaction with tooltips
   * @param interaction Interaction data
   */
  private trackInteraction(interaction: TooltipInteraction): void {
    this.interactionSubject.next(interaction);
  }

  /**
   * Handle tooltip errors
   * @param error Error information
   */
  private handleError(error: TooltipError): void {
    console.error('Tooltip Error:', error);
    this.errorSubject.next(error);
  }

  /**
   * Setup global event listeners
   */
  private setupGlobalEventListeners(): void {
    // ESC key handling
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape' && this.isTooltipVisible()) {
        this.hideTooltip(true).subscribe();
      }
    });

    // Click outside handling
    document.addEventListener('click', (event: MouseEvent) => {
      if (this.isTooltipVisible() && this.defaultOptions.closeOnClick) {
        const state = this.tooltipState();
        if (state && !state.triggerElement.contains(event.target as Node)) {
          this.hideTooltip(true).subscribe();
        }
      }
    });
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.hideAllTooltips().subscribe();
  }
}