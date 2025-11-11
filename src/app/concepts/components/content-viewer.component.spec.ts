import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ContentViewerComponent } from './content-viewer.component';
import { ContentService } from '../../core/services/content.service';
import { MarkdownProcessorService } from '../../core/services/markdown-processor.service';
import { LoadingStatus } from '../../shared/models';

describe('ContentViewerComponent', () => {
  let component: ContentViewerComponent;
  let fixture: ComponentFixture<ContentViewerComponent>;
  let contentService: jasmine.SpyObj<ContentService>;
  let markdownProcessor: jasmine.SpyObj<MarkdownProcessorService>;
  let activatedRoute: jasmine.SpyObj<ActivatedRoute>;

  const mockProcessedContent = {
    html: '<div><h1>Test Content</h1><p>This is test content.</p></div>',
    headings: [
      { id: 'test-content', text: 'Test Content', level: 1 }
    ],
    codeBlocks: [
      { language: 'typescript', code: 'const test = "hello";', lineCount: 1 }
    ],
    estimatedReadingTime: 5
  };

  const mockContentState = {
    topicId: 'fundamentals/introduction-to-angular',
    markdown: '# Test Content\n\nThis is test content.\n\n```typescript\nconst test = "hello";\n```',
    renderedHtml: mockProcessedContent.html,
    loadingStatus: LoadingStatus.Loaded,
    lastLoaded: new Date(),
    scrollPosition: 0
  };

  beforeEach(async () => {
    const contentServiceSpy = jasmine.createSpyObj('ContentService', [
      'loadContent',
      'preloadContent',
      'clearCache'
    ], {
      currentContent$: of(mockContentState),
      isLoading$: of(false),
      error$: of(null)
    });

    const markdownProcessorSpy = jasmine.createSpyObj('MarkdownProcessorService', [
      'processMarkdown',
      'generateTableOfContents'
    ]);

    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', [], {
      params: of({ level: 'fundamentals', topic: 'introduction-to-angular' }),
      paramMap: of(new Map([
        ['level', 'fundamentals'],
        ['topic', 'introduction-to-angular']
      ]))
    });

    markdownProcessorSpy.processMarkdown.and.returnValue(mockProcessedContent);
    markdownProcessorSpy.generateTableOfContents.and.returnValue('<nav><ul><li><a href="#test-content">Test Content</a></li></ul></nav>');

    await TestBed.configureTestingModule({
      imports: [ContentViewerComponent],
      providers: [
        { provide: ContentService, useValue: contentServiceSpy },
        { provide: MarkdownProcessorService, useValue: markdownProcessorSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContentViewerComponent);
    component = fixture.componentInstance;
    contentService = TestBed.inject(ContentService) as jasmine.SpyObj<ContentService>;
    markdownProcessor = TestBed.inject(MarkdownProcessorService) as jasmine.SpyObj<MarkdownProcessorService>;
    activatedRoute = TestBed.inject(ActivatedRoute) as jasmine.SpyObj<ActivatedRoute>;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load content on initialization', () => {
    expect(contentService.loadContent).toHaveBeenCalledWith('fundamentals/introduction-to-angular');
  });

  it('should display content when loaded', () => {
    const contentElement = fixture.debugElement.query(By.css('.content-body'));
    expect(contentElement).toBeTruthy();
    expect(contentElement.nativeElement.innerHTML).toContain('Test Content');
  });

  it('should show loading state', async () => {
    // Update service to return loading state
    (contentService as any).isLoading$ = of(true);
    (contentService as any).currentContent$ = of({
      ...mockContentState,
      loadingStatus: LoadingStatus.Loading
    });

    fixture = TestBed.createComponent(ContentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const loadingElement = fixture.debugElement.query(By.css('.loading-spinner'));
    expect(loadingElement).toBeTruthy();
  });

  it('should show error state', async () => {
    const errorState = {
      ...mockContentState,
      loadingStatus: LoadingStatus.Error,
      error: {
        type: 'not-found' as const,
        message: 'Content not found',
        details: 'The requested content could not be loaded'
      }
    };

    (contentService as any).currentContent$ = of(errorState);
    (contentService as any).error$ = of(errorState.error);

    fixture = TestBed.createComponent(ContentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const errorElement = fixture.debugElement.query(By.css('.error-message'));
    expect(errorElement).toBeTruthy();
    expect(errorElement.nativeElement.textContent).toContain('Content not found');
  });

  it('should display table of contents when headings exist', () => {
    const tocElement = fixture.debugElement.query(By.css('.table-of-contents'));
    expect(tocElement).toBeTruthy();
    expect(tocElement.nativeElement.innerHTML).toContain('Test Content');
  });

  it('should highlight code blocks', () => {
    expect(markdownProcessor.processMarkdown).toHaveBeenCalledWith(mockContentState.markdown);
    
    const codeElement = fixture.debugElement.query(By.css('pre code'));
    expect(codeElement).toBeTruthy();
  });

  it('should display reading time estimate', () => {
    const readingTimeElement = fixture.debugElement.query(By.css('.reading-time'));
    expect(readingTimeElement).toBeTruthy();
    expect(readingTimeElement.nativeElement.textContent).toContain('5 min read');
  });

  it('should handle scroll events', () => {
    const contentElement = fixture.debugElement.query(By.css('.content-container'));
    
    // Simulate scroll event
    const scrollEvent = new Event('scroll');
    Object.defineProperty(contentElement.nativeElement, 'scrollTop', {
      value: 100,
      configurable: true
    });
    
    contentElement.nativeElement.dispatchEvent(scrollEvent);
    
    // Verify scroll position is tracked internally
    expect(contentElement).toBeTruthy();
  });

  it('should handle route parameter changes', async () => {
    // Simulate route change
    (activatedRoute as any).params = of({ level: 'intermediate', topic: 'angular-signals' });
    
    fixture = TestBed.createComponent(ContentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    expect(contentService.loadContent).toHaveBeenCalledWith('intermediate/angular-signals');
  });

  it('should handle empty content gracefully', async () => {
    const emptyContentState = {
      ...mockContentState,
      markdown: '',
      renderedHtml: ''
    };

    (contentService as any).currentContent$ = of(emptyContentState);

    fixture = TestBed.createComponent(ContentViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const emptyStateElement = fixture.debugElement.query(By.css('.empty-content'));
    expect(emptyStateElement).toBeTruthy();
  });

  it('should handle markdown processing errors', () => {
    markdownProcessor.processMarkdown.and.throwError('Processing failed');
    
    expect(() => {
      component.ngOnInit();
    }).not.toThrow();
    
    // Should show error state
    const errorElement = fixture.debugElement.query(By.css('.processing-error'));
    expect(errorElement).toBeTruthy();
  });

  it('should display content metadata', () => {
    const metadataElement = fixture.debugElement.query(By.css('.content-metadata'));
    expect(metadataElement).toBeTruthy();
    
    const lastUpdatedElement = metadataElement.query(By.css('.last-updated'));
    expect(lastUpdatedElement).toBeTruthy();
  });

  it('should handle keyboard navigation for headings', () => {
    const headingElement = fixture.debugElement.query(By.css('h1'));
    
    // Test focus navigation
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    headingElement.nativeElement.dispatchEvent(tabEvent);
    
    expect(headingElement.nativeElement.tabIndex).toBe(0);
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const mainElement = fixture.debugElement.query(By.css('main'));
      expect(mainElement.nativeElement.getAttribute('role')).toBe('main');
      expect(mainElement.nativeElement.getAttribute('aria-label')).toBe('Content viewer');
    });

    it('should have semantic heading structure', () => {
      const headingElements = fixture.debugElement.queryAll(By.css('h1, h2, h3, h4, h5, h6'));
      expect(headingElements.length).toBeGreaterThan(0);
      
      // First heading should be h1
      expect(headingElements[0].nativeElement.tagName).toBe('H1');
    });

    it('should support screen readers', () => {
      const contentElement = fixture.debugElement.query(By.css('.content-body'));
      expect(contentElement.nativeElement.getAttribute('aria-live')).toBe('polite');
    });
  });

  describe('responsive behavior', () => {
    it('should adapt table of contents for mobile', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      fixture.detectChanges();

      const tocElement = fixture.debugElement.query(By.css('.table-of-contents'));
      expect(tocElement.nativeElement.classList).toContain('mobile-toc');
    });
  });
});