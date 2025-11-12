import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BreakpointService } from './breakpoint.service';

export interface ClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  duration?: number;
  showNotification?: boolean;
  format?: 'plain' | 'html' | 'markdown';
}

export interface ClipboardResult {
  success: boolean;
  error?: string;
  method: 'modern' | 'legacy' | 'fallback';
}

@Injectable({
  providedIn: 'root'
})
export class ClipboardService {
  private snackBar = inject(MatSnackBar);
  private breakpointService = inject(BreakpointService);

  /**
   * Copy text to clipboard with multiple fallback methods
   */
  async copyToClipboard(
    text: string, 
    options: ClipboardOptions = {}
  ): Promise<ClipboardResult> {
    const config = {
      successMessage: 'Copied to clipboard!',
      errorMessage: 'Failed to copy to clipboard',
      duration: 2000,
      showNotification: true,
      format: 'plain' as const,
      ...options
    };

    try {
      // Method 1: Modern Clipboard API (preferred)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        
        if (config.showNotification) {
          this.showSuccessNotification(config.successMessage, config.duration);
        }
        
        return { success: true, method: 'modern' };
      }

      // Method 2: Legacy execCommand (fallback for older browsers)
      const result = this.legacyCopyToClipboard(text);
      
      if (result.success && config.showNotification) {
        this.showSuccessNotification(config.successMessage, config.duration);
      } else if (!result.success && config.showNotification) {
        this.showErrorNotification(config.errorMessage, config.duration);
      }
      
      return result;
      
    } catch (error) {
      console.error('Clipboard operation failed:', error);
      
      // Method 3: Fallback - create text selection
      const fallbackResult = this.fallbackCopyToClipboard(text);
      
      if (config.showNotification) {
        if (fallbackResult.success) {
          this.showSuccessNotification(config.successMessage, config.duration);
        } else {
          this.showErrorNotification(config.errorMessage, config.duration);
        }
      }
      
      return fallbackResult;
    }
  }

  /**
   * Copy code block with formatted content
   */
  async copyCodeBlock(
    code: string, 
    language?: string, 
    fileName?: string,
    options: ClipboardOptions = {}
  ): Promise<ClipboardResult> {
    let formattedText = code;
    
    // Add file header if filename provided
    if (fileName) {
      formattedText = `// File: ${fileName}\n${code}`;
    }
    
    // Add language comment if specified
    if (language && language !== 'text') {
      const languageComment = this.getLanguageComment(language);
      formattedText = `${languageComment} Language: ${language}\n${formattedText}`;
    }
    
    const config = {
      successMessage: `Code copied to clipboard!${fileName ? ` (${fileName})` : ''}`,
      ...options
    };
    
    return this.copyToClipboard(formattedText, config);
  }

  /**
   * Check if clipboard API is available
   */
  isClipboardSupported(): boolean {
    return !!(navigator.clipboard || document.execCommand);
  }

  /**
   * Get appropriate notification position based on screen size
   */
  private getNotificationPosition(): { horizontalPosition: 'start' | 'center' | 'end', verticalPosition: 'top' | 'bottom' } {
    if (this.breakpointService.isMobile()) {
      return {
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      };
    }
    
    return {
      horizontalPosition: 'end',
      verticalPosition: 'top'
    };
  }

  /**
   * Show success notification
   */
  private showSuccessNotification(message: string, duration: number): void {
    const position = this.getNotificationPosition();
    
    this.snackBar.open(message, 'Close', {
      duration,
      ...position,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error notification
   */
  private showErrorNotification(message: string, duration: number): void {
    const position = this.getNotificationPosition();
    
    this.snackBar.open(message, 'Close', {
      duration: duration * 1.5, // Show errors longer
      ...position,
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Legacy clipboard copy using execCommand
   */
  private legacyCopyToClipboard(text: string): ClipboardResult {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      return { 
        success: successful, 
        method: 'legacy',
        error: successful ? undefined : 'execCommand failed'
      };
    } catch (error) {
      return { 
        success: false, 
        method: 'legacy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fallback method - create selection for manual copy
   */
  private fallbackCopyToClipboard(text: string): ClipboardResult {
    try {
      // Create a temporary element with the text
      const tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.left = '-999999px';
      tempElement.style.whiteSpace = 'pre-wrap';
      tempElement.textContent = text;
      document.body.appendChild(tempElement);

      // Create selection
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(tempElement);
      selection?.removeAllRanges();
      selection?.addRange(range);

      // Attempt copy
      const successful = document.execCommand('copy');
      
      // Cleanup
      selection?.removeAllRanges();
      document.body.removeChild(tempElement);

      return { 
        success: successful, 
        method: 'fallback',
        error: successful ? undefined : 'Fallback method failed'
      };
    } catch (error) {
      return { 
        success: false, 
        method: 'fallback',
        error: error instanceof Error ? error.message : 'Fallback failed'
      };
    }
  }

  /**
   * Get language-appropriate comment syntax
   */
  private getLanguageComment(language: string): string {
    const commentMap: Record<string, string> = {
      'typescript': '//',
      'javascript': '//',
      'css': '/*',
      'scss': '//',
      'html': '<!--',
      'json': '//',
      'bash': '#',
      'markdown': '<!--'
    };
    
    return commentMap[language] || '//';
  }
}