import { Component, Input, ChangeDetectionStrategy, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { CodeExample, CodeSnippet } from '../../shared/models';
import { ClipboardService } from '../../core/services/clipboard.service';

@Component({
  selector: 'app-code-highlighter',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule
  ],
  template: `
    <div class="code-highlighter" [class.best-practice]="example().bestPractice" [class.constitutional]="example().constitutional">
      
      <!-- Header with title and actions -->
      <div class="code-header">
        <div class="code-info">
          <h4 class="code-title">{{ example().title }}</h4>
          <div class="code-tags">
            <mat-chip class="language-chip">{{ example().language.toUpperCase() }}</mat-chip>
            @if (example().bestPractice) {
              <mat-chip class="best-practice-chip">
                <mat-icon>thumb_up</mat-icon>
                Best Practice
              </mat-chip>
            }
            @if (example().constitutional) {
              <mat-chip class="constitutional-chip">
                <mat-icon>verified</mat-icon>
                Constitutional
              </mat-chip>
            }
            @if (example().difficulty) {
              <mat-chip class="difficulty-chip">
                Level {{ example().difficulty }}
              </mat-chip>
            }
          </div>
        </div>
        
        <div class="code-actions">
          <button mat-icon-button 
                  (click)="copyCode()" 
                  matTooltip="Copy code"
                  class="copy-button">
            <mat-icon>{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
          </button>
          @if (showExpand()) {
            <button mat-icon-button 
                    (click)="toggleExpanded()" 
                    [matTooltip]="expanded() ? 'Collapse' : 'Expand'"
                    class="expand-button">
              <mat-icon>{{ expanded() ? 'unfold_less' : 'unfold_more' }}</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Description -->
      @if (example().description) {
        <div class="code-description">
          <p>{{ example().description }}</p>
        </div>
      }

      <!-- Code block -->
      <div class="code-container" [class.expanded]="expanded()">
        <pre #codeElement class="code-block"><code [class]="'language-' + example().language">{{ example().code }}</code></pre>
        
        @if (!expanded() && isTruncated()) {
          <div class="code-gradient"></div>
        }
      </div>

      <!-- Explanation -->
      @if (example().explanation && showExplanation()) {
        <div class="code-explanation">
          <h5>Explanation</h5>
          <p>{{ example().explanation }}</p>
        </div>
      }

      <!-- Output -->
      @if (example().output && showOutput()) {
        <div class="code-output">
          <h5>Output</h5>
          <pre class="output-block">{{ example().output }}</pre>
        </div>
      }

      <!-- Caveats -->
      @if (showCaveats()) {
        <div class="code-caveats">
          <h5>⚠️ Caveats</h5>
          <ul>
            @for (caveat of example().caveats || []; track caveat) {
              <li>{{ caveat }}</li>
            }
          </ul>
        </div>
      }

      <!-- Related concepts -->
      @if (example().relatedConcepts && example().relatedConcepts.length > 0) {
        <div class="related-concepts">
          <h5>Related Concepts</h5>
          <div class="concept-links">
            @for (concept of example().relatedConcepts; track concept) {
              <a [routerLink]="'/concepts/' + concept" class="concept-link">
                {{ formatConceptName(concept) }}
              </a>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrls: ['./code-highlighter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodeHighlighterComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() codeExample!: CodeExample;
  @Input() maxLines: number = 20;
  @Input() showMetadata: boolean = true;
  @Input() allowExpansion: boolean = true;
  @Input() autoHighlight: boolean = true;

  @ViewChild('codeElement', { static: false }) codeElement?: ElementRef<HTMLPreElement>;

  // Reactive state
  readonly example = signal<CodeExample>({
    id: '',
    title: '',
    description: '',
    language: 'typescript',
    code: '',
    explanation: '',
    bestPractice: false,
    constitutional: false,
    difficulty: 1,
    tags: [],
    relatedConcepts: [],
    prerequisites: [],
    category: 'component'
  });

  readonly expanded = signal<boolean>(false);
  readonly copied = signal<boolean>(false);
  readonly highlighted = signal<boolean>(false);

  private copyTimeout?: number;
  private clipboardService = inject(ClipboardService);

  ngOnInit(): void {
    if (this.codeExample) {
      this.example.set(this.codeExample);
    }
  }

  ngAfterViewInit(): void {
    if (this.autoHighlight) {
      this.highlightCode();
    }
  }

  ngOnDestroy(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }

  async copyCode(): Promise<void> {
    const example = this.example();
    this.copied.set(true);
    
    const result = await this.clipboardService.copyCodeBlock(
      example.code,
      example.language,
      undefined, // fileName not available in CodeExample interface
      {
        successMessage: `Code copied!${example.title ? ` (${example.title})` : ''}`,
        errorMessage: 'Failed to copy code',
        duration: 2000
      }
    );
    
    // Reset copied state
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
    
    this.copyTimeout = window.setTimeout(() => {
      this.copied.set(false);
    }, result.success ? 2000 : 3000);
    
    if (!result.success) {
      console.warn('Copy failed:', result.error, 'Method:', result.method);
    }
  }

  toggleExpanded(): void {
    this.expanded.set(!this.expanded());
  }

  showExpand(): boolean {
    return this.allowExpansion && this.isTruncated();
  }

  isTruncated(): boolean {
    const lines = this.example().code.split('\n');
    return lines.length > this.maxLines;
  }

  showExplanation(): boolean {
    return this.showMetadata && !!this.example().explanation;
  }

  showOutput(): boolean {
    return this.showMetadata && !!this.example().output;
  }

  showCaveats(): boolean {
    const caveats = this.example().caveats;
    return this.showMetadata && !!(caveats && caveats.length > 0);
  }

  formatConceptName(concept: string): string {
    return concept.replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  private highlightCode(): void {
    if (this.codeElement?.nativeElement) {
      // Integration with Prism.js would happen here
      // For now, we'll mark as highlighted
      this.highlighted.set(true);
      
      // Add language class for CSS styling
      const codeElement = this.codeElement.nativeElement.querySelector('code');
      if (codeElement) {
        codeElement.className = `language-${this.example().language}`;
      }
    }
  }
}