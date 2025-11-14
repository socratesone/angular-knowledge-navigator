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

  // Constants (must be defined before signals that use them)
  private readonly MIN_WIDTH = 280;
  private readonly MAX_WIDTH = 480;
  private readonly DEFAULT_PERCENTAGE = 28;
  private readonly MOBILE_BREAKPOINT = '(max-width: 767.98px)';
  private readonly TABLET_BREAKPOINT = '(min-width: 768px) and (max-width: 1023.98px)';
  private readonly DESKTOP_BREAKPOINT = '(min-width: 1024px)';
  private readonly STORAGE_KEY = 'angular-knowledge-nav-layout';

  // Layout state signals (initialized after constants)
  private layoutState = signal<NavigationLayout>(this.getDefaultLayout());
  private isInitialized = signal<boolean>(false);

  // Observables
  private layoutSubject = new BehaviorSubject<NavigationLayout>(this.getDefaultLayout());
  private resizeObserver$!: Observable<number>;

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

      const viewportWidth = (typeof window !== 'undefined' && window.innerWidth > 0) 
        ? window.innerWidth 
        : 1200; // Fallback for SSR or initialization issues
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
    return !isNaN(width) && isFinite(width) && width >= this.MIN_WIDTH && width <= this.MAX_WIDTH;
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
    // Fallback to a reasonable default if window is not available or has no width
    const viewportWidth = (typeof window !== 'undefined' && window.innerWidth > 0) 
      ? window.innerWidth 
      : 1200; // Reasonable desktop default
    
    // Use fallback percentage in case of initialization order issues
    const percentage = this.DEFAULT_PERCENTAGE || 28;
    const defaultWidth = Math.round((percentage / 100) * viewportWidth);
    const minWidth = this.MIN_WIDTH || 280;
    const maxWidth = this.MAX_WIDTH || 480;
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, defaultWidth));

    return {
      currentWidth: constrainedWidth,
      widthPercentage: percentage,
      minWidth: minWidth,
      maxWidth: maxWidth,
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

  /**
   * Get navigation width as CSS custom property value
   * @returns CSS width value for navigation panel
   */
  getNavigationWidthCSS(): string {
    const width = this.currentWidth();
    return this.isCollapsed() ? '0px' : `${width}px`;
  }

  /**
   * Get content width as CSS custom property value
   * @returns CSS width value for content area
   */
  getContentWidthCSS(): string {
    const viewportWidth = window.innerWidth;
    const navWidth = this.isCollapsed() ? 0 : this.currentWidth();
    return `${viewportWidth - navWidth}px`;
  }

  /**
   * Get layout CSS custom properties for dynamic styling
   * @returns Object with CSS custom properties
   */
  getLayoutCSSProperties(): Record<string, string> {
    const layout = this.currentLayout();
    const viewportWidth = window.innerWidth;
    const navWidth = layout.isCollapsed ? 0 : layout.currentWidth;
    
    return {
      '--nav-width': `${navWidth}px`,
      '--nav-width-percentage': `${layout.widthPercentage}%`,
      '--content-width': `${viewportWidth - navWidth}px`,
      '--content-width-percentage': `${100 - (layout.isCollapsed ? 0 : layout.widthPercentage)}%`,
      '--layout-transition': layout.isCollapsed ? 'all 0.3s ease-in-out' : 'none'
    };
  }

  /**
   * Check if current layout allows resizing
   * @returns True if layout can be resized by user
   */
  canUserResize(): boolean {
    const layout = this.currentLayout();
    return !layout.isCollapsed && 
           layout.breakpoint !== LayoutBreakpoint.MOBILE && 
           !this.isMobile();
  }

  /**
   * Snap width to common preset values
   * @param width Current width to snap
   * @returns Snapped width value
   */
  snapToPreset(width: number): number {
    const viewportWidth = window.innerWidth;
    const presets = [
      0.25 * viewportWidth,  // 25%
      0.28 * viewportWidth,  // 28% (default)
      0.30 * viewportWidth,  // 30%
      0.33 * viewportWidth,  // 33%
      0.40 * viewportWidth   // 40%
    ];

    const snapThreshold = 20; // pixels
    
    for (const preset of presets) {
      if (Math.abs(width - preset) <= snapThreshold) {
        return Math.max(this.MIN_WIDTH, Math.min(this.MAX_WIDTH, preset));
      }
    }
    
    return width;
  }

  /**
   * Auto-adjust layout for optimal viewing
   * @returns Observable that emits when auto-adjustment is complete
   */
  autoAdjustLayout(): Observable<void> {
    return new Observable<void>(subscriber => {
      const viewportWidth = (typeof window !== 'undefined' && window.innerWidth > 0) 
        ? window.innerWidth 
        : 1200; // Fallback for SSR or initialization issues
      const currentLayout = this.layoutState();
      
      let optimalWidth = currentLayout.currentWidth;
      
      // Auto-adjust based on viewport size
      if (viewportWidth < 1200) {
        optimalWidth = Math.min(optimalWidth, viewportWidth * 0.35);
      } else if (viewportWidth > 1600) {
        optimalWidth = Math.max(optimalWidth, 400);
      }
      
      // Ensure within bounds
      optimalWidth = Math.max(this.MIN_WIDTH, Math.min(this.MAX_WIDTH, optimalWidth));
      
      if (optimalWidth !== currentLayout.currentWidth) {
        this.setWidth(optimalWidth).subscribe({
          next: () => {
            subscriber.next();
            subscriber.complete();
          },
          error: (error) => subscriber.error(error)
        });
      } else {
        subscriber.next();
        subscriber.complete();
      }
    });
  }

  /**
   * Export layout configuration for backup
   * @returns Serialized layout configuration
   */
  exportLayoutConfig(): string {
    const config = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      layout: this.layoutState(),
      metadata: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      }
    };
    
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import layout configuration from backup
   * @param configJson Serialized layout configuration
   * @returns Observable that emits when import is complete
   */
  importLayoutConfig(configJson: string): Observable<void> {
    return new Observable<void>(subscriber => {
      try {
        const config = JSON.parse(configJson);
        
        // Validate config format
        if (!config.version || !config.layout) {
          throw new Error('Invalid configuration format');
        }
        
        // Migrate if necessary
        const migratedLayout = this.migrateLayoutConfig(config.layout, config.version);
        
        // Apply configuration
        this.updateLayout(migratedLayout);
        this.saveToStorage(migratedLayout);
        
        subscriber.next();
        subscriber.complete();
      } catch (error) {
        subscriber.error(new Error(`Failed to import layout configuration: ${error}`));
      }
    });
  }

  /**
   * Migrate layout configuration between versions
   * @param layout Layout configuration to migrate
   * @param version Source version
   * @returns Migrated layout configuration
   */
  private migrateLayoutConfig(layout: any, version: string): NavigationLayout {
    // For now, we only have version 1.0, but this allows for future migrations
    const currentLayout = this.layoutState();
    
    return {
      ...currentLayout,
      currentWidth: this.validateWidth(layout.currentWidth),
      widthPercentage: this.validatePercentage(layout.widthPercentage),
      userPreferredWidth: layout.userPreferredWidth,
      isCollapsed: typeof layout.isCollapsed === 'boolean' ? layout.isCollapsed : currentLayout.isCollapsed,
      lastResized: layout.lastResized ? new Date(layout.lastResized) : new Date()
    };
  }

  /**
   * Get layout persistence statistics
   * @returns Statistics about layout usage and persistence
   */
  getLayoutStats(): {
    hasStoredPreferences: boolean;
    lastSaved: Date | null;
    totalResizes: number;
    averageWidth: number;
    preferredBreakpoint: LayoutBreakpoint;
  } {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const layout = this.layoutState();
    
    return {
      hasStoredPreferences: !!stored,
      lastSaved: layout.lastResized,
      totalResizes: this.getTotalResizeCount(),
      averageWidth: this.calculateAverageWidth(),
      preferredBreakpoint: layout.breakpoint
    };
  }

  /**
   * Clear all stored layout preferences
   * @returns Observable that emits when preferences are cleared
   */
  clearStoredPreferences(): Observable<void> {
    return new Observable<void>(subscriber => {
      try {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(`${this.STORAGE_KEY}-stats`);
        
        // Reset to default
        const defaultLayout = this.getDefaultLayout();
        this.updateLayout(defaultLayout);
        
        subscriber.next();
        subscriber.complete();
      } catch (error) {
        subscriber.error(new Error('Failed to clear stored preferences'));
      }
    });
  }

  /**
   * Get total resize count from localStorage
   */
  private getTotalResizeCount(): number {
    try {
      const stats = localStorage.getItem(`${this.STORAGE_KEY}-stats`);
      return stats ? JSON.parse(stats).resizeCount || 0 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Increment resize count
   */
  private incrementResizeCount(): void {
    try {
      const stats = {
        resizeCount: this.getTotalResizeCount() + 1,
        lastResize: new Date().toISOString()
      };
      localStorage.setItem(`${this.STORAGE_KEY}-stats`, JSON.stringify(stats));
    } catch {
      // Silently fail if localStorage is not available
    }
  }

  /**
   * Calculate average width from usage history
   */
  private calculateAverageWidth(): number {
    // For now, return current width
    // In a full implementation, this could track width history
    return this.layoutState().currentWidth;
  }

  /**
   * Validate width value
   */
  private validateWidth(width: any): number {
    const numWidth = Number(width);
    if (isNaN(numWidth) || numWidth < this.MIN_WIDTH || numWidth > this.MAX_WIDTH) {
      return this.getDefaultLayout().currentWidth;
    }
    return numWidth;
  }

  /**
   * Validate percentage value
   */
  private validatePercentage(percentage: any): number {
    const numPercentage = Number(percentage);
    if (isNaN(numPercentage) || numPercentage < 10 || numPercentage > 60) {
      return this.DEFAULT_PERCENTAGE;
    }
    return numPercentage;
  }

  /**
   * Enhanced save to storage with error recovery
   */
  private enhancedSaveToStorage(layout: NavigationLayout): void {
    try {
      this.saveToStorage(layout);
      this.incrementResizeCount();
    } catch (error) {
      console.warn('Enhanced save failed, attempting basic save:', error);
      // Fallback to basic save without stats
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          currentWidth: layout.currentWidth,
          widthPercentage: layout.widthPercentage,
          isCollapsed: layout.isCollapsed
        }));
      } catch (fallbackError) {
        console.error('All storage attempts failed:', fallbackError);
      }
    }
  }
}