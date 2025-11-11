import { Injectable, ErrorHandler } from '@angular/core';

export interface ConstitutionalError {
  type: 'constitutional-violation' | 'content-error' | 'navigation-error' | 'validation-error';
  message: string;
  context?: string;
  suggestion?: string;
  learnMoreUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  
  handleError(error: any): void {
    // Check if this is a constitutional error with educational context
    if (this.isConstitutionalError(error)) {
      this.handleConstitutionalError(error);
    } else {
      this.handleGenericError(error);
    }
  }

  private isConstitutionalError(error: any): error is ConstitutionalError {
    return error && typeof error === 'object' && 'type' in error && 'message' in error;
  }

  private handleConstitutionalError(error: ConstitutionalError): void {
    console.group('🏛️ Constitutional Violation Detected');
    console.error('Type:', error.type);
    console.error('Message:', error.message);
    
    if (error.context) {
      console.error('Context:', error.context);
    }
    
    if (error.suggestion) {
      console.info('💡 Suggestion:', error.suggestion);
    }
    
    if (error.learnMoreUrl) {
      console.info('📚 Learn more:', error.learnMoreUrl);
    }
    
    console.groupEnd();

    // In a real application, you might want to:
    // - Send to logging service
    // - Show user-friendly notification
    // - Track constitutional violations for improvement
  }

  private handleGenericError(error: any): void {
    console.group('❌ Application Error');
    console.error('Error:', error);
    
    if (error?.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    console.groupEnd();

    // Log to external service in production
    this.logToService(error);
  }

  private logToService(error: any): void {
    // In production, integrate with logging service like Sentry
    // For now, just console log
    console.log('Logging error to service:', error);
  }

  // Helper method to create constitutional errors
  static createConstitutionalError(
    type: ConstitutionalError['type'],
    message: string,
    context?: string,
    suggestion?: string,
    learnMoreUrl?: string
  ): ConstitutionalError {
    return {
      type,
      message,
      context,
      suggestion,
      learnMoreUrl
    };
  }
}