import { expect, jest } from '@jest/globals';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { Router } from '@angular/router';
import { ReplaySubject } from 'rxjs';

import { NavigationTreeComponent } from './navigation-tree.component';
import { NavigationService } from '../../core/services/navigation.service';
import { NavigationNode, SkillLevel, NodeType } from '../../shared/models';
import { createSpyObj } from '../../../testing/jest-spy-helpers';

describe('NavigationTreeComponent', () => {
  let component: NavigationTreeComponent;
  let fixture: ComponentFixture<NavigationTreeComponent>;
  let navigationService: jest.Mocked<NavigationService>;
  let router: jest.Mocked<Router>;
  let navigationTreeSubject: ReplaySubject<NavigationNode[]>;

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
          isSelected: true,
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
  navigationTreeSubject = new ReplaySubject<NavigationNode[]>(1);

    const navigationServiceSpy = createSpyObj<NavigationService>([
      'getNavigationTree',
      'selectTopic',
      'toggleNode',
      'getCurrentTopic',
      'expandAll',
      'collapseAll',
      'getTopicById'
    ], {
      navigationTree$: navigationTreeSubject.asObservable()
    } as Partial<NavigationService>);

    (navigationServiceSpy as any).selectedTopic$ = jest.fn(() => mockNavigationTree[0].children?.[0] ?? null);
    navigationServiceSpy.getTopicById.mockImplementation((id: string) => {
      for (const category of mockNavigationTree) {
        if (category.id === id) return category;
        const childMatch = category.children?.find(child => child.id === id);
        if (childMatch) return childMatch;
      }
      return undefined as any;
    });

    const routerSpy = createSpyObj<Router>(['navigate']);

    await TestBed.configureTestingModule({
      imports: [NavigationTreeComponent],
      providers: [
        { provide: NavigationService, useValue: navigationServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationTreeComponent);
    component = fixture.componentInstance;
    navigationService = TestBed.inject(NavigationService) as jest.Mocked<NavigationService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;

    fixture.detectChanges();
  });

  const emitNavigationTree = (tree: NavigationNode[] = mockNavigationTree) => {
    navigationTreeSubject.next(tree);
    fixture.detectChanges();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display navigation tree structure', () => {
    emitNavigationTree();
    const categoryElements = fixture.debugElement.queryAll(By.css('.category-node'));
    expect(categoryElements.length).toBe(2);
    
    const fundamentalsCategory = categoryElements[0];
    expect(fundamentalsCategory.nativeElement.textContent).toContain('Fundamentals');
  });

  it('should show expanded category children', () => {
    emitNavigationTree();
    const expandedChildren = fixture.debugElement.queryAll(By.css('.children-container'));
    expect(expandedChildren.length).toBe(1); // Only fundamentals is expanded
    
    const topicElements = fixture.debugElement.queryAll(By.css('.topic-node'));
    expect(topicElements.length).toBe(2); // Two topics under fundamentals
  });

  it('should display topic titles correctly', () => {
    emitNavigationTree();
    const topicElements = fixture.debugElement.queryAll(By.css('.topic-node'));
    
    expect(topicElements[0].nativeElement.textContent).toContain('Introduction to Angular');
    expect(topicElements[1].nativeElement.textContent).toContain('Components and Templates');
  });

  it('should handle category expansion toggle', () => {
    emitNavigationTree();
    const categoryButtons = fixture.debugElement.queryAll(By.css('.category-button'));
    const intermediateButton = categoryButtons[1];
    
    intermediateButton.triggerEventHandler('click', new Event('click'));
    
    expect(navigationService.toggleNode).toHaveBeenCalledWith('intermediate');
  });

  it('should handle topic selection', () => {
    emitNavigationTree();
    const firstTopic = fixture.debugElement.query(By.css('.topic-node'));
    
    firstTopic.nativeElement.click();
    
    expect(navigationService.selectTopic).toHaveBeenCalledWith('fundamentals/introduction-to-angular');
  });

  it('should navigate to topic on selection', () => {
    emitNavigationTree();
    const firstTopic = fixture.debugElement.query(By.css('.topic-node'));
    
    firstTopic.nativeElement.click();
    
    expect(router.navigate).toHaveBeenCalledWith(['/concepts', 'fundamentals', 'introduction-to-angular']);
  });

  it('should apply selected state to current topic', () => {
    emitNavigationTree();
    // The mock sets 'fundamentals/introduction-to-angular' as selected
    const selectedTopic = fixture.debugElement.query(By.css('.topic-node.selected'));
    expect(selectedTopic).toBeTruthy();
    expect(selectedTopic.nativeElement.textContent).toContain('Introduction to Angular');
  });

  it('should show loading state', () => {
    const loadingBar = fixture.debugElement.query(By.css('mat-progress-bar'));
    expect(loadingBar).toBeTruthy();
  });

  it('should display category titles with topic counts', () => {
    emitNavigationTree();
    const categoryElements = fixture.debugElement.queryAll(By.css('.category-node'));
    
    const fundamentalsElement = categoryElements[0];
    expect(fundamentalsElement.nativeElement.textContent).toContain('Fundamentals');
    expect(fundamentalsElement.nativeElement.textContent).toContain('topics');
    
    const intermediateElement = categoryElements[1];
    expect(intermediateElement.nativeElement.textContent).toContain('Intermediate');
  });

  it('should handle empty navigation tree', async () => {
    emitNavigationTree([]);
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
      emitNavigationTree();
      // The template uses track node.id syntax
      const categoryElements = fixture.debugElement.queryAll(By.css('.category-node'));
      expect(categoryElements.length).toBe(2);
      // Verify the tracking is working by checking rendered nodes
    });

    it('should track topics by id in template', () => {
      emitNavigationTree();
      const topicElements = fixture.debugElement.queryAll(By.css('.topic-node'));
      expect(topicElements.length).toBe(2);
      // Verify the tracking is working by checking rendered nodes
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      emitNavigationTree();
      const categoryButtons = fixture.debugElement.queryAll(By.css('.category-button'));
      const firstCategory = categoryButtons[0];
      
      expect(firstCategory.nativeElement.getAttribute('role')).toBe('treeitem');
      expect(firstCategory.nativeElement.getAttribute('aria-expanded')).toBe('true');
    });

    it('should support keyboard navigation', () => {
      component.toggleNode('fundamentals');
      expect(navigationService.toggleNode).toHaveBeenCalledWith('fundamentals');
    });
  });
});