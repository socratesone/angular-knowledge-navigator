import { Component, Input, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Caveat } from '../../shared/models';
import { CodeHighlighterComponent } from '../../shared/components/code-highlighter.component';

@Component({
  selector: 'app-caveats',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    CodeHighlighterComponent
  ],
  template: `
    <div class="caveats-container">
      @for (caveat of caveats(); track caveat.id) {
        <mat-card class="caveat-card" [class]="'severity-' + caveat.severity">
          
          <mat-card-header>
            <mat-card-title class="caveat-title">
              <mat-icon class="severity-icon">{{ getSeverityIcon(caveat.severity) }}</mat-icon>
              {{ caveat.title }}
            </mat-card-title>
            <mat-card-subtitle>
              <div class="caveat-meta">
                <mat-chip class="severity-chip" [class]="'severity-' + caveat.severity">
                  {{ caveat.severity.toUpperCase() }}
                </mat-chip>
                <mat-chip class="category-chip">{{ caveat.category }}</mat-chip>
                @if (caveat.affectedVersions && caveat.affectedVersions.length > 0) {
                  <mat-chip class="version-chip">
                    {{ formatVersions(caveat.affectedVersions) }}
                  </mat-chip>
                }
              </div>
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            
            <!-- Description -->
            <div class="caveat-description">
              <p>{{ caveat.description }}</p>
            </div>

            <!-- Example code (if provided) -->
            @if (caveat.example) {
              <div class="caveat-example">
                <h4>Example:</h4>
                <app-code-highlighter 
                  [codeExample]="caveat.example"
                  [showMetadata]="false">
                </app-code-highlighter>
              </div>
            }

            <!-- Workaround (if provided) -->
            @if (caveat.workaround) {
              <div class="caveat-workaround">
                <h4>
                  <mat-icon>build</mat-icon>
                  Workaround
                </h4>
                <p>{{ caveat.workaround }}</p>
              </div>
            }

            <!-- Related concepts -->
            @if (caveat.relatedConcepts && caveat.relatedConcepts.length > 0) {
              <div class="related-concepts">
                <h4>
                  <mat-icon>link</mat-icon>
                  Related Concepts
                </h4>
                <div class="concept-links">
                  @for (concept of caveat.relatedConcepts; track concept) {
                    <a [routerLink]="'/concepts/' + concept" class="concept-link">
                      {{ formatConceptName(concept) }}
                    </a>
                  }
                </div>
              </div>
            }

          </mat-card-content>

        </mat-card>
      }

      <!-- Summary section if multiple caveats -->
      @if (caveats().length > 1) {
        <mat-card class="caveats-summary">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>summarize</mat-icon>
              Summary
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="severity-breakdown">
              <div class="breakdown-item" 
                   *ngFor="let item of getSeverityBreakdown()" 
                   [class]="'severity-' + item.severity">
                <mat-icon>{{ getSeverityIcon(item.severity) }}</mat-icon>
                <span class="severity-label">{{ item.severity }}</span>
                <span class="severity-count">{{ item.count }}</span>
              </div>
            </div>
            
            <div class="key-reminders">
              <h5>Key Reminders:</h5>
              <ul>
                @for (caveat of getHighPriorityCaveats(); track caveat.id) {
                  <li>{{ caveat.title }}</li>
                }
              </ul>
            </div>
          </mat-card-content>
        </mat-card>
      }

    </div>
  `,
  styleUrls: ['./caveats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CaveatsComponent implements OnInit {
  @Input() caveatList: Caveat[] = [];

  readonly caveats = signal<Caveat[]>([]);

  ngOnInit(): void {
    if (this.caveatList && this.caveatList.length > 0) {
      // Sort caveats by severity (critical first)
      const sortedCaveats = [...this.caveatList].sort((a, b) => {
        const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
      this.caveats.set(sortedCaveats);
    }
  }

  getSeverityIcon(severity: string): string {
    const iconMap: { [key: string]: string } = {
      'critical': 'error',
      'high': 'warning',
      'medium': 'info',
      'low': 'help'
    };
    return iconMap[severity] || 'help';
  }

  formatVersions(versions: string[]): string {
    if (versions.length === 1) {
      return `v${versions[0]}`;
    } else if (versions.length === 2) {
      return `v${versions[0]} - v${versions[1]}`;
    } else {
      return `v${versions[0]}+`;
    }
  }

  formatConceptName(concept: string): string {
    return concept.replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  getSeverityBreakdown(): Array<{ severity: string; count: number }> {
    const breakdown = this.caveats().reduce((acc, caveat) => {
      acc[caveat.severity] = (acc[caveat.severity] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(breakdown).map(([severity, count]) => ({
      severity,
      count
    }));
  }

  getHighPriorityCaveats(): Caveat[] {
    return this.caveats().filter(caveat => 
      caveat.severity === 'critical' || caveat.severity === 'high'
    );
  }
}