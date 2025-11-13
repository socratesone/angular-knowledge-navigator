import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { CodePlaygroundService, PlaygroundSession, PlaygroundTemplate } from '../../core/services/code-playground.service';
import { BreakpointService } from '../../core/services/breakpoint.service';

@Component({
  selector: 'app-code-playground',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    MatChipsModule,
    MatDialogModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <div class="code-playground" [class.mobile-layout]="breakpointService.isMobile()">
      
      <!-- Header -->
      <div class="playground-header">
        <div class="header-content">
          <h1>
            <mat-icon>code</mat-icon>
            Code Playground
          </h1>
          <p>Interactive Angular code experimentation environment</p>
        </div>
        
        <div class="header-actions">
          <button 
            mat-raised-button
            color="primary"
            [matMenuTriggerFor]="templatesMenu">
            <mat-icon>add</mat-icon>
            New from Template
          </button>
          
          <mat-menu #templatesMenu="matMenu">
            <button 
              mat-menu-item
              *ngFor="let template of playgroundService.templates(); trackBy: trackByTemplate"
              (click)="createFromTemplate(template)">
              <mat-icon>{{ getTemplateIcon(template.category) }}</mat-icon>
              <span>{{ template.name }}</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="createBlankSession()">
              <mat-icon>insert_drive_file</mat-icon>
              <span>Blank Session</span>
            </button>
          </mat-menu>
          
          <button 
            mat-stroked-button
            [matMenuTriggerFor]="sessionMenu"
            [disabled]="!playgroundService.hasCurrentSession()">
            <mat-icon>more_vert</mat-icon>
            Session
          </button>
          
          <mat-menu #sessionMenu="matMenu">
            <button mat-menu-item (click)="saveSession()" [disabled]="!hasChanges()">
              <mat-icon>save</mat-icon>
              Save
            </button>
            <button mat-menu-item (click)="exportSession()">
              <mat-icon>download</mat-icon>
              Export
            </button>
            <button mat-menu-item (click)="shareSession()">
              <mat-icon>share</mat-icon>
              Share
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item (click)="importSession()">
              <mat-icon>upload</mat-icon>
              Import
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- No Session State -->
      <div class="no-session-state" *ngIf="!playgroundService.hasCurrentSession()">
        <mat-icon>code</mat-icon>
        <h2>Welcome to Code Playground</h2>
        <p>Create a new session or select a template to start coding</p>
        
        <div class="template-grid">
          <mat-card 
            *ngFor="let template of playgroundService.templates(); trackBy: trackByTemplate"
            class="template-card"
            (click)="createFromTemplate(template)">
            
            <mat-card-header>
              <mat-icon mat-card-avatar>{{ getTemplateIcon(template.category) }}</mat-icon>
              <mat-card-title>{{ template.name }}</mat-card-title>
              <mat-card-subtitle>{{ template.description }}</mat-card-subtitle>
            </mat-card-header>
            
            <mat-card-content>
              <div class="template-meta">
                <mat-chip>{{ template.language.toUpperCase() }}</mat-chip>
                <mat-chip>{{ getDifficultyLabel(template.difficulty) }}</mat-chip>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Main Playground Interface -->
      <div class="playground-interface" *ngIf="playgroundService.hasCurrentSession()">
        
        <!-- Session Info -->
        <div class="session-info">
          <mat-form-field appearance="outline" class="session-title">
            <mat-label>Session Title</mat-label>
            <input 
              matInput
              [(ngModel)]="sessionTitle"
              (ngModelChange)="updateSessionTitle($event)">
          </mat-form-field>
          
          <div class="session-meta">
            <mat-chip>{{ currentSession()?.language.toUpperCase() }}</mat-chip>
            <span class="last-modified">
              Modified: {{ getRelativeTime(currentSession()?.lastModified!) }}
            </span>
          </div>
        </div>

        <!-- Code Editor and Output -->
        <div class="editor-container">
          
          <!-- Left Panel: Code Editor -->
          <div class="editor-panel">
            <div class="editor-header">
              <h3>
                <mat-icon>edit_note</mat-icon>
                Code Editor
              </h3>
              
              <div class="editor-actions">
                <button 
                  mat-icon-button
                  (click)="formatCode()"
                  matTooltip="Format Code">
                  <mat-icon>auto_fix_high</mat-icon>
                </button>
                
                <button 
                  mat-icon-button
                  (click)="toggleFullscreen()"
                  matTooltip="Toggle Fullscreen">
                  <mat-icon>{{ isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
                </button>
              </div>
            </div>
            
            <div class="code-editor" [class.fullscreen]="isFullscreen()">
              <textarea 
                #codeEditor
                [(ngModel)]="codeContent"
                (ngModelChange)="updateCode($event)"
                class="code-textarea"
                placeholder="Start coding here..."
                spellcheck="false"></textarea>
            </div>
            
            <!-- Dependencies -->
            <div class="dependencies-section" *ngIf="currentSession()?.dependencies.length">
              <h4>Dependencies:</h4>
              <mat-chip-set>
                <mat-chip 
                  *ngFor="let dep of currentSession()?.dependencies; trackBy: trackByString">
                  {{ dep }}
                </mat-chip>
              </mat-chip-set>
            </div>
          </div>

          <!-- Right Panel: Output and Controls -->
          <div class="output-panel">
            
            <!-- Execution Controls -->
            <div class="execution-controls">
              <button 
                mat-raised-button
                color="primary"
                (click)="executeCode()"
                [disabled]="!playgroundService.canExecute() || playgroundService.isExecuting()">
                <mat-icon *ngIf="!playgroundService.isExecuting()">play_arrow</mat-icon>
                <mat-progress-spinner 
                  *ngIf="playgroundService.isExecuting()"
                  [diameter]="20"
                  mode="indeterminate">
                </mat-progress-spinner>
                {{ playgroundService.isExecuting() ? 'Executing...' : 'Run Code' }}
              </button>
              
              <button 
                mat-stroked-button
                (click)="clearOutput()"
                [disabled]="!playgroundService.executionOutput()">
                <mat-icon>clear_all</mat-icon>
                Clear
              </button>
            </div>

            <!-- Output Display -->
            <div class="output-display">
              <div class="output-header">
                <h3>
                  <mat-icon>terminal</mat-icon>
                  Output
                </h3>
              </div>
              
              <!-- No Output State -->
              <div class="no-output" *ngIf="!playgroundService.executionOutput()">
                <mat-icon>play_circle_outline</mat-icon>
                <p>Run your code to see the output here</p>
              </div>
              
              <!-- Output Content -->
              <div class="output-content" *ngIf="playgroundService.executionOutput() as output">
                <div class="output-status" [class]="'status-' + output.type">
                  <mat-icon>{{ getOutputIcon(output.type) }}</mat-icon>
                  <span>{{ getOutputStatusText(output.type) }}</span>
                  <span class="execution-time" *ngIf="output.executionTime">
                    ({{ output.executionTime }}ms)
                  </span>
                </div>
                
                <div class="output-text">
                  <pre>{{ output.content }}</pre>
                </div>
                
                <!-- Compile Errors -->
                <div class="compile-errors" *ngIf="output.compileErrors?.length">
                  <h4>Compilation Errors:</h4>
                  <div 
                    *ngFor="let error of output.compileErrors; trackBy: trackByError"
                    class="error-item"
                    [class]="'severity-' + error.severity">
                    <mat-icon>{{ getErrorIcon(error.severity) }}</mat-icon>
                    <div class="error-details">
                      <div class="error-location">Line {{ error.line }}, Column {{ error.column }}</div>
                      <div class="error-message">{{ error.message }}</div>
                    </div>
                  </div>
                </div>
                
                <!-- Performance Metrics -->
                <div class="performance-metrics" *ngIf="output.memoryUsage">
                  <h4>Performance:</h4>
                  <div class="metrics-grid">
                    <div class="metric">
                      <mat-icon>memory</mat-icon>
                      <span>Memory: {{ output.memoryUsage }}KB</span>
                    </div>
                    <div class="metric" *ngIf="output.executionTime">
                      <mat-icon>schedule</mat-icon>
                      <span>Execution: {{ output.executionTime }}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sessions Sidebar (Mobile: Bottom Sheet) -->
      <div class="sessions-sidebar" *ngIf="showSessionsList()">
        <div class="sidebar-header">
          <h3>Sessions</h3>
          <button 
            mat-icon-button
            (click)="toggleSessionsList()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <mat-list class="sessions-list">
          <mat-list-item 
            *ngFor="let session of playgroundService.sessions(); trackBy: trackBySession"
            (click)="loadSession(session.id)"
            [class.active]="session.id === currentSession()?.id">
            
            <mat-icon matListItemIcon>{{ getLanguageIcon(session.language) }}</mat-icon>
            
            <div matListItemTitle>{{ session.title }}</div>
            <div matListItemLine>{{ getRelativeTime(session.lastModified) }}</div>
            
            <button 
              mat-icon-button
              matListItemMeta
              [matMenuTriggerFor]="sessionActionsMenu"
              (click)="$event.stopPropagation()">
              <mat-icon>more_vert</mat-icon>
            </button>
            
            <mat-menu #sessionActionsMenu="matMenu">
              <button mat-menu-item (click)="renameSession(session.id)">
                <mat-icon>edit</mat-icon>
                Rename
              </button>
              <button mat-menu-item (click)="duplicateSession(session.id)">
                <mat-icon>content_copy</mat-icon>
                Duplicate
              </button>
              <button mat-menu-item (click)="deleteSession(session.id)">
                <mat-icon>delete</mat-icon>
                Delete
              </button>
            </mat-menu>
          </mat-list-item>
        </mat-list>
      </div>

      <!-- Sessions Toggle Button -->
      <button 
        mat-fab
        class="sessions-toggle"
        (click)="toggleSessionsList()"
        matTooltip="Toggle Sessions List">
        <mat-icon>list</mat-icon>
      </button>

      <!-- Hidden file input for import -->
      <input 
        #fileInput
        type="file"
        accept=".json"
        style="display: none"
        (change)="onFileSelected($event)">
    </div>
  `,
  styleUrls: ['./code-playground.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodePlaygroundComponent implements OnInit {
  readonly playgroundService = inject(CodePlaygroundService);
  readonly breakpointService = inject(BreakpointService);
  private dialog = inject(MatDialog);

  @ViewChild('codeEditor') codeEditorRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  // Component state
  sessionTitle = '';
  codeContent = '';
  readonly isFullscreen = signal<boolean>(false);
  readonly showSessionsList = signal<boolean>(false);

  // Computed properties
  readonly currentSession = this.playgroundService.currentSession;
  readonly hasChanges = computed(() => {
    const session = this.currentSession();
    return session && (
      session.title !== this.sessionTitle ||
      session.code !== this.codeContent
    );
  });

  ngOnInit(): void {
    // Load current session data
    const session = this.currentSession();
    if (session) {
      this.sessionTitle = session.title;
      this.codeContent = session.code;
    }
  }

  /**
   * Create new session from template
   */
  createFromTemplate(template: PlaygroundTemplate): void {
    const session = this.playgroundService.createSession(template);
    this.sessionTitle = session.title;
    this.codeContent = session.code;
  }

  /**
   * Create blank session
   */
  createBlankSession(): void {
    const session = this.playgroundService.createSession();
    this.sessionTitle = session.title;
    this.codeContent = session.code;
  }

  /**
   * Load existing session
   */
  loadSession(sessionId: string): void {
    this.playgroundService.loadSession(sessionId);
    const session = this.currentSession();
    if (session) {
      this.sessionTitle = session.title;
      this.codeContent = session.code;
    }
    this.showSessionsList.set(false);
  }

  /**
   * Update session title
   */
  updateSessionTitle(title: string): void {
    this.sessionTitle = title;
    this.playgroundService.updateSession({ title });
  }

  /**
   * Update code content
   */
  updateCode(code: string): void {
    this.codeContent = code;
    this.playgroundService.updateSession({ code });
  }

  /**
   * Execute current code
   */
  async executeCode(): Promise<void> {
    await this.playgroundService.executeCode();
  }

  /**
   * Clear output
   */
  clearOutput(): void {
    // Clear the execution output
    this.playgroundService['_executionOutput'].set(null);
  }

  /**
   * Format code (basic formatting)
   */
  formatCode(): void {
    // Basic code formatting - in a real implementation, you'd use a proper formatter
    const formatted = this.codeContent
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/{\s*\n/g, '{\n  ')
      .replace(/\n\s*}/g, '\n}');
    
    this.updateCode(formatted);
  }

  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen(): void {
    this.isFullscreen.update(fullscreen => !fullscreen);
  }

  /**
   * Toggle sessions list
   */
  toggleSessionsList(): void {
    this.showSessionsList.update(show => !show);
  }

  /**
   * Save current session
   */
  saveSession(): void {
    if (this.hasChanges()) {
      this.playgroundService.updateSession({
        title: this.sessionTitle,
        code: this.codeContent
      });
    }
  }

  /**
   * Export current session
   */
  exportSession(): void {
    const session = this.currentSession();
    if (session) {
      this.playgroundService.exportSession(session.id);
    }
  }

  /**
   * Share current session
   */
  shareSession(): void {
    const session = this.currentSession();
    if (session) {
      const shareUrl = this.playgroundService.shareSession(session.id);
      navigator.clipboard.writeText(shareUrl);
      // Could show toast notification
    }
  }

  /**
   * Import session from file
   */
  importSession(): void {
    this.fileInputRef.nativeElement.click();
  }

  /**
   * Handle file selection for import
   */
  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const session = await this.playgroundService.importSession(file);
      
      if (session) {
        this.loadSession(session.id);
      }
      
      // Reset file input
      target.value = '';
    }
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    if (confirm('Are you sure you want to delete this session?')) {
      this.playgroundService.deleteSession(sessionId);
    }
  }

  /**
   * Rename session
   */
  renameSession(sessionId: string): void {
    const session = this.playgroundService.sessions().find(s => s.id === sessionId);
    if (session) {
      const newTitle = prompt('Enter new title:', session.title);
      if (newTitle && newTitle.trim()) {
        this.playgroundService.updateSession({ title: newTitle.trim() });
      }
    }
  }

  /**
   * Duplicate session
   */
  duplicateSession(sessionId: string): void {
    const session = this.playgroundService.sessions().find(s => s.id === sessionId);
    if (session) {
      const template: PlaygroundTemplate = {
        id: `duplicate_${sessionId}`,
        name: `${session.title} (Copy)`,
        description: 'Duplicated session',
        language: session.language,
        code: session.code,
        dependencies: session.dependencies,
        category: 'custom',
        difficulty: 1
      };
      
      this.createFromTemplate(template);
    }
  }

  /**
   * Get template icon based on category
   */
  getTemplateIcon(category: string): string {
    const iconMap: Record<string, string> = {
      'components': 'widgets',
      'constitutional': 'verified',
      'forms': 'dynamic_form',
      'services': 'build',
      'custom': 'code'
    };
    return iconMap[category] || 'code';
  }

  /**
   * Get language icon
   */
  getLanguageIcon(language: string): string {
    const iconMap: Record<string, string> = {
      'typescript': 'code',
      'javascript': 'javascript',
      'html': 'html',
      'css': 'style'
    };
    return iconMap[language] || 'code';
  }

  /**
   * Get difficulty label
   */
  getDifficultyLabel(difficulty: number): string {
    const labels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    return labels[difficulty - 1] || 'Unknown';
  }

  /**
   * Get output icon based on type
   */
  getOutputIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'success': 'check_circle',
      'error': 'error',
      'warning': 'warning'
    };
    return iconMap[type] || 'info';
  }

  /**
   * Get output status text
   */
  getOutputStatusText(type: string): string {
    const textMap: Record<string, string> = {
      'success': 'Execution Successful',
      'error': 'Execution Failed',
      'warning': 'Execution Warning'
    };
    return textMap[type] || 'Unknown Status';
  }

  /**
   * Get error icon based on severity
   */
  getErrorIcon(severity: string): string {
    const iconMap: Record<string, string> = {
      'error': 'error',
      'warning': 'warning',
      'info': 'info'
    };
    return iconMap[severity] || 'info';
  }

  /**
   * Get relative time string
   */
  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  }

  /**
   * Track functions for ngFor
   */
  trackByTemplate(index: number, template: PlaygroundTemplate): string {
    return template.id;
  }

  trackBySession(index: number, session: PlaygroundSession): string {
    return session.id;
  }

  trackByString(index: number, item: string): string {
    return item;
  }

  trackByError(index: number, error: any): string {
    return `${error.line}_${error.column}_${error.message}`;
  }
}