import { expect, jest } from '@jest/globals';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { ContentViewerComponent } from './content-viewer.component';
import { ContentService } from '../../core/services/content.service';
import { MarkdownProcessorService } from '../../core/services/markdown-processor.service';
import { NavigationService } from '../../core/services/navigation.service';
import { createSpyObj } from '../../../testing/jest-spy-helpers';
import { ContentState, LoadingStatus, ContentError } from '../../shared/models';

describe('ContentViewerComponent', () => {
  class MockResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  type RouteParams = Record<string, string>;

  const defaultRouteParams: RouteParams = {
    level: 'fundamentals',
    topicId: 'introduction-to-angular'
  };

  const mockContentState: ContentState = {
    topicId: 'fundamentals/introduction-to-angular',
    markdown: '# Test Content\n\nThis is test content.\n\n```typescript\nconst test = "hello";\n```',
    renderedHtml: '<div><h1>Test Content</h1><p>This is test content.</p></div>',
    loadingStatus: LoadingStatus.Loaded,
    lastLoaded: new Date(),
    scrollPosition: 0
  } as ContentState;

  let fixture: ComponentFixture<ContentViewerComponent>;
  let component: ContentViewerComponent;
  let contentService: jest.Mocked<ContentService>;
  let navigationService: jest.Mocked<NavigationService>;
  let markdownProcessor: jest.Mocked<MarkdownProcessorService>;
  let contentStateSubject: BehaviorSubject<ContentState>;
  let errorSubject: BehaviorSubject<ContentError | null>;
  let paramsSubject: BehaviorSubject<RouteParams>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  interface SetupOptions {
    routeParams?: RouteParams;
    initialState?: ContentState;
  }

  async function renderComponent(options: SetupOptions = {}): Promise<void> {
    TestBed.resetTestingModule();

    const routeParams = options.routeParams ?? defaultRouteParams;
    const initialState = options.initialState ?? mockContentState;

    paramsSubject = new BehaviorSubject<RouteParams>(routeParams);
    paramMapSubject = new BehaviorSubject(convertToParamMap(routeParams));
    contentStateSubject = new BehaviorSubject<ContentState>(initialState);
    errorSubject = new BehaviorSubject<ContentError | null>(null);

    const contentServiceSpy = createSpyObj<ContentService>([
      'loadContent',
      'loadDefaultContent',
      'preloadContent',
      'clearCache',
      'updateScrollPosition',
      'getCacheInfo',
      'extractCodeExamples',
      'extractBestPractices',
      'getRelatedTopics'
    ], {
      currentContent$: contentStateSubject.asObservable(),
      error$: errorSubject.asObservable(),
      isLoading$: of(false)
    } as Partial<ContentService>);
    contentServiceSpy.loadContent.mockReturnValue(of(initialState));
    contentServiceSpy.loadDefaultContent.mockReturnValue(of(initialState));
    contentServiceSpy.getCacheInfo.mockReturnValue({ size: 0, topics: [] } as any);
    contentServiceSpy.getRelatedTopics.mockReturnValue(of([]));
    contentServiceSpy.extractCodeExamples.mockReturnValue([] as any);
    contentServiceSpy.extractBestPractices.mockReturnValue([] as any);

    const navigationServiceSpy = createSpyObj<NavigationService>([
      'initializeNavigation',
      'markTopicVisited',
      'getPrerequisites',
      'hasCompletedPrerequisites',
      'getCompletedTopics',
      'getRecommendedNextTopics'
    ], {
      navigationTree$: of([])
    } as Partial<NavigationService>);
    navigationServiceSpy.getPrerequisites.mockReturnValue([]);
    navigationServiceSpy.hasCompletedPrerequisites.mockReturnValue(true);
    navigationServiceSpy.getCompletedTopics.mockReturnValue([]);
    navigationServiceSpy.getRecommendedNextTopics.mockReturnValue([]);

    const markdownProcessorSpy = createSpyObj<MarkdownProcessorService>([
      'extractArticleMetadata'
    ]);
    markdownProcessorSpy.extractArticleMetadata.mockReturnValue({
      title: 'Test Content',
      description: 'Test description'
    } as any);

    const activatedRouteStub: Partial<ActivatedRoute> = {
      params: paramsSubject.asObservable(),
      paramMap: paramMapSubject.asObservable()
    };

    (globalThis as any).ResizeObserver = MockResizeObserver;

    await TestBed.configureTestingModule({
      imports: [ContentViewerComponent],
      providers: [
        { provide: ContentService, useValue: contentServiceSpy },
        { provide: MarkdownProcessorService, useValue: markdownProcessorSpy },
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContentViewerComponent);
    component = fixture.componentInstance;
    contentService = TestBed.inject(ContentService) as jest.Mocked<ContentService>;
    navigationService = TestBed.inject(NavigationService) as jest.Mocked<NavigationService>;
    markdownProcessor = TestBed.inject(MarkdownProcessorService) as jest.Mocked<MarkdownProcessorService>;
    fixture.detectChanges();
  }

  afterEach(() => {
    delete (globalThis as any).ResizeObserver;
    TestBed.resetTestingModule();
  });

  const emitContentState = (state: ContentState) => {
    contentStateSubject.next(state);
    fixture.detectChanges();
  };

  it('renders loaded markdown content', async () => {
    await renderComponent();

    const contentElement = fixture.debugElement.query(By.css('[data-testid="content-body"]'));
    expect(contentElement).toBeTruthy();
    expect(contentElement!.nativeElement.innerHTML).toContain('Test Content');
  });

  it('invokes navigation initialization and loads route content on init', async () => {
    await renderComponent();

    expect(navigationService.initializeNavigation).toHaveBeenCalledTimes(1);
    expect(contentService.loadContent).toHaveBeenCalledWith('fundamentals/introduction-to-angular');
  });

  it('falls back to default content when route params are missing', async () => {
    await renderComponent({ routeParams: {} });

    expect(contentService.loadDefaultContent).toHaveBeenCalled();
  });

  it('reacts to route param changes by loading the requested topic', async () => {
    await renderComponent();

    paramsSubject.next({ level: 'intermediate', topicId: 'angular-signals' });
    paramMapSubject.next(convertToParamMap({ level: 'intermediate', topicId: 'angular-signals' }));
    fixture.detectChanges();

    expect(contentService.loadContent).toHaveBeenCalledWith('intermediate/angular-signals');
  });

  it('shows the error card when content enters an error state', async () => {
    await renderComponent();

    emitContentState({
      ...mockContentState,
      loadingStatus: LoadingStatus.Error,
      renderedHtml: '<p>Not found</p>'
    });

    const errorCard = fixture.debugElement.query(By.css('.error-card'));
    expect(errorCard).toBeTruthy();
    expect(errorCard!.nativeElement.textContent).toContain('Content Error');
  });

  it('displays the default loading card while idle', async () => {
    await renderComponent();

    emitContentState({
      ...mockContentState,
      loadingStatus: LoadingStatus.Idle
    });

    const loadingCard = fixture.debugElement.query(By.css('.default-loading-card'));
    expect(loadingCard).toBeTruthy();
  });

  it('exposes rendered html through markdown container', async () => {
    await renderComponent();
    const markdownContainer = fixture.debugElement.query(By.css('.markdown-content'));
    expect(markdownContainer?.nativeElement.innerHTML).toContain('Test Content');
  });

  it('updates article metadata via markdown processor', async () => {
    await renderComponent();
    expect(markdownProcessor.extractArticleMetadata).toHaveBeenCalledWith(mockContentState.markdown, mockContentState.topicId);
  });
});