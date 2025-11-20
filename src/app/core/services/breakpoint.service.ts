import { Injectable, signal, computed, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

export enum ScreenSize {
  Mobile = 'mobile',
  Tablet = 'tablet',
  Desktop = 'desktop'
}

export interface ResponsiveState {
  readonly screenSize: ScreenSize;
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
  readonly showSidebar: boolean;
  readonly useDrawer: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BreakpointService {
  private breakpointObserver = inject(BreakpointObserver);

  // Constitutional breakpoint definitions
  private readonly breakpoints = {
    mobile: '(max-width: 767.98px)',
    tablet: '(min-width: 768px) and (max-width: 1023.98px)',
    desktop: '(min-width: 1024px)'
  } as const;

  // Reactive breakpoint signals
  private readonly isMobile$ = this.breakpointObserver.observe([
    Breakpoints.XSmall,
    Breakpoints.Small,
    this.breakpoints.mobile
  ]).pipe(
    map(result => result.matches),
    startWith(false)
  );

  private readonly isTablet$ = this.breakpointObserver.observe([
    Breakpoints.Medium,
    this.breakpoints.tablet
  ]).pipe(
    map(result => result.matches),
    startWith(false)
  );

  private readonly isDesktop$ = this.breakpointObserver.observe([
    Breakpoints.Large,
    Breakpoints.XLarge,
    this.breakpoints.desktop
  ]).pipe(
    map(result => result.matches),
    startWith(false)
  );

  // Convert observables to signals for constitutional reactivity
  readonly isMobile = toSignal(this.isMobile$, { initialValue: false });
  readonly isTablet = toSignal(this.isTablet$, { initialValue: false });
  readonly isDesktop = toSignal(this.isDesktop$, { initialValue: false });

  // Computed screen size signal
  readonly screenSize = computed<ScreenSize>(() => {
    if (this.isMobile()) return ScreenSize.Mobile;
    if (this.isTablet()) return ScreenSize.Tablet;
    return ScreenSize.Desktop;
  });

  // Navigation behavior signals
  readonly showSidebar = computed(() => this.isDesktop());
  readonly useDrawer = computed(() => this.isMobile() || this.isTablet());

  // Comprehensive responsive state
  readonly responsiveState = computed<ResponsiveState>(() => ({
    screenSize: this.screenSize(),
    isMobile: this.isMobile(),
    isTablet: this.isTablet(),
    isDesktop: this.isDesktop(),
    showSidebar: this.showSidebar(),
    useDrawer: this.useDrawer()
  }));

  // Utility methods for specific breakpoint queries
  matches(query: string): boolean {
    return this.breakpointObserver.isMatched(query);
  }

  // Predefined breakpoint checks
  isHandset(): boolean {
    return this.breakpointObserver.isMatched(Breakpoints.Handset);
  }

  isTabletLandscape(): boolean {
    return this.breakpointObserver.isMatched(Breakpoints.TabletLandscape);
  }

  isTabletPortrait(): boolean {
    return this.breakpointObserver.isMatched(Breakpoints.TabletPortrait);
  }

  isWebLandscape(): boolean {
    return this.breakpointObserver.isMatched(Breakpoints.WebLandscape);
  }

  isWebPortrait(): boolean {
    return this.breakpointObserver.isMatched(Breakpoints.WebPortrait);
  }

  // Constitutional helper for component layout decisions
  getLayoutConfig() {
    const state = this.responsiveState();
    
    return {
      contentPadding: state.isMobile ? '16px' : state.isTablet ? '24px' : '32px',
      navigationWidth: state.isDesktop ? '280px' : '100%',
      headerHeight: state.isMobile ? '56px' : '64px',
      searchBarWidth: state.isMobile ? '100%' : state.isTablet ? '60%' : '40%',
      codeExampleMaxHeight: state.isMobile ? '300px' : '500px',
      showNavigationIcons: !state.isDesktop,
      enableSwipeGestures: state.isMobile || state.isTablet,
      compactMode: state.isMobile
    };
  }

  // Debug helper for development
  getCurrentBreakpointInfo() {
    const state = this.responsiveState();
    return {
      ...state,
      layoutConfig: this.getLayoutConfig(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }
}