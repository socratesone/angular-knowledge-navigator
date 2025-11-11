import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContentService, ContentState, LoadingStatus } from '../../core/services/content.service';

@Component({
  selector: 'app-content-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="content-viewer">
      @if (contentState().loadingStatus === LoadingStatus.Loading) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading content...</p>
        </div>
      }
      
      @if (contentState().loadingStatus === LoadingStatus.Loaded) {
        <mat-card class="content-card">
          <mat-card-header>
            <mat-card-title>{{ getTopicTitle() }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div 
              class="markdown-content" 
              [innerHTML]="contentState().renderedHtml"
            ></div>
          </mat-card-content>
        </mat-card>
      }
      
      @if (contentState().loadingStatus === LoadingStatus.Error) {
        <mat-card class="error-card">
          <mat-card-header>
            <mat-card-title>Content Error</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div [innerHTML]="contentState().renderedHtml"></div>
          </mat-card-content>
        </mat-card>
      }
      
      @if (contentState().loadingStatus === LoadingStatus.Idle) {
        <mat-card class="welcome-card">
          <mat-card-header>
            <mat-card-title>Welcome to Angular Knowledge Navigator</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Select a topic from the navigation to begin your Angular learning journey.</p>
            <p>This application demonstrates Angular best practices including:</p>
            <ul>
              <li>Standalone components with explicit imports</li>
              <li>OnPush change detection strategy</li>
              <li>Angular Signals for reactive state management</li>
              <li>Constitutional compliance with Angular best practices</li>
            </ul>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styleUrls: ['./content-viewer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentViewerComponent implements OnInit {
  
  // Expose LoadingStatus enum to template
  readonly LoadingStatus = LoadingStatus;
  
  // Reactive state
  readonly contentState = signal<ContentState>({
    topicId: '',
    markdown: '',
    renderedHtml: '',
    loadingStatus: LoadingStatus.Idle,
    lastLoaded: new Date(),
    scrollPosition: 0
  });

  constructor(
    private route: ActivatedRoute,
    private contentService: ContentService
  ) {}

  ngOnInit(): void {
    // Subscribe to content changes
    this.contentService.currentContent$.subscribe(state => {
      this.contentState.set(state);
    });

    // Listen to route changes
    this.route.params.subscribe(params => {
      const level = params['level'];
      const topicId = params['topicId'];
      
      if (level && topicId) {
        const fullTopicId = `${level}/${topicId}`;
        this.loadContent(fullTopicId);
      }
    });
  }

  private loadContent(topicId: string): void {
    this.contentService.loadContent(topicId).subscribe({
      next: (state) => {
        console.log('Content loaded:', state);
      },
      error: (error) => {
        console.error('Failed to load content:', error);
      }
    });
  }

  getTopicTitle(): string {
    const state = this.contentState();
    return state.topicId 
      ? state.topicId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Angular Concept';
  }
}