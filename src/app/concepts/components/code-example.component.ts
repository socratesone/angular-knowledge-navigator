import { Component, ChangeDetectionStrategy, Input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { CodeBlock } from '../../core/services/markdown-processor.service';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { ClipboardService } from '../../core/services/clipboard.service';

@Component({
  selector: 'app-code-example',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatChipsModule,
    MatExpansionModule
  ],
  template: `
    <div class="code-example" 
         [class.mobile-layout]="breakpointService.isMobile()"
         [class.collapsible]="codeBlock().isCollapsible"
         [attr.data-language]="codeBlock().language"
         [attr.data-code-id]="codeBlock().id">
      
      <!-- Header with metadata and actions -->
      <div class="code-header" *ngIf="hasHeader()">
        <div class="code-meta">
          <!-- Title and filename -->
          <div class="code-identity" *ngIf="codeBlock().title || codeBlock().fileName">
            <h4 class="code-title" *ngIf="codeBlock().title">{{ codeBlock().title }}</h4>
            <span class="code-filename" *ngIf="codeBlock().fileName">
              <mat-icon>description</mat-icon>
              {{ codeBlock().fileName }}
            </span>
          </div>
          
          <!-- Language and category badges -->
          <div class="code-badges">
            <mat-chip class="language-chip">{{ getDisplayLanguage() }}</mat-chip>
            <mat-chip class="category-chip" *ngIf="codeBlock().category">
              {{ codeBlock().category }}
            </mat-chip>
            <mat-chip class="line-count-chip" *ngIf="showLineCount()">
              {{ codeBlock().lineCount }} lines
            </mat-chip>
          </div>
        </div>
        
        <!-- Action buttons -->
        <div class="code-actions">
          <button 
            mat-icon-button
            (click)="copyToClipboard()"
            [disabled]="copying()"
            matTooltip="Copy to clipboard"
            class="copy-button">
            <mat-icon>{{ copying() ? 'check' : 'content_copy' }}</mat-icon>
          </button>
          
          <button 
            mat-icon-button
            (click)="toggleExpanded()"
            *ngIf="codeBlock().isCollapsible"
            [matTooltip]="expanded() ? 'Collapse' : 'Expand'"
            class="expand-button">
            <mat-icon>{{ expanded() ? 'unfold_less' : 'unfold_more' }}</mat-icon>
          </button>
          
          <button 
            mat-icon-button
            (click)="toggleLineNumbers()"
            [matTooltip]="showLineNumbers() ? 'Hide line numbers' : 'Show line numbers'"
            class="line-numbers-button">
            <mat-icon>{{ showLineNumbers() ? 'format_list_numbered_rtl' : 'format_list_numbered' }}</mat-icon>
          </button>
        </div>
      </div>
      
      <!-- Tags section -->
      <div class="code-tags" *ngIf="codeBlock().tags && codeBlock().tags.length > 0">
        <mat-chip-set>
          <mat-chip *ngFor="let tag of codeBlock().tags; trackBy: trackByTag">
            {{ tag }}
          </mat-chip>
        </mat-chip-set>
      </div>
      
      <!-- Code content container -->
      <div class="code-container" 
           [class.expanded]="expanded()"
           [class.with-line-numbers]="showLineNumbers()">
        
        <!-- Line numbers column -->
        <div class="line-numbers-column" *ngIf="showLineNumbers()">
          <div class="line-number" 
               *ngFor="let line of getLineNumbers(); trackBy: trackByLineNumber"
               [class.highlighted]="isLineHighlighted(line)">
            {{ line }}
          </div>
        </div>
        
        <!-- Code content -->
        <div class="code-content">
          <pre class="language-{{ getDisplayLanguage() }}"><code 
            class="language-{{ getDisplayLanguage() }}"
            [innerHTML]="getHighlightedCode()"></code></pre>
        </div>
      </div>
      
      <!-- Collapse overlay for long code blocks -->
      <div class="collapse-overlay" 
           *ngIf="codeBlock().isCollapsible && !expanded()"
           (click)="toggleExpanded()">
        <div class="collapse-message">
          <mat-icon>unfold_more</mat-icon>
          <span>Click to expand {{ codeBlock().lineCount - 10 }} more lines</span>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./code-example.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeExampleComponent {
  @Input({ required: true }) codeBlockData!: CodeBlock;
  
  // Services
  private clipboardService = inject(ClipboardService);
  readonly breakpointService = inject(BreakpointService);
  
  // Component state
  readonly expanded = signal<boolean>(false);
  readonly copying = signal<boolean>(false);
  readonly showLineNumbers = signal<boolean>(false);
  
  // Computed properties
  readonly codeBlock = computed(() => this.codeBlockData);
  
  /**
   * Initialize component with default state
   */
  ngOnInit(): void {
    // Set initial line numbers visibility based on code block settings
    this.showLineNumbers.set(this.codeBlock().showLineNumbers ?? false);
    
    // Auto-expand short code blocks
    if (this.codeBlock().lineCount <= 15 && !this.codeBlock().isCollapsible) {
      this.expanded.set(true);
    }
  }
  
  /**
   * Check if header should be displayed
   */
  hasHeader(): boolean {
    const block = this.codeBlock();
    return !!(block.title || block.fileName || block.category || block.tags?.length);
  }
  
  /**
   * Get display name for the programming language
   */
  getDisplayLanguage(): string {
    const lang = this.codeBlock().detectedLanguage || this.codeBlock().language;
    const languageMap: Record<string, string> = {
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'bash': 'Bash',
      'markdown': 'Markdown',
      'text': 'Text'
    };
    
    return languageMap[lang] || lang.toUpperCase();
  }
  
  /**
   * Check if line count should be shown
   */
  showLineCount(): boolean {
    return this.codeBlock().lineCount > 5;
  }
  
  /**
   * Get array of line numbers for display
   */
  getLineNumbers(): number[] {
    const startLine = this.codeBlock().startLine || 1;
    const lineCount = this.expanded() ? 
      this.codeBlock().lineCount : 
      Math.min(this.codeBlock().lineCount, 10);
    
    return Array.from({ length: lineCount }, (_, i) => startLine + i);
  }
  
  /**
   * Check if a line should be highlighted
   */
  isLineHighlighted(lineNumber: number): boolean {
    return this.codeBlock().highlightLines?.includes(lineNumber) ?? false;
  }
  
  /**
   * Get syntax-highlighted code HTML
   */
  getHighlightedCode(): string {
    // For now, return the raw code - this will be enhanced with Prism.js
    // The actual highlighting will be done by the MarkdownProcessorService
    let code = this.codeBlock().code;
    
    // If collapsed, show only first 10 lines
    if (this.codeBlock().isCollapsible && !this.expanded()) {
      const lines = code.split('\n');
      code = lines.slice(0, 10).join('\n');
      if (lines.length > 10) {
        code += '\n// ... more code';
      }
    }
    
    return this.escapeHtml(code);
  }
  
  /**
   * Toggle expanded state
   */
  toggleExpanded(): void {
    this.expanded.update(expanded => !expanded);
  }
  
  /**
   * Toggle line numbers visibility
   */
  toggleLineNumbers(): void {
    this.showLineNumbers.update(show => !show);
  }
  
  /**
   * Copy code to clipboard using enhanced clipboard service
   */
  async copyToClipboard(): Promise<void> {
    this.copying.set(true);
    
    const block = this.codeBlock();
    const result = await this.clipboardService.copyCodeBlock(
      block.code,
      block.language,
      block.fileName,
      {
        successMessage: `Code copied!${block.title ? ` (${block.title})` : ''}`,
        errorMessage: 'Failed to copy code. Please try selecting and copying manually.',
        duration: 2000
      }
    );
    
    // Reset copy state after feedback
    setTimeout(() => this.copying.set(false), result.success ? 1000 : 2000);
    
    // Log result for debugging
    if (!result.success) {
      console.warn('Clipboard operation failed:', result.error, 'Method:', result.method);
    }
  }
  
  /**
   * Track function for tags
   */
  trackByTag(index: number, tag: string): string {
    return tag;
  }
  
  /**
   * Track function for line numbers
   */
  trackByLineNumber(index: number, lineNumber: number): number {
    return lineNumber;
  }
  
  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}