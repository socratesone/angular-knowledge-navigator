import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Cache Control Interceptor
 * Adds appropriate cache headers for different types of requests
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip for non-GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  let modifiedReq = req;

  // Handle different types of content
  if (req.url.includes('/assets/concepts/')) {
    // Markdown content - cache for 5 minutes
    modifiedReq = req.clone({
      setHeaders: {
        'Cache-Control': 'max-age=300, must-revalidate'
      }
    });
  } else if (req.url.includes('/assets/data/')) {
    // Data files (like learning-path.json) - cache for 1 hour
    modifiedReq = req.clone({
      setHeaders: {
        'Cache-Control': 'max-age=3600, must-revalidate'
      }
    });
  } else if (req.url.includes('/api/')) {
    // API requests - add cache headers based on endpoint
    if (req.url.includes('/search')) {
      // Search results - short cache
      modifiedReq = req.clone({
        setHeaders: {
          'Cache-Control': 'max-age=60'
        }
      });
    } else {
      // Other API requests - no cache by default
      modifiedReq = req.clone({
        setHeaders: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
  }

  return next(modifiedReq);
};