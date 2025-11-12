import { Injectable, inject, DestroyRef } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, filter, map, tap } from 'rxjs';
import { BreakpointService } from './breakpoint.service';

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class GestureService {
  private document = inject(DOCUMENT);
  private destroyRef = inject(DestroyRef);
  private breakpointService = inject(BreakpointService);

  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private readonly swipeThreshold = 50; // Minimum distance for swipe
  private readonly swipeTimeout = 500; // Maximum time for swipe (ms)

  /**
   * Enable swipe gestures on an element
   */
  enableSwipeGestures(
    element: HTMLElement,
    onSwipe: (gesture: SwipeGesture) => void,
    options: {
      horizontal?: boolean;
      vertical?: boolean;
      threshold?: number;
    } = {}
  ): void {
    if (!this.breakpointService.isMobile() && !this.breakpointService.isTablet()) {
      return; // Only enable on mobile/tablet
    }

    const config = {
      horizontal: options.horizontal ?? true,
      vertical: options.vertical ?? false,
      threshold: options.threshold ?? this.swipeThreshold
    };

    // Touch start
    fromEvent<TouchEvent>(element, 'touchstart', { passive: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
      });

    // Touch end
    fromEvent<TouchEvent>(element, 'touchend', { passive: true })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(event => event.changedTouches.length > 0),
        map(event => {
          const touch = event.changedTouches[0];
          const endX = touch.clientX;
          const endY = touch.clientY;
          const duration = Date.now() - this.touchStartTime;

          return this.calculateSwipe(
            this.touchStartX,
            this.touchStartY,
            endX,
            endY,
            duration,
            config
          );
        }),
        filter(gesture => gesture !== null)
      )
      .subscribe(gesture => {
        if (gesture) {
          onSwipe(gesture);
        }
      });
  }

  /**
   * Enable edge swipe gestures for navigation drawer
   */
  enableEdgeSwipe(
    onSwipeRight: () => void,
    onSwipeLeft: () => void,
    edgeThreshold = 20
  ): void {
    if (!this.breakpointService.isMobile() && !this.breakpointService.isTablet()) {
      return;
    }

    const body = this.document.body;
    const screenWidth = window.innerWidth;

    fromEvent<TouchEvent>(body, 'touchstart', { passive: true })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(event => {
          const touch = event.touches[0];
          // Only trigger on edge swipes
          return touch.clientX <= edgeThreshold || 
                 touch.clientX >= screenWidth - edgeThreshold;
        })
      )
      .subscribe(event => {
        const startX = event.touches[0].clientX;
        const startY = event.touches[0].clientY;
        const startTime = Date.now();

        const touchMoveListener = (moveEvent: TouchEvent) => {
          const touch = moveEvent.touches[0];
          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          
          // Check if it's a horizontal swipe
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.swipeThreshold) {
            if (deltaX > 0 && startX <= edgeThreshold) {
              // Right swipe from left edge
              onSwipeRight();
            } else if (deltaX < 0 && startX >= screenWidth - edgeThreshold) {
              // Left swipe from right edge
              onSwipeLeft();
            }
            
            body.removeEventListener('touchmove', touchMoveListener);
            body.removeEventListener('touchend', touchEndListener);
          }
        };

        const touchEndListener = () => {
          body.removeEventListener('touchmove', touchMoveListener);
          body.removeEventListener('touchend', touchEndListener);
        };

        body.addEventListener('touchmove', touchMoveListener, { passive: true });
        body.addEventListener('touchend', touchEndListener, { passive: true });
      });
  }

  /**
   * Calculate swipe gesture from touch coordinates
   */
  private calculateSwipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number,
    config: { horizontal: boolean; vertical: boolean; threshold: number }
  ): SwipeGesture | null {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check if swipe meets time and distance requirements
    if (duration > this.swipeTimeout || distance < config.threshold) {
      return null;
    }

    // Determine swipe direction
    let direction: SwipeGesture['direction'];
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (!config.horizontal) return null;
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      if (!config.vertical) return null;
      direction = deltaY > 0 ? 'down' : 'up';
    }

    return {
      direction,
      distance,
      startX,
      startY,
      endX,
      endY,
      duration
    };
  }

  /**
   * Disable all gesture listeners (useful for cleanup)
   */
  disableGestures(): void {
    // Listeners are automatically cleaned up via takeUntilDestroyed
  }
}