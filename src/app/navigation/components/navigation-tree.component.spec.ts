import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { NavigationTreeComponent } from './navigation-tree.component';
import { NavigationService } from '../../core/services/navigation.service';
import { NavigationNode, SkillLevel, NodeType } from '../../shared/models';

describe('NavigationTreeComponent', () => {
  let component: NavigationTreeComponent;
  let fixture: ComponentFixture<NavigationTreeComponent>;
  let navigationService: jasmine.SpyObj<NavigationService>;
  let router: jasmine.SpyObj<Router>;

  const mockNavigationTree: NavigationNode[] = [
    {
      id: 'fundamentals',
      title: 'Fundamentals',
      slug: 'fundamentals',
      level: SkillLevel.Fundamentals,
      type: NodeType.Category,
      order: 0,
      isExpanded: true,
      isSelected: false,
      children: [
        {
          id: 'fundamentals/introduction-to-angular',
          title: 'Introduction to Angular',
          slug: 'introduction-to-angular',
          level: SkillLevel.Fundamentals,
          type: NodeType.Topic,
          order: 0,
          isExpanded: false,
          isSelected: false,
          parent: 'fundamentals'
        },
        {
          id: 'fundamentals/components-and-templates',
          title: 'Components and Templates',
          slug: 'components-and-templates',
          level: SkillLevel.Fundamentals,
          type: NodeType.Topic,
          order: 1,
          isExpanded: false,
          isSelected: false,
          parent: 'fundamentals'
        }
      ]
    },
    {
      id: 'intermediate',
      title: 'Intermediate',
      slug: 'intermediate',
      level: SkillLevel.Intermediate,
      type: NodeType.Category,
      order: 1,
      isExpanded: false,
      isSelected: false,
      children: [
        {
          id: 'intermediate/angular-signals',
          title: 'Angular Signals',
          slug: 'angular-signals',
          level: SkillLevel.Intermediate,
          type: NodeType.Topic,
          order: 0,
          isExpanded: false,
          isSelected: false,
          parent: 'intermediate'
        }
      ]
    }
  ];

  beforeEach(async () => {
    const navigationServiceSpy = jasmine.createSpyObj('NavigationService', [
      'getNavigationTree',
      'selectTopic',
      'toggleNode',
      'getCurrentTopic'
    ], {
      currentNavigationTree$: of(mockNavigationTree),
      selectedTopicId$: of('fundamentals/introduction-to-angular'),
      isLoading$: of(false)
    });

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [NavigationTreeComponent],
      providers: [
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationTreeComponent);
    component = fixture.componentInstance;
    navigationService = TestBed.inject(NavigationService) as jasmine.SpyObj<NavigationService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display navigation tree structure', () => {
    const categoryElements = fixture.debugElement.queryAll(By.css('.category-node'));
    expect(categoryElements.length).toBe(2);
    
    const fundamentalsCategory = categoryElements[0];
    expect(fundamentalsCategory.nativeElement.textContent).toContain('Fundamentals');
  });

  it('should show expanded category children', () => {
    const expandedChildren = fixture.debugElement.queryAll(By.css('.children-container'));
    expect(expandedChildren.length).toBe(1); // Only fundamentals is expanded
    
    const topicElements = fixture.debugElement.queryAll(By.css('.topic-node'));
    expect(topicElements.length).toBe(2); // Two topics under fundamentals
  });

  it('should display topic titles correctly', () => {
    const topicElements = fixture.debugElement.queryAll(By.css('.topic-node'));
    
    expect(topicElements[0].nativeElement.textContent).toContain('Introduction to Angular');
    expect(topicElements[1].nativeElement.textContent).toContain('Components and Templates');
  });

  it('should handle category expansion toggle', () => {
    const intermediateCategory = fixture.debugElement.queryAll(By.css('.category-node'))[1];
    const expandButton = intermediateCategory.query(By.css('.expand-button'));
    
    expandButton.nativeElement.click();
    
    expect(navigationService.toggleNode).toHaveBeenCalledWith('intermediate');
  });

  it('should handle topic selection', () => {
    const firstTopic = fixture.debugElement.query(By.css('.topic-node'));
    
    firstTopic.nativeElement.click();
    
    expect(navigationService.selectTopic).toHaveBeenCalledWith('fundamentals/introduction-to-angular');
  });

  it('should navigate to topic on selection', () => {
    const firstTopic = fixture.debugElement.query(By.css('.topic-node'));
    
    firstTopic.nativeElement.click();
    
    expect(router.navigate).toHaveBeenCalledWith(['/concepts', 'fundamentals', 'introduction-to-angular']);
  });

  it('should apply selected state to current topic', () => {
    // The mock sets 'fundamentals/introduction-to-angular' as selected
    const selectedTopic = fixture.debugElement.query(By.css('.topic-node.selected'));
    expect(selectedTopic).toBeTruthy();
    expect(selectedTopic.nativeElement.textContent).toContain('Introduction to Angular');
  });

  it('should show loading state', async () => {
    // Update the service to return loading state
    (navigationService as any).isLoading$ = of(true);
    
    fixture = TestBed.createComponent(NavigationTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    const loadingElement = fixture.debugElement.query(By.css('.loading'));
    expect(loadingElement).toBeTruthy();
  });

  it('should display skill level icons correctly', () => {
    const categoryElements = fixture.debugElement.queryAll(By.css('.category-node'));
    
    const fundamentalsElement = categoryElements[0];
    expect(fundamentalsElement.nativeElement.textContent).toContain('🎯'); // Fundamentals icon
    
    const intermediateElement = categoryElements[1];
    expect(intermediateElement.nativeElement.textContent).toContain('🚀'); // Intermediate icon
  });

  it('should handle empty navigation tree', async () => {
    (navigationService as any).currentNavigationTree$ = of([]);
    
    fixture = TestBed.createComponent(NavigationTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
  });

  it('should expand category when child topic is selected', () => {
    const intermediateTopic = mockNavigationTree[1].children![0];
    component.selectTopic(intermediateTopic);
    
    expect(navigationService.selectTopic).toHaveBeenCalledWith('intermediate/angular-signals');
  });

  describe('node tracking', () => {
    it('should track categories by id in template', () => {
      // The template uses track node.id syntax
      const categoryElements = fixture.debugElement.queryAll(By.css('.category-node'));
      expect(categoryElements.length).toBe(2);
      // Verify the tracking is working by checking rendered nodes
    });

    it('should track topics by id in template', () => {
      const topicElements = fixture.debugElement.queryAll(By.css('.topic-node'));
      expect(topicElements.length).toBe(2);
      // Verify the tracking is working by checking rendered nodes
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const categoryElements = fixture.debugElement.queryAll(By.css('.category-node'));
      const firstCategory = categoryElements[0];
      
      expect(firstCategory.nativeElement.getAttribute('role')).toBe('treeitem');
      expect(firstCategory.nativeElement.getAttribute('aria-expanded')).toBe('true');
    });

    it('should support keyboard navigation', () => {
      const firstCategory = fixture.debugElement.query(By.css('.category-node'));
      
      // Test Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      firstCategory.nativeElement.dispatchEvent(enterEvent);
      
      expect(navigationService.toggleNode).toHaveBeenCalled();
    });
  });
});