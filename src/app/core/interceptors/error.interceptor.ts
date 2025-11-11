import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { GlobalErrorHandler } from '../services/global-error-handler.service';

/**
 * HTTP Error Interceptor for centralized error handling
 * Automatically catches and processes HTTP errors across the application
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const globalErrorHandler = inject(GlobalErrorHandler);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Log the error through our global error handler
      globalErrorHandler.handleError(error);
      
      // Create user-friendly error message
      let userMessage = 'An unexpected error occurred';
      
      switch (error.status) {
        case 0:
          userMessage = 'Network connection error. Please check your internet connection.';
          break;
        case 400:
          userMessage = 'Invalid request. Please check your input and try again.';
          break;
        case 401:
          userMessage = 'Authentication required. Please log in.';
          break;
        case 403:
          userMessage = 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          userMessage = 'The requested resource was not found.';
          break;
        case 429:
          userMessage = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          userMessage = 'Server error. Please try again later.';
          break;
        case 503:
          userMessage = 'Service unavailable. Please try again later.';
          break;
        default:
          if (error.error?.message) {
            userMessage = error.error.message;
          }
      }
      
      // Create enhanced error object
      const enhancedError = {
        ...error,
        userMessage,
        timestamp: new Date().toISOString(),
        url: req.url,
        method: req.method
      };
      
      return throwError(() => enhancedError);
    })
  );
};