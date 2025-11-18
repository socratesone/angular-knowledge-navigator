// TODO: Legacy spec pending removal
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Component, DebugElement } from '@angular/core';
import { ContentViewerComponent } from '../../shared/components/content-viewer.component';
import { MarkdownProcessorService } from '../../core/services/markdown-processor.service';
import { ClipboardService } from '../../core/services/clipboard.service';
import { CodeCategoryService } from '../../core/services/code-category.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BreakpointService } from '../../core/services/breakpoint.service';

@Component({
  template: `
    <app-content-viewer 
      [content]="testContent"
      [enableCodeHighlighting]="enableHighlighting"
      [showLineNumbers]="showLineNumbers">
    </app-content-viewer>
  `
})
class TestHostComponent {
  testContent = '';
  enableHighlighting = true;
  showLineNumbers = false;
}

describe('ContentViewerComponent - Code Rendering Integration', () => {
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;
  let contentViewerComponent: ContentViewerComponent;
  let markdownService: MarkdownProcessorService;
  let clipboardService: ClipboardService;
  let categoryService: CodeCategoryService;
  let snackBar: MatSnackBar;

  beforeEach(async () => {
    const mockClipboardService = {
      copyToClipboard: jasmine.createSpy('copyToClipboard').and.returnValue(Promise.resolve(true)),
      isSupported: jasmine.createSpy('isSupported').and.returnValue(true)
    };

    const mockCategoryService = {
      categorizeCode: jasmine.createSpy('categorizeCode').and.returnValue({
        primaryCategory: 'components',
        tags: ['angular', 'component'],
        confidence: 0.9
      }),
      getTagsForCode: jasmine.createSpy('getTagsForCode').and.returnValue(['angular', 'typescript'])
    };

    const mockSnackBar = {
      open: jasmine.createSpy('open')
    };

    const mockBreakpointService = {
      isMobile: jasmine.createSpy('isMobile').and.returnValue(false),
      isTablet: jasmine.createSpy('isTablet').and.returnValue(false),
      isDesktop: jasmine.createSpy('isDesktop').and.returnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        ContentViewerComponent
      ],
      declarations: [TestHostComponent],
      providers: [
        MarkdownProcessorService,
        { provide: ClipboardService, useValue: mockClipboardService },
        { provide: CodeCategoryService, useValue: mockCategoryService },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: BreakpointService, useValue: mockBreakpointService }
      ]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    
    const contentViewerElement = hostFixture.debugElement.query(By.directive(ContentViewerComponent));
    contentViewerComponent = contentViewerElement.componentInstance;
    
    markdownService = TestBed.inject(MarkdownProcessorService);
    clipboardService = TestBed.inject(ClipboardService);
    categoryService = TestBed.inject(CodeCategoryService);
    snackBar = TestBed.inject(MatSnackBar);
  });

  describe('Code Block Rendering', () => {
    it('should render TypeScript code blocks with syntax highlighting', async () => {
      const markdownContent = `
# Test Component

Here's a simple Angular component:

\`\`\`typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-test',
  template: '<div>{{ title }}</div>'
})
export class TestComponent {
  title = 'Hello World';
}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      // Check that code blocks are rendered
      const codeBlocks = hostFixture.debugElement.queryAll(By.css('.code-block'));
      expect(codeBlocks.length).toBe(1);

      // Check that the code content is present
      const codeElement = codeBlocks[0].query(By.css('pre code'));
      expect(codeElement).toBeTruthy();
      expect(codeElement.nativeElement.textContent).toContain('TestComponent');
      expect(codeElement.nativeElement.textContent).toContain('@Component');
    });

    it('should show language label for code blocks', async () => {
      const markdownContent = `
\`\`\`javascript
console.log('Hello World');
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const languageLabel = hostFixture.debugElement.query(By.css('.code-language'));
      expect(languageLabel).toBeTruthy();
      expect(languageLabel.nativeElement.textContent.toLowerCase()).toContain('javascript');
    });

    it('should display copy button for code blocks', async () => {
      const markdownContent = `
\`\`\`typescript
const message = 'Hello World';
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const copyButton = hostFixture.debugElement.query(By.css('.copy-button'));
      expect(copyButton).toBeTruthy();
      expect(copyButton.nativeElement.getAttribute('mat-tooltip')).toContain('Copy');
    });

    it('should copy code to clipboard when copy button is clicked', async () => {
      const markdownContent = `
\`\`\`typescript
const message = 'Hello World';
console.log(message);
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const copyButton = hostFixture.debugElement.query(By.css('.copy-button'));
      copyButton.nativeElement.click();
      hostFixture.detectChanges();

      expect(clipboardService.copyToClipboard).toHaveBeenCalledWith(
        jasmine.stringMatching(/const message = 'Hello World'/)
      );
    });

    it('should show success message after successful copy', async () => {
      const markdownContent = `
\`\`\`typescript
const test = 'copy me';
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const copyButton = hostFixture.debugElement.query(By.css('.copy-button'));
      copyButton.nativeElement.click();
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      expect(snackBar.open).toHaveBeenCalledWith(
        'Code copied to clipboard!',
        'Close',
        jasmine.any(Object)
      );
    });

    it('should display line numbers when enabled', async () => {
      const markdownContent = `
\`\`\`typescript
line 1
line 2
line 3
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostComponent.showLineNumbers = true;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const lineNumbers = hostFixture.debugElement.queryAll(By.css('.line-number'));
      expect(lineNumbers.length).toBeGreaterThan(0);
    });

    it('should handle multiple code blocks in one content', async () => {
      const markdownContent = `
# Multiple Code Examples

TypeScript example:
\`\`\`typescript
interface User {
  id: number;
  name: string;
}
\`\`\`

CSS example:
\`\`\`css
.user-card {
  display: flex;
  padding: 1rem;
}
\`\`\`

HTML example:
\`\`\`html
<div class="user-card">
  <span>{{ user.name }}</span>
</div>
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const codeBlocks = hostFixture.debugElement.queryAll(By.css('.code-block'));
      expect(codeBlocks.length).toBe(3);

      // Check that each block has the correct language
      const languageLabels = hostFixture.debugElement.queryAll(By.css('.code-language'));
      expect(languageLabels.length).toBe(3);
    });
  });

  describe('Code Block Features', () => {
    it('should categorize code blocks automatically', async () => {
      const markdownContent = `
\`\`\`typescript
@Component({
  selector: 'app-example'
})
export class ExampleComponent {}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      expect(categoryService.categorizeCode).toHaveBeenCalled();
    });

    it('should display code block metadata when available', async () => {
      const markdownContent = `
\`\`\`typescript
// Title: Example Component
// File: example.component.ts
// Category: components
import { Component } from '@angular/core';

@Component({
  selector: 'app-example'
})
export class ExampleComponent {}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const titleElement = hostFixture.debugElement.query(By.css('.code-title'));
      expect(titleElement?.nativeElement.textContent).toContain('Example Component');

      const fileElement = hostFixture.debugElement.query(By.css('.code-filename'));
      expect(fileElement?.nativeElement.textContent).toContain('example.component.ts');
    });

    it('should handle code blocks with special characters', async () => {
      const markdownContent = `
\`\`\`typescript
const template = \`
  <div>
    <h1>{{ title }}</h1>
    <p>Special chars: & < > " '</p>
  </div>
\`;
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const codeElement = hostFixture.debugElement.query(By.css('pre code'));
      expect(codeElement).toBeTruthy();
      // Content should be properly escaped and displayed
      expect(codeElement.nativeElement.textContent).toContain('Special chars');
    });

    it('should expand/collapse large code blocks', async () => {
      const largeCode = Array(50).fill('console.log("line");').join('\n');
      const markdownContent = `
\`\`\`javascript
${largeCode}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const expandButton = hostFixture.debugElement.query(By.css('.expand-button'));
      if (expandButton) {
        expect(expandButton.nativeElement.textContent).toContain('Show');
        
        expandButton.nativeElement.click();
        hostFixture.detectChanges();
        
        expect(expandButton.nativeElement.textContent).toContain('Hide');
      }
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      const breakpointService = TestBed.inject(BreakpointService);
      (breakpointService.isMobile as jasmine.Spy).and.returnValue(true);
      (breakpointService.isDesktop as jasmine.Spy).and.returnValue(false);
    });

    it('should adapt layout for mobile devices', async () => {
      const markdownContent = `
\`\`\`typescript
import { Component } from '@angular/core';
export class MobileTestComponent {}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const contentViewer = hostFixture.debugElement.query(By.css('app-content-viewer'));
      expect(contentViewer.nativeElement.classList).toContain('mobile-layout');
    });

    it('should show horizontal scroll for wide code on mobile', async () => {
      const wideCode = 'const veryLongVariableNameThatWillCauseHorizontalScrollingOnMobileDevices = "test";';
      const markdownContent = `
\`\`\`typescript
${wideCode}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const codeContainer = hostFixture.debugElement.query(By.css('.code-container'));
      const computedStyle = window.getComputedStyle(codeContainer.nativeElement);
      expect(computedStyle.overflowX).toBe('auto');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for code blocks', async () => {
      const markdownContent = `
\`\`\`typescript
export class AccessibilityTestComponent {}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const codeBlock = hostFixture.debugElement.query(By.css('.code-block'));
      expect(codeBlock.nativeElement.getAttribute('role')).toBe('region');
      expect(codeBlock.nativeElement.getAttribute('aria-label')).toContain('Code block');

      const copyButton = hostFixture.debugElement.query(By.css('.copy-button'));
      expect(copyButton.nativeElement.getAttribute('aria-label')).toContain('Copy code');
    });

    it('should support keyboard navigation', async () => {
      const markdownContent = `
\`\`\`typescript
export class KeyboardTestComponent {}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const copyButton = hostFixture.debugElement.query(By.css('.copy-button'));
      expect(copyButton.nativeElement.tabIndex).toBe(0);
      
      // Simulate keyboard activation
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      copyButton.nativeElement.dispatchEvent(enterEvent);
      hostFixture.detectChanges();
      
      expect(clipboardService.copyToClipboard).toHaveBeenCalled();
    });

    it('should have sufficient color contrast for syntax highlighting', async () => {
      const markdownContent = `
\`\`\`typescript
// This should have good contrast
const variable = 'value';
function testFunction() {
  return true;
}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const codeElement = hostFixture.debugElement.query(By.css('pre code'));
      const computedStyle = window.getComputedStyle(codeElement.nativeElement);
      
      // Basic check that colors are defined
      expect(computedStyle.color).toBeTruthy();
      expect(computedStyle.backgroundColor).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid markdown gracefully', async () => {
      const invalidMarkdown = `
# Test
\`\`\`typescript
const x = 1
// Missing closing backticks and malformed
      `;

      hostComponent.testContent = invalidMarkdown;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      // Should still render something without throwing errors
      const contentElement = hostFixture.debugElement.query(By.css('app-content-viewer'));
      expect(contentElement).toBeTruthy();
    });

    it('should handle empty code blocks', async () => {
      const markdownContent = `
\`\`\`typescript
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const codeBlocks = hostFixture.debugElement.queryAll(By.css('.code-block'));
      expect(codeBlocks.length).toBe(1);
      
      const codeElement = codeBlocks[0].query(By.css('pre code'));
      expect(codeElement.nativeElement.textContent.trim()).toBe('');
    });

    it('should handle clipboard copy failures gracefully', async () => {
      (clipboardService.copyToClipboard as jasmine.Spy).and.returnValue(Promise.resolve(false));

      const markdownContent = `
\`\`\`typescript
const test = 'clipboard fail test';
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const copyButton = hostFixture.debugElement.query(By.css('.copy-button'));
      copyButton.nativeElement.click();
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      expect(snackBar.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/failed|error/i),
        'Close',
        jasmine.any(Object)
      );
    });
  });

  describe('Performance', () => {
    it('should handle large code blocks efficiently', async () => {
      const largeCode = Array(1000).fill('console.log("performance test");').join('\n');
      const markdownContent = `
\`\`\`javascript
${largeCode}
\`\`\`
      `;

      const startTime = performance.now();
      
      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Rendering should complete within reasonable time (2 seconds)
      expect(renderTime).toBeLessThan(2000);
      
      const codeBlocks = hostFixture.debugElement.queryAll(By.css('.code-block'));
      expect(codeBlocks.length).toBe(1);
    });

    it('should handle multiple code blocks without performance degradation', async () => {
      const multipleBlocks = Array(10).fill(0).map((_, i) => `
\`\`\`typescript
// Block ${i + 1}
export class TestComponent${i + 1} {
  value = ${i + 1};
}
\`\`\`
      `).join('\n\n');

      const markdownContent = `# Performance Test\n\n${multipleBlocks}`;

      const startTime = performance.now();
      
      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should handle multiple blocks efficiently
      expect(renderTime).toBeLessThan(3000);
      
      const codeBlocks = hostFixture.debugElement.queryAll(By.css('.code-block'));
      expect(codeBlocks.length).toBe(10);
    });
  });

  describe('Integration with Services', () => {
    it('should integrate with MarkdownProcessorService for content processing', async () => {
      spyOn(markdownService, 'processMarkdown').and.callThrough();

      const markdownContent = `
# Integration Test
\`\`\`typescript
export class IntegrationTestComponent {}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      expect(markdownService.processMarkdown).toHaveBeenCalledWith(markdownContent);
    });

    it('should integrate with CodeCategoryService for automatic categorization', async () => {
      const markdownContent = `
\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class TestService {}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      expect(categoryService.categorizeCode).toHaveBeenCalled();
      expect(categoryService.getTagsForCode).toHaveBeenCalled();
    });

    it('should display category and tags from CodeCategoryService', async () => {
      const markdownContent = `
\`\`\`typescript
@Component({
  selector: 'app-test'
})
export class TestComponent {}
\`\`\`
      `;

      hostComponent.testContent = markdownContent;
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      const categoryElement = hostFixture.debugElement.query(By.css('.code-category'));
      expect(categoryElement?.nativeElement.textContent).toContain('components');

      const tagsContainer = hostFixture.debugElement.query(By.css('.code-tags'));
      expect(tagsContainer).toBeTruthy();
    });
  });
});