import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

/**
 * Loading State Interceptor
 * Automatically tracks HTTP request loading states for UI feedback
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip loading indicator for certain requests
  const skipLoading = req.headers.has('X-Skip-Loading') || 
                     req.url.includes('/assets/') ||
                     req.method === 'GET' && req.url.includes('/health');

  if (!skipLoading) {
    // Increment active request counter
    incrementActiveRequests();
  }

  return next(req).pipe(
    finalize(() => {
      if (!skipLoading) {
        // Decrement active request counter
        decrementActiveRequests();
      }
    })
  );
};

// Simple global request counter (in a real app, use a service)
let activeRequestCount = 0;

function incrementActiveRequests(): void {
  activeRequestCount++;
  updateLoadingState();
}

function decrementActiveRequests(): void {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
  updateLoadingState();
}

function updateLoadingState(): void {
  // In a real application, you'd dispatch to a state management system
  // For now, we'll use a simple custom event
  const isLoading = activeRequestCount > 0;
  window.dispatchEvent(new CustomEvent('http-loading-state', { 
    detail: { isLoading, activeRequests: activeRequestCount } 
  }));
}

// Export function to get current loading state
export function getCurrentLoadingState(): { isLoading: boolean; activeRequests: number } {
  return {
    isLoading: activeRequestCount > 0,
    activeRequests: activeRequestCount
  };
}