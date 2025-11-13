import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, of, map } from 'rxjs';

export interface PlaygroundSession {
  id: string;
  title: string;
  language: string;
  code: string;
  dependencies: string[];
  lastModified: Date;
  isPublic: boolean;
  output?: PlaygroundOutput;
}

export interface PlaygroundOutput {
  type: 'success' | 'error' | 'warning';
  content: string;
  executionTime?: number;
  memoryUsage?: number;
  compileErrors?: CompileError[];
}

export interface CompileError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PlaygroundTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  code: string;
  dependencies: string[];
  category: string;
  difficulty: number;
}

@Injectable({
  providedIn: 'root'
})
export class CodePlaygroundService {
  private http = inject(HttpClient);

  // Playground state
  private readonly _currentSession = signal<PlaygroundSession | null>(null);
  private readonly _sessions = signal<PlaygroundSession[]>([]);
  private readonly _templates = signal<PlaygroundTemplate[]>([]);
  private readonly _isExecuting = signal<boolean>(false);
  private readonly _executionOutput = signal<PlaygroundOutput | null>(null);

  // Default templates for Angular development
  private readonly defaultTemplates: PlaygroundTemplate[] = [
    {
      id: 'angular-component-basic',
      name: 'Basic Angular Component',
      description: 'Simple Angular component with template and styles',
      language: 'typescript',
      code: `import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  template: \`
    <div class="example-container">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <button (click)="onClick()">Click me!</button>
    </div>
  \`,
  styles: [\`
    .example-container {
      padding: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    
    button {
      background: #1976d2;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
    }
  \`]
})
export class ExampleComponent {
  title = 'Hello Angular!';
  description = 'This is a basic Angular component example.';

  onClick() {
    alert('Button clicked!');
  }
}`,
      dependencies: ['@angular/core'],
      category: 'components',
      difficulty: 1
    },
    {
      id: 'angular-signals-example',
      name: 'Angular Signals',
      description: 'Modern Angular component using Signals',
      language: 'typescript',
      code: `import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-signals-example',
  standalone: true,
  template: \`
    <div class="signals-container">
      <h2>Angular Signals Example</h2>
      
      <div class="counter-section">
        <p>Count: {{ count() }}</p>
        <p>Double Count: {{ doubleCount() }}</p>
        <p>Message: {{ message() }}</p>
        
        <button (click)="increment()">Increment</button>
        <button (click)="decrement()">Decrement</button>
        <button (click)="reset()">Reset</button>
      </div>
    </div>
  \`,
  styles: [\`
    .signals-container {
      padding: 1rem;
      max-width: 400px;
      margin: 0 auto;
    }
    
    .counter-section {
      text-align: center;
    }
    
    button {
      margin: 0.25rem;
      padding: 0.5rem 1rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background: #1565c0;
    }
  \`]
})
export class SignalsExampleComponent {
  // Signal for count
  count = signal(0);
  
  // Computed signal
  doubleCount = computed(() => this.count() * 2);
  
  // Computed message based on count
  message = computed(() => {
    const currentCount = this.count();
    if (currentCount === 0) return 'Start counting!';
    if (currentCount > 0) return 'Positive number';
    return 'Negative number';
  });

  increment() {
    this.count.update(value => value + 1);
  }

  decrement() {
    this.count.update(value => value - 1);
  }

  reset() {
    this.count.set(0);
  }
}`,
      dependencies: ['@angular/core'],
      category: 'constitutional',
      difficulty: 2
    },
    {
      id: 'angular-reactive-forms',
      name: 'Reactive Forms',
      description: 'Angular reactive forms with validation',
      language: 'typescript',
      code: `import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reactive-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="form-container">
      <h2>Reactive Form Example</h2>
      
      <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="name">Name:</label>
          <input 
            id="name" 
            type="text" 
            formControlName="name"
            [class.invalid]="userForm.get('name')?.invalid && userForm.get('name')?.touched">
          <div class="error" *ngIf="userForm.get('name')?.invalid && userForm.get('name')?.touched">
            Name is required
          </div>
        </div>

        <div class="form-group">
          <label for="email">Email:</label>
          <input 
            id="email" 
            type="email" 
            formControlName="email"
            [class.invalid]="userForm.get('email')?.invalid && userForm.get('email')?.touched">
          <div class="error" *ngIf="userForm.get('email')?.invalid && userForm.get('email')?.touched">
            Valid email is required
          </div>
        </div>

        <div class="form-group">
          <label for="age">Age:</label>
          <input 
            id="age" 
            type="number" 
            formControlName="age"
            [class.invalid]="userForm.get('age')?.invalid && userForm.get('age')?.touched">
          <div class="error" *ngIf="userForm.get('age')?.invalid && userForm.get('age')?.touched">
            Age must be between 18 and 100
          </div>
        </div>

        <button type="submit" [disabled]="userForm.invalid">Submit</button>
      </form>

      <div class="form-state" *ngIf="submitted">
        <h3>Form Data:</h3>
        <pre>{{ formData | json }}</pre>
      </div>
    </div>
  \`,
  styles: [\`
    .form-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 1rem;
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: bold;
    }
    
    input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    
    input.invalid {
      border-color: #f44336;
    }
    
    .error {
      color: #f44336;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }
    
    button {
      background: #1976d2;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .form-state {
      margin-top: 2rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
    
    pre {
      background: white;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
  \`]
})
export class ReactiveFormComponent {
  private fb = inject(FormBuilder);
  
  submitted = false;
  formData: any = null;

  userForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    age: ['', [Validators.required, Validators.min(18), Validators.max(100)]]
  });

  onSubmit() {
    if (this.userForm.valid) {
      this.formData = this.userForm.value;
      this.submitted = true;
      console.log('Form submitted:', this.formData);
    }
  }
}`,
      dependencies: ['@angular/core', '@angular/forms', '@angular/common'],
      category: 'forms',
      difficulty: 3
    }
  ];

  // Computed properties
  readonly currentSession = this._currentSession.asReadonly();
  readonly sessions = this._sessions.asReadonly();
  readonly templates = this._templates.asReadonly();
  readonly isExecuting = this._isExecuting.asReadonly();
  readonly executionOutput = this._executionOutput.asReadonly();

  readonly hasCurrentSession = computed(() => this._currentSession() !== null);
  readonly canExecute = computed(() => 
    this._currentSession() !== null && 
    !this._isExecuting() && 
    this._currentSession()!.code.trim().length > 0
  );

  constructor() {
    this.initializeTemplates();
    this.loadSessions();
  }

  /**
   * Initialize with default templates
   */
  private initializeTemplates(): void {
    this._templates.set(this.defaultTemplates);
  }

  /**
   * Load saved sessions from localStorage
   */
  private loadSessions(): void {
    try {
      const savedSessions = localStorage.getItem('playground-sessions');
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          lastModified: new Date(session.lastModified)
        }));
        this._sessions.set(sessions);
      }
    } catch (error) {
      console.warn('Failed to load playground sessions:', error);
    }
  }

  /**
   * Save sessions to localStorage
   */
  private saveSessions(): void {
    try {
      localStorage.setItem('playground-sessions', JSON.stringify(this._sessions()));
    } catch (error) {
      console.warn('Failed to save playground sessions:', error);
    }
  }

  /**
   * Create new playground session
   */
  createSession(template?: PlaygroundTemplate): PlaygroundSession {
    const session: PlaygroundSession = {
      id: this.generateId(),
      title: template ? template.name : 'New Playground',
      language: template?.language || 'typescript',
      code: template?.code || this.getDefaultCode('typescript'),
      dependencies: template?.dependencies || [],
      lastModified: new Date(),
      isPublic: false
    };

    this._sessions.update(sessions => [...sessions, session]);
    this._currentSession.set(session);
    this.saveSessions();

    return session;
  }

  /**
   * Load existing session
   */
  loadSession(sessionId: string): void {
    const session = this._sessions().find(s => s.id === sessionId);
    if (session) {
      this._currentSession.set(session);
    }
  }

  /**
   * Update current session
   */
  updateSession(updates: Partial<PlaygroundSession>): void {
    const current = this._currentSession();
    if (!current) return;

    const updated = {
      ...current,
      ...updates,
      lastModified: new Date()
    };

    this._currentSession.set(updated);
    this._sessions.update(sessions =>
      sessions.map(s => s.id === current.id ? updated : s)
    );
    this.saveSessions();
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    this._sessions.update(sessions => sessions.filter(s => s.id !== sessionId));
    
    if (this._currentSession()?.id === sessionId) {
      this._currentSession.set(null);
    }
    
    this.saveSessions();
  }

  /**
   * Execute code in playground
   */
  async executeCode(): Promise<void> {
    const session = this._currentSession();
    if (!session || this._isExecuting()) return;

    this._isExecuting.set(true);
    this._executionOutput.set(null);

    try {
      const startTime = performance.now();
      
      // Simulate code execution (in a real implementation, this would compile and run the code)
      const result = await this.simulateExecution(session);
      
      const executionTime = performance.now() - startTime;
      
      const output: PlaygroundOutput = {
        ...result,
        executionTime: Math.round(executionTime)
      };

      this._executionOutput.set(output);
      
      // Update session with output
      this.updateSession({ output });

    } catch (error) {
      const output: PlaygroundOutput = {
        type: 'error',
        content: `Execution failed: ${error}`,
        executionTime: 0
      };
      
      this._executionOutput.set(output);
    } finally {
      this._isExecuting.set(false);
    }
  }

  /**
   * Get available templates by category
   */
  getTemplatesByCategory(category?: string): PlaygroundTemplate[] {
    const templates = this._templates();
    return category 
      ? templates.filter(t => t.category === category)
      : templates;
  }

  /**
   * Export session as file
   */
  exportSession(sessionId: string): void {
    const session = this._sessions().find(s => s.id === sessionId);
    if (!session) return;

    const exportData = {
      ...session,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Import session from file
   */
  async importSession(file: File): Promise<PlaygroundSession | null> {
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      // Validate imported data
      if (!data.code || !data.language) {
        throw new Error('Invalid session file');
      }

      const session: PlaygroundSession = {
        id: this.generateId(),
        title: data.title || 'Imported Session',
        language: data.language,
        code: data.code,
        dependencies: data.dependencies || [],
        lastModified: new Date(),
        isPublic: false
      };

      this._sessions.update(sessions => [...sessions, session]);
      this.saveSessions();

      return session;
    } catch (error) {
      console.error('Failed to import session:', error);
      return null;
    }
  }

  /**
   * Share session (generate shareable link)
   */
  shareSession(sessionId: string): string {
    const session = this._sessions().find(s => s.id === sessionId);
    if (!session) return '';

    // In a real implementation, this would upload to a sharing service
    const shareData = btoa(JSON.stringify({
      title: session.title,
      language: session.language,
      code: session.code,
      dependencies: session.dependencies
    }));

    return `${window.location.origin}/playground/shared/${shareData}`;
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return `playground_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultCode(language: string): string {
    const defaults: Record<string, string> = {
      typescript: `// Welcome to the Angular Playground!
// Start coding your Angular component or service here

import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  template: \`
    <div>
      <h1>Hello, Angular Playground!</h1>
      <p>Start building something amazing!</p>
    </div>
  \`
})
export class ExampleComponent {
  
}`,
      javascript: `// JavaScript playground
console.log('Hello, JavaScript Playground!');

// Your code here...`,
      html: `<!-- HTML playground -->
<!DOCTYPE html>
<html>
<head>
  <title>HTML Playground</title>
</head>
<body>
  <h1>Hello, HTML Playground!</h1>
  <p>Start building your HTML here!</p>
</body>
</html>`,
      css: `/* CSS playground */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f0f0f0;
}

h1 {
  color: #333;
  text-align: center;
}`
    };

    return defaults[language] || '// Start coding...';
  }

  private async simulateExecution(session: PlaygroundSession): Promise<PlaygroundOutput> {
    // Simulate compilation and execution
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Basic syntax checking
    const compileErrors = this.performBasicSyntaxCheck(session.code);
    
    if (compileErrors.length > 0) {
      return {
        type: 'error',
        content: 'Compilation failed',
        compileErrors
      };
    }

    // Simulate successful execution
    return {
      type: 'success',
      content: 'Code executed successfully!\n\nOutput:\nComponent rendered without errors.',
      memoryUsage: Math.floor(Math.random() * 1000) + 500 // KB
    };
  }

  private performBasicSyntaxCheck(code: string): CompileError[] {
    const errors: CompileError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      // Check for common syntax errors
      if (line.includes('{') && !line.includes('}') && line.trim().endsWith('{')) {
        // This is likely fine, opening brace
      } else if (line.includes('import') && !line.includes('from')) {
        errors.push({
          line: index + 1,
          column: 1,
          message: 'Invalid import statement',
          severity: 'error'
        });
      }
      // Add more syntax checks as needed
    });

    return errors;
  }
}