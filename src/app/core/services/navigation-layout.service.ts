import { Injectable, signal, computed, inject } from '@angular/core';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Observable, BehaviorSubject, fromEvent } from 'rxjs';
import { map, startWith, distinctUntilChanged, debounceTime } from 'rxjs/operators';

import { 
  NavigationLayout, 
  LayoutBreakpoint 
} from '../../shared/models/navigation.model';

@Injectable({
  providedIn: 'root'
})
export class NavigationLayoutService {
  private breakpointObserver = inject(BreakpointObserver);

  // Layout state signals
  private layoutState = signal<NavigationLayout>(this.getDefaultLayout());
  private isInitialized = signal<boolean>(false);

  // Constants
  private readonly MIN_WIDTH = 280;
  private readonly MAX_WIDTH = 480;
  private readonly DEFAULT_PERCENTAGE = 28;
  private readonly MOBILE_BREAKPOINT = '(max-width: 767.98px)';
  private readonly TABLET_BREAKPOINT = '(min-width: 768px) and (max-width: 1023.98px)';
  private readonly DESKTOP_BREAKPOINT = '(min-width: 1024px)';
  private readonly STORAGE_KEY = 'angular-knowledge-nav-layout';

  // Observables
  private layoutSubject = new BehaviorSubject<NavigationLayout>(this.getDefaultLayout());
  private resizeObserver$: Observable<number>;

  // Computed properties
  readonly currentLayout = computed(() => this.layoutState());
  readonly isCollapsed = computed(() => this.layoutState().isCollapsed);
  readonly currentWidth = computed(() => this.layoutState().currentWidth);
  readonly widthPercentage = computed(() => this.layoutState().widthPercentage);
  readonly breakpoint = computed(() => this.layoutState().breakpoint);
  readonly isMobile = computed(() => this.layoutState().breakpoint === LayoutBreakpoint.MOBILE);
  readonly isTablet = computed(() => this.layoutState().breakpoint === LayoutBreakpoint.TABLET);
  readonly isDesktop = computed(() => this.layoutState().breakpoint === LayoutBreakpoint.DESKTOP);

  constructor() {
    this.initializeLayoutService();
    this.setupBreakpointObserver();
    this.setupResizeObserver();
  }

  /**
   * Get current navigation layout state
   * @returns Observable of current layout state
   */
  getLayoutState(): Observable<NavigationLayout> {
    return this.layoutSubject.asObservable();
  }

  /**
   * Update navigation panel width
   * @param width New width in pixels
   * @returns Observable that emits when width is updated
   */
  setWidth(width: number): Observable<void> {
    return new Observable<void>(subscriber => {
      if (!this.isValidWidth(width)) {
        subscriber.error(new Error(`Invalid width: ${width}. Must be between ${this.MIN_WIDTH} and ${this.MAX_WIDTH}`));
        return;
      }

      const currentLayout = this.layoutState();
      const viewportWidth = window.innerWidth;
      const percentage = Math.round((width / viewportWidth) * 100);

      const updatedLayout: NavigationLayout = {
        ...currentLayout,
        currentWidth: width,
        widthPercentage: percentage,
        userPreferredWidth: width,
        lastResized: new Date()
      };

      this.updateLayout(updatedLayout);
      this.saveToStorage(updatedLayout);

      subscriber.next();
      subscriber.complete();
    });
  }

  /**
   * Update navigation panel width by percentage
   * @param percentage Percentage of viewport width (20-40%)
   * @returns Observable that emits when width is updated
   */
  setWidthPercentage(percentage: number): Observable<void> {
    return new Observable<void>(subscriber => {
      if (percentage < 20 || percentage > 40) {
        subscriber.error(new Error(`Invalid percentage: ${percentage}%. Must be between 20% and 40%`));
        return;
      }

      const viewportWidth = window.innerWidth;
      const width = Math.round((percentage / 100) * viewportWidth);
      
      if (!this.isValidWidth(width)) {
        const constrainedWidth = Math.max(this.MIN_WIDTH, Math.min(this.MAX_WIDTH, width));
        const constrainedPercentage = Math.round((constrainedWidth / viewportWidth) * 100);
        
        this.setWidth(constrainedWidth).subscribe({
          next: () => subscriber.next(),
          error: (error) => subscriber.error(error),
          complete: () => subscriber.complete()
        });
        return;
      }

      this.setWidth(width).subscribe({
        next: () => subscriber.next(),
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete()
      });
    });
  }

  /**
   * Toggle navigation panel collapsed state
   * @returns Observable that emits when state is toggled
   */
  toggleCollapsed(): Observable<void> {
    return new Observable<void>(subscriber => {
      const currentLayout = this.layoutState();
      const updatedLayout: NavigationLayout = {
        ...currentLayout,
        isCollapsed: !currentLayout.isCollapsed
      };

      this.updateLayout(updatedLayout);
      this.saveToStorage(updatedLayout);

      subscriber.next();
      subscriber.complete();
    });
  }

  /**
   * Set navigation panel collapsed state
   * @param collapsed True to collapse, false to expand
   * @returns Observable that emits when state is set
   */
  setCollapsed(collapsed: boolean): Observable<void> {
    return new Observable<void>(subscriber => {
      const currentLayout = this.layoutState();
      
      if (currentLayout.isCollapsed === collapsed) {
        subscriber.next();
        subscriber.complete();
        return;
      }

      const updatedLayout: NavigationLayout = {
        ...currentLayout,
        isCollapsed: collapsed
      };

      this.updateLayout(updatedLayout);
      this.saveToStorage(updatedLayout);

      subscriber.next();
      subscriber.complete();
    });
  }

  /**
   * Reset navigation panel to default dimensions
   * @returns Observable that emits when reset is complete
   */
  resetToDefault(): Observable<void> {
    return new Observable<void>(subscriber => {
      const defaultLayout = this.getDefaultLayout();
      const currentBreakpoint = this.layoutState().breakpoint;
      
      const resetLayout: NavigationLayout = {
        ...defaultLayout,
        breakpoint: currentBreakpoint
      };

      this.updateLayout(resetLayout);
      this.saveToStorage(resetLayout);

      subscriber.next();
      subscriber.complete();
    });
  }

  /**
   * Save current layout as user preference
   * @returns Observable that emits when preference is saved
   */
  saveUserPreference(): Observable<void> {
    return new Observable<void>(subscriber => {
      const currentLayout = this.layoutState();
      this.saveToStorage(currentLayout);
      
      subscriber.next();
      subscriber.complete();
    });
  }

  /**
   * Load user layout preference
   * @returns Observable that emits when preference is loaded
   */
  loadUserPreference(): Observable<void> {
    return new Observable<void>(subscriber => {
      const savedLayout = this.loadFromStorage();
      
      if (savedLayout) {
        // Merge with current breakpoint state
        const currentLayout = this.layoutState();
        const mergedLayout: NavigationLayout = {
          ...savedLayout,
          breakpoint: currentLayout.breakpoint
        };
        
        this.updateLayout(mergedLayout);
      }

      subscriber.next();
      subscriber.complete();
    });
  }

  /**
   * Get current responsive breakpoint
   * @returns Observable of current breakpoint
   */
  getCurrentBreakpoint(): Observable<LayoutBreakpoint> {
    return this.layoutSubject.pipe(
      map(layout => layout.breakpoint),
      distinctUntilChanged()
    );
  }

  /**
   * Check if navigation is in mobile mode
   * @returns Observable of mobile state
   */
  isMobileMode(): Observable<boolean> {
    return this.getCurrentBreakpoint().pipe(
      map(breakpoint => breakpoint === LayoutBreakpoint.MOBILE)
    );
  }

  /**
   * Get minimum and maximum width constraints
   * @returns Width constraints object
   */
  getWidthConstraints(): { min: number; max: number } {
    return {
      min: this.MIN_WIDTH,
      max: this.MAX_WIDTH
    };
  }

  /**
   * Validate proposed width
   * @param width Width to validate
   * @returns True if width is valid
   */
  isValidWidth(width: number): boolean {
    return width >= this.MIN_WIDTH && width <= this.MAX_WIDTH;
  }

  /**
   * Initialize layout service
   */
  private initializeLayoutService(): void {
    // Load saved preferences
    this.loadUserPreference().subscribe();
    
    // Mark as initialized
    this.isInitialized.set(true);
  }

  /**
   * Setup breakpoint observer for responsive behavior
   */
  private setupBreakpointObserver(): void {
    // Mobile breakpoint
    this.breakpointObserver.observe(this.MOBILE_BREAKPOINT).subscribe((state: BreakpointState) => {
      if (state.matches) {
        this.updateBreakpoint(LayoutBreakpoint.MOBILE);
      }
    });

    // Tablet breakpoint
    this.breakpointObserver.observe(this.TABLET_BREAKPOINT).subscribe((state: BreakpointState) => {
      if (state.matches) {
        this.updateBreakpoint(LayoutBreakpoint.TABLET);
      }
    });

    // Desktop breakpoint
    this.breakpointObserver.observe(this.DESKTOP_BREAKPOINT).subscribe((state: BreakpointState) => {
      if (state.matches) {
        this.updateBreakpoint(LayoutBreakpoint.DESKTOP);
      }
    });
  }

  /**
   * Setup resize observer for responsive width adjustments
   */
  private setupResizeObserver(): void {
    this.resizeObserver$ = fromEvent(window, 'resize').pipe(
      debounceTime(100),
      map(() => window.innerWidth),
      startWith(window.innerWidth),
      distinctUntilChanged()
    );

    this.resizeObserver$.subscribe(viewportWidth => {
      this.handleViewportResize(viewportWidth);
    });
  }

  /**
   * Handle viewport resize events
   * @param viewportWidth New viewport width
   */
  private handleViewportResize(viewportWidth: number): void {
    const currentLayout = this.layoutState();
    
    // Recalculate width percentage
    const newPercentage = Math.round((currentLayout.currentWidth / viewportWidth) * 100);
    
    // Ensure width stays within constraints
    let newWidth = currentLayout.currentWidth;
    if (newWidth > this.MAX_WIDTH) {
      newWidth = this.MAX_WIDTH;
    } else if (newWidth < this.MIN_WIDTH) {
      newWidth = this.MIN_WIDTH;
    }

    if (newWidth !== currentLayout.currentWidth || newPercentage !== currentLayout.widthPercentage) {
      const updatedLayout: NavigationLayout = {
        ...currentLayout,
        currentWidth: newWidth,
        widthPercentage: newPercentage
      };

      this.updateLayout(updatedLayout);
    }
  }

  /**
   * Update breakpoint and adjust layout accordingly
   * @param breakpoint New breakpoint
   */
  private updateBreakpoint(breakpoint: LayoutBreakpoint): void {
    const currentLayout = this.layoutState();
    
    const updatedLayout: NavigationLayout = {
      ...currentLayout,
      breakpoint,
      isCollapsed: breakpoint === LayoutBreakpoint.MOBILE ? true : currentLayout.isCollapsed
    };

    this.updateLayout(updatedLayout);
  }

  /**
   * Update layout state and emit changes
   * @param layout New layout state
   */
  private updateLayout(layout: NavigationLayout): void {
    this.layoutState.set(layout);
    this.layoutSubject.next(layout);
  }

  /**
   * Get default layout configuration
   * @returns Default navigation layout
   */
  private getDefaultLayout(): NavigationLayout {
    const viewportWidth = window.innerWidth;
    const defaultWidth = Math.round((this.DEFAULT_PERCENTAGE / 100) * viewportWidth);
    const constrainedWidth = Math.max(this.MIN_WIDTH, Math.min(this.MAX_WIDTH, defaultWidth));

    return {
      currentWidth: constrainedWidth,
      widthPercentage: this.DEFAULT_PERCENTAGE,
      minWidth: this.MIN_WIDTH,
      maxWidth: this.MAX_WIDTH,
      isCollapsed: false,
      isResizable: true,
      breakpoint: LayoutBreakpoint.DESKTOP,
      lastResized: new Date()
    };
  }

  /**
   * Save layout to localStorage
   * @param layout Layout to save
   */
  private saveToStorage(layout: NavigationLayout): void {
    try {
      const storageData = {
        currentWidth: layout.currentWidth,
        widthPercentage: layout.widthPercentage,
        userPreferredWidth: layout.userPreferredWidth,
        isCollapsed: layout.isCollapsed,
        lastResized: layout.lastResized.toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.warn('Failed to save navigation layout to localStorage:', error);
    }
  }

  /**
   * Load layout from localStorage
   * @returns Saved layout or null
   */
  private loadFromStorage(): NavigationLayout | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      const currentLayout = this.layoutState();

      return {
        ...currentLayout,
        currentWidth: data.currentWidth || currentLayout.currentWidth,
        widthPercentage: data.widthPercentage || currentLayout.widthPercentage,
        userPreferredWidth: data.userPreferredWidth,
        isCollapsed: data.isCollapsed !== undefined ? data.isCollapsed : currentLayout.isCollapsed,
        lastResized: data.lastResized ? new Date(data.lastResized) : new Date()
      };
    } catch (error) {
      console.warn('Failed to load navigation layout from localStorage:', error);
      return null;
    }
  }
}