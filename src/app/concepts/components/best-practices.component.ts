import { Component, Input, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { BestPractice, BestPracticeExample } from '../../shared/models';
import { CodeHighlighterComponent } from '../../shared/components/code-highlighter.component';

@Component({
  selector: 'app-best-practices',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    CodeHighlighterComponent
  ],
  template: `
    <div class="best-practices" [class.constitutional]="practice().constitutional">
      
      <!-- Header -->
      <mat-card class="practice-header">
        <mat-card-header>
          <mat-card-title class="practice-title">
            <mat-icon class="practice-icon">{{ getPracticeIcon() }}</mat-icon>
            {{ practice().title }}
            @if (practice().constitutional) {
              <mat-chip class="constitutional-badge">
                <mat-icon>verified</mat-icon>
                Constitutional
              </mat-chip>
            }
          </mat-card-title>
          <mat-card-subtitle>
            <div class="practice-meta">
              <mat-chip class="category-chip">{{ practice().category }}</mat-chip>
              <mat-chip class="level-chip">{{ practice().level }}</mat-chip>
            </div>
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="practice-description">{{ practice().description }}</p>
        </mat-card-content>
      </mat-card>

      <!-- Examples -->
      @if (practice().examples && practice().examples.length > 0) {
        <mat-card class="practice-examples">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>lightbulb</mat-icon>
              Examples
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-accordion>
              @for (example of practice().examples; track example.title) {
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>{{ example.title }}</mat-panel-title>
                    <mat-panel-description>{{ example.description }}</mat-panel-description>
                  </mat-expansion-panel-header>
                  
                  <div class="example-content">
                    <p class="example-explanation">{{ example.explanation }}</p>
                    
                    <!-- Good Example -->
                    <div class="good-example">
                      <h4>✅ Recommended Approach</h4>
                      <app-code-highlighter 
                        [codeExample]="example.goodExample"
                        [showMetadata]="false">
                      </app-code-highlighter>
                    </div>
                    
                    <!-- Bad Example (if provided) -->
                    @if (example.badExample) {
                      <div class="bad-example">
                        <h4>❌ Avoid This</h4>
                        <app-code-highlighter 
                          [codeExample]="example.badExample"
                          [showMetadata]="false">
                        </app-code-highlighter>
                      </div>
                    }
                    
                    <!-- Benefits -->
                    @if (example.benefits && example.benefits.length > 0) {
                      <div class="example-benefits">
                        <h5>Benefits:</h5>
                        <ul>
                          @for (benefit of example.benefits; track benefit) {
                            <li>{{ benefit }}</li>
                          }
                        </ul>
                      </div>
                    }
                  </div>
                </mat-expansion-panel>
              }
            </mat-accordion>
          </mat-card-content>
        </mat-card>
      }

      <!-- Anti-patterns -->
      @if (practice().antiPatterns && practice().antiPatterns.length > 0) {
        <mat-card class="anti-patterns">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>warning</mat-icon>
              Common Anti-patterns
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-accordion>
              @for (antiPattern of practice().antiPatterns; track antiPattern.title) {
                <mat-expansion-panel class="anti-pattern-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title>{{ antiPattern.title }}</mat-panel-title>
                    <mat-panel-description>{{ antiPattern.description }}</mat-panel-description>
                  </mat-expansion-panel-header>
                  
                  <div class="anti-pattern-content">
                    <!-- Problem Code -->
                    <div class="problem-code">
                      <h4>🚫 Problematic Code</h4>
                      <app-code-highlighter 
                        [codeExample]="antiPattern.problemCode"
                        [showMetadata]="false">
                      </app-code-highlighter>
                    </div>
                    
                    <!-- Solution Code -->
                    <div class="solution-code">
                      <h4>✅ Better Solution</h4>
                      <app-code-highlighter 
                        [codeExample]="antiPattern.solutionCode"
                        [showMetadata]="false">
                      </app-code-highlighter>
                    </div>
                    
                    <!-- Why it's bad -->
                    @if (antiPattern.whyItsBad && antiPattern.whyItsBad.length > 0) {
                      <div class="why-bad">
                        <h5>Why this is problematic:</h5>
                        <ul>
                          @for (reason of antiPattern.whyItsBad; track reason) {
                            <li>{{ reason }}</li>
                          }
                        </ul>
                      </div>
                    }
                    
                    <!-- How to fix -->
                    @if (antiPattern.howToFix && antiPattern.howToFix.length > 0) {
                      <div class="how-to-fix">
                        <h5>How to fix:</h5>
                        <ol>
                          @for (step of antiPattern.howToFix; track step) {
                            <li>{{ step }}</li>
                          }
                        </ol>
                      </div>
                    }
                  </div>
                </mat-expansion-panel>
              }
            </mat-accordion>
          </mat-card-content>
        </mat-card>
      }

      <!-- Checklist -->
      @if (practice().checklist && practice().checklist.length > 0) {
        <mat-card class="practice-checklist">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>checklist</mat-icon>
              Implementation Checklist
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="checklist-items">
              @for (item of practice().checklist; track item.id) {
                <div class="checklist-item" [class.required]="item.required">
                  <mat-icon class="check-icon">
                    {{ item.required ? 'check_circle' : 'check_circle_outline' }}
                  </mat-icon>
                  <div class="check-content">
                    <span class="check-text">{{ item.text }}</span>
                    @if (item.helpText) {
                      <p class="check-help">{{ item.helpText }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Related Practices -->
      @if (practice().relatedPractices && practice().relatedPractices.length > 0) {
        <mat-card class="related-practices">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>link</mat-icon>
              Related Best Practices
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="related-links">
              @for (relatedId of practice().relatedPractices; track relatedId) {
                <a [routerLink]="'/concepts/' + relatedId" class="related-link">
                  {{ formatPracticeName(relatedId) }}
                </a>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Resources -->
      @if (practice().resources && practice().resources.length > 0) {
        <mat-card class="practice-resources">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>library_books</mat-icon>
              Additional Resources
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="resource-links">
              @for (resource of practice().resources; track resource.url) {
                <a [href]="resource.url" 
                   [target]="resource.external ? '_blank' : '_self'"
                   class="resource-link"
                   [class]="'resource-' + resource.type">
                  <mat-icon>{{ getResourceIcon(resource.type) }}</mat-icon>
                  {{ resource.title }}
                  @if (resource.external) {
                    <mat-icon class="external-icon">open_in_new</mat-icon>
                  }
                </a>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styleUrls: ['./best-practices.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BestPracticesComponent implements OnInit {
  @Input() bestPractice!: BestPractice;

  readonly practice = signal<BestPractice>({
    id: '',
    title: '',
    description: '',
    category: 'architecture',
    level: 'fundamentals',
    constitutional: false,
    examples: [],
    antiPatterns: [],
    relatedPractices: [],
    checklist: [],
    resources: []
  });

  ngOnInit(): void {
    if (this.bestPractice) {
      this.practice.set(this.bestPractice);
    }
  }

  getPracticeIcon(): string {
    const iconMap: { [key: string]: string } = {
      'performance': 'speed',
      'maintainability': 'build',
      'accessibility': 'accessibility',
      'security': 'security',
      'testing': 'bug_report',
      'architecture': 'account_tree'
    };
    
    return iconMap[this.practice().category] || 'star';
  }

  getResourceIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'documentation': 'description',
      'article': 'article',
      'video': 'play_circle',
      'tutorial': 'school',
      'reference': 'book'
    };
    
    return iconMap[type] || 'link';
  }

  formatPracticeName(practiceId: string): string {
    return practiceId.replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }
}