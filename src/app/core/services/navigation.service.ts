import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { 
  ConceptTopic, 
  NavigationNode, 
  SkillLevel, 
  NodeType, 
  LearningPath,
  LearningPathData 
} from '../../shared/models';
import { AssetPathService } from './asset-path.service';

// Re-export for backward compatibility (need runtime values for enums)
export { SkillLevel, NodeType } from '../../shared/models';
export type { ConceptTopic, NavigationNode, LearningPath } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  
  // Angular Signals for reactive state management
  private readonly selectedTopicId = signal<string | null>(null);
  private readonly expandedNodeIds = signal<Set<string>>(new Set(['fundamentals'])); // Start with fundamentals expanded
  private readonly navigationHistory = signal<string[]>([]);
  
  // RxJS subjects for complex async operations
  private readonly navigationTreeSubject = new BehaviorSubject<NavigationNode[]>([]);
  private readonly topicsMapSubject = new BehaviorSubject<Map<string, ConceptTopic>>(new Map());

  // Public reactive state
  readonly selectedTopic$ = computed(() => {
    const topicId = this.selectedTopicId();
    const topicsMap = this.topicsMapSubject.value;
    return topicId ? topicsMap.get(topicId) || null : null;
  });

  readonly expandedNodes$ = computed(() => this.expandedNodeIds());
  readonly navigationHistory$ = computed(() => this.navigationHistory());
  readonly navigationTree$ = this.navigationTreeSubject.asObservable();

  constructor(
    private http: HttpClient,
    private assetPathService: AssetPathService
  ) {
    this.loadLearningPath();
    this.initializeProgressTracking();
  }

  /**
   * Load and build navigation tree from learning path JSON
   */
  private loadLearningPath(): void {
    const assetPath = this.assetPathService.resolveAssetPath('assets/data/learning-path.json');
    const deploymentInfo = this.assetPathService.getDeploymentInfo();
    
    console.log('Navigation Service - Loading learning path:', {
      assetPath,
      deploymentInfo,
      fullUrl: `${deploymentInfo.origin}${deploymentInfo.baseHref}${assetPath}`
    });

    this.http.get<LearningPathData[]>(assetPath).pipe(
      map(data => this.buildNavigationTree(data)),
      shareReplay(1)
    ).subscribe({
      next: ({ tree, topicsMap }) => {
        console.log('Navigation Service - Successfully loaded learning path:', {
          treeNodes: tree.length,
          topicsCount: topicsMap.size
        });
        this.navigationTreeSubject.next(tree);
        this.topicsMapSubject.next(topicsMap);
      },
      error: (error) => {
        console.error('Navigation Service - Failed to load learning path:', {
          error,
          assetPath,
          deploymentInfo,
          httpError: error.error,
          httpStatus: error.status,
          httpStatusText: error.statusText,
          fullUrl: error.url
        });
        // Fallback to empty tree
        this.navigationTreeSubject.next([]);
      }
    });
  }

  /**
   * Build navigation tree structure from learning path data
   */
  private buildNavigationTree(data: LearningPathData[]): { 
    tree: NavigationNode[], 
    topicsMap: Map<string, ConceptTopic> 
  } {
    const tree: NavigationNode[] = [];
    const topicsMap = new Map<string, ConceptTopic>();

    data.forEach(levelData => {
      const skillLevel = levelData.level.toLowerCase() as SkillLevel;
      
      // Create category node for skill level
      const categoryNode: NavigationNode = {
        id: skillLevel,
        title: levelData.level,
        slug: skillLevel,
        type: NodeType.Category,
        level: skillLevel,
        children: [],
        order: data.indexOf(levelData),
        isExpanded: skillLevel === SkillLevel.Fundamentals, // Start with fundamentals expanded
        isSelected: false,
        topicCount: levelData.topics.length
      };

      // Create topic nodes
      levelData.topics.forEach((topicTitle, index) => {
        const topicId = `${skillLevel}/${this.slugify(topicTitle)}`;
        
        // Create topic node
        const topicNode: NavigationNode = {
          id: topicId,
          title: topicTitle,
          slug: this.slugify(topicTitle),
          type: NodeType.Topic,
          level: skillLevel,
          children: [],
          parent: skillLevel,
          order: index,
          isExpanded: false,
          isSelected: false
        };

        // Create concept topic data
        const conceptTopic: ConceptTopic = {
          id: topicId,
          title: topicTitle,
          slug: this.slugify(topicTitle),
          level: skillLevel,
          skillLevel: skillLevel, // Add required alias
          description: `Learn about ${topicTitle} in Angular development`,
          tags: [skillLevel, 'angular'],
          difficulty: Math.min(5, Math.max(1, data.indexOf(levelData) + 1)) as 1 | 2 | 3 | 4 | 5,
          prerequisites: index > 0 ? [`${skillLevel}/${this.slugify(levelData.topics[index - 1])}`] : [],
          relatedTopics: [],
          estimatedReadingTime: 10, // Default 10 minutes
          lastUpdated: new Date(),
          // Additional properties for backward compatibility
          category: levelData.level,
          contentPath: `/assets/concepts/${topicId}.md`,
          constitutional: topicTitle.toLowerCase().includes('standalone') || 
                         topicTitle.toLowerCase().includes('onpush') ||
                         topicTitle.toLowerCase().includes('signals')
        };

        categoryNode.children!.push(topicNode);
        topicsMap.set(topicId, conceptTopic);
      });

      tree.push(categoryNode);
    });

    return { tree, topicsMap };
  }

  /**
   * Convert title to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Select a topic and update navigation state
   */
  selectTopic(topicId: string): void {
    const currentHistory = this.navigationHistory();
    
    // Add to history if different from current selection
    if (this.selectedTopicId() !== topicId) {
      this.navigationHistory.set([...currentHistory, topicId]);
    }
    
    this.selectedTopicId.set(topicId);
    this.updateTreeSelection(topicId);
  }

  /**
   * Update tree selection state
   */
  private updateTreeSelection(selectedId: string): void {
    const tree = this.navigationTreeSubject.value;
    const updatedTree = this.mapTreeNodes(tree, node => ({
      ...node,
      isSelected: node.id === selectedId
    }));
    
    this.navigationTreeSubject.next(updatedTree);
  }

  /**
   * Expand or collapse a navigation node
   */
  toggleNode(nodeId: string): void {
    const expanded = this.expandedNodeIds();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    
    this.expandedNodeIds.set(newExpanded);
    this.updateTreeExpansion();
  }

  /**
   * Update tree expansion state
   */
  private updateTreeExpansion(): void {
    const tree = this.navigationTreeSubject.value;
    const expanded = this.expandedNodeIds();
    
    const updatedTree = this.mapTreeNodes(tree, node => ({
      ...node,
      isExpanded: expanded.has(node.id)
    }));
    
    this.navigationTreeSubject.next(updatedTree);
  }

  /**
   * Map over tree nodes recursively
   */
  private mapTreeNodes(
    nodes: NavigationNode[], 
    mapper: (node: NavigationNode) => NavigationNode
  ): NavigationNode[] {
    return nodes.map(node => {
      const mappedNode = mapper(node);
      return {
        ...mappedNode,
        children: node.children ? this.mapTreeNodes(node.children, mapper) : []
      };
    });
  }

  /**
   * Get topic by ID
   */
  getTopicById(id: string): ConceptTopic | null {
    return this.topicsMapSubject.value.get(id) || null;
  }

  /**
   * Get topics by skill level
   */
  getTopicsByLevel(level: SkillLevel): ConceptTopic[] {
    const allTopics = Array.from(this.topicsMapSubject.value.values());
    return allTopics.filter(topic => topic.level === level);
  }

  /**
   * Navigate to next topic in learning path
   */
  navigateToNext(): ConceptTopic | null {
    const currentTopic = this.selectedTopic$();
    if (!currentTopic) return null;

    const topicsInLevel = this.getTopicsByLevel(currentTopic.level);
    const currentIndex = topicsInLevel.findIndex(t => t.id === currentTopic.id);
    
    if (currentIndex < topicsInLevel.length - 1) {
      // Next topic in same level
      const nextTopic = topicsInLevel[currentIndex + 1];
      this.selectTopic(nextTopic.id);
      return nextTopic;
    } else {
      // Move to next level
      const nextLevel = this.getNextLevel(currentTopic.level);
      if (nextLevel) {
        const nextLevelTopics = this.getTopicsByLevel(nextLevel);
        if (nextLevelTopics.length > 0) {
          const firstTopic = nextLevelTopics[0];
          this.selectTopic(firstTopic.id);
          return firstTopic;
        }
      }
    }

    return null;
  }

  /**
   * Navigate to previous topic
   */
  navigateToPrevious(): ConceptTopic | null {
    const history = this.navigationHistory();
    if (history.length > 1) {
      const previousId = history[history.length - 2];
      const previousTopic = this.getTopicById(previousId);
      
      if (previousTopic) {
        // Remove current from history and go back
        this.navigationHistory.set(history.slice(0, -1));
        this.selectedTopicId.set(previousId);
        this.updateTreeSelection(previousId);
        return previousTopic;
      }
    }
    
    return null;
  }

  /**
   * Get next skill level in progression
   */
  private getNextLevel(currentLevel: SkillLevel): SkillLevel | null {
    const levels = [
      SkillLevel.Fundamentals,
      SkillLevel.Intermediate,
      SkillLevel.Advanced,
      SkillLevel.Expert
    ];
    
    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
  }

  /**
   * Expand all nodes
   */
  expandAll(): void {
    const tree = this.navigationTreeSubject.value;
    const allNodeIds = this.collectAllNodeIds(tree);
    this.expandedNodeIds.set(new Set(allNodeIds));
    this.updateTreeExpansion();
  }

  /**
   * Collapse all nodes except fundamentals
   */
  collapseAll(): void {
    this.expandedNodeIds.set(new Set(['fundamentals']));
    this.updateTreeExpansion();
  }

  /**
   * Collect all node IDs recursively
   */
  private collectAllNodeIds(nodes: NavigationNode[]): string[] {
    const ids: string[] = [];
    
    nodes.forEach(node => {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        ids.push(...this.collectAllNodeIds(node.children));
      }
    });
    
    return ids;
  }

  /**
   * Get prerequisites for a specific topic
   */
  getPrerequisites(topicId: string): string[] {
    const prerequisiteMap: { [key: string]: string[] } = {
      // Intermediate topics require fundamentals
      'intermediate/angular-signals': ['fundamentals/components-and-templates', 'fundamentals/data-binding'],
      'intermediate/component-communication': ['fundamentals/components-and-templates'],
      
      // Advanced topics require intermediate knowledge
      'advanced/change-detection-strategies': ['intermediate/angular-signals', 'fundamentals/components-and-templates'],
      'advanced/lazy-loading': ['fundamentals/introduction-to-angular', 'intermediate/component-communication'],
      
      // Expert topics require advanced knowledge
      'expert/angular-constitution-and-best-practices': ['advanced/change-detection-strategies', 'advanced/lazy-loading']
    };

    return prerequisiteMap[topicId] || [];
  }

  /**
   * Check if user has completed prerequisites for a topic
   */
  hasCompletedPrerequisites(topicId: string): boolean {
    const prerequisites = this.getPrerequisites(topicId);
    const completedTopics = this.getCompletedTopics();
    
    return prerequisites.every(prereq => completedTopics.includes(prereq));
  }

  /**
   * Get completed topics (based on visit history for now)
   */
  getCompletedTopics(): string[] {
    // In a real app, this would track actual completion status
    // For now, we'll use navigation history as a proxy
    return this.navigationHistory();
  }

  /**
   * Mark a topic as visited/completed
   */
  markTopicVisited(topicId: string): void {
    const currentHistory = this.navigationHistory();
    if (!currentHistory.includes(topicId)) {
      this.navigationHistory.set([...currentHistory, topicId]);
      this.saveProgressToStorage();
    }
  }

  /**
   * Get recommended next topics based on current progress
   */
  getRecommendedNextTopics(): string[] {
    const completed = this.getCompletedTopics();
    const allTopics = this.getAllTopicIds();
    
    // Find topics where prerequisites are met but topic not yet completed
    return allTopics.filter(topicId => 
      !completed.includes(topicId) && 
      this.hasCompletedPrerequisites(topicId)
    ).slice(0, 3); // Limit to 3 recommendations
  }

  /**
   * Get all topic IDs from the navigation tree
   */
  getAllTopicIds(): string[] {
    const topicsMap = this.topicsMapSubject.value;
    return Array.from(topicsMap.keys());
  }

  /**
   * Calculate learning progress percentage
   */
  getLearningProgress(): { completed: number; total: number; percentage: number } {
    const completed = this.getCompletedTopics().length;
    const total = this.getAllTopicIds().length;
    
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  /**
   * Get skill level progress
   */
  getSkillLevelProgress(): { [key in SkillLevel]: { completed: number; total: number } } {
    const completed = this.getCompletedTopics();
    const topicsMap = this.topicsMapSubject.value;
    
    const progress = {
      [SkillLevel.Fundamentals]: { completed: 0, total: 0 },
      [SkillLevel.Intermediate]: { completed: 0, total: 0 },
      [SkillLevel.Advanced]: { completed: 0, total: 0 },
      [SkillLevel.Expert]: { completed: 0, total: 0 }
    };

    topicsMap.forEach((topic, topicId) => {
      const level = topic.skillLevel;
      if (progress[level]) {
        progress[level].total++;
        
        if (completed.includes(topicId)) {
          progress[level].completed++;
        }
      }
    });

    return progress;
  }

  /**
   * Check if topic is available (prerequisites met)
   */
  isTopicAvailable(topicId: string): boolean {
    const level = this.getTopicLevel(topicId);
    
    // Fundamentals are always available
    if (level === SkillLevel.Fundamentals) {
      return true;
    }
    
    return this.hasCompletedPrerequisites(topicId);
  }

  /**
   * Get topic skill level from topic ID
   */
  private getTopicLevel(topicId: string): SkillLevel {
    const topicsMap = this.topicsMapSubject.value;
    const topic = topicsMap.get(topicId);
    return topic?.skillLevel || SkillLevel.Fundamentals;
  }

  /**
   * Save progress to localStorage
   */
  private saveProgressToStorage(): void {
    const progress = {
      completedTopics: this.getCompletedTopics(),
      lastVisited: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('angular-knowledge-navigator-progress', JSON.stringify(progress));
    } catch (error) {
      console.warn('Failed to save progress to localStorage:', error);
    }
  }

  /**
   * Load progress from localStorage
   */
  private loadProgressFromStorage(): void {
    try {
      const stored = localStorage.getItem('angular-knowledge-navigator-progress');
      if (stored) {
        const progress = JSON.parse(stored);
        if (progress.completedTopics) {
          this.navigationHistory.set(progress.completedTopics);
        }
      }
    } catch (error) {
      console.warn('Failed to load progress from localStorage:', error);
    }
  }

  /**
   * Initialize progress tracking
   */
  initializeProgressTracking(): void {
    this.loadProgressFromStorage();
  }

  /**
   * Initialize navigation with default content
   * Loads "Introduction to Angular" by default if no topic is selected
   */
  initializeNavigation(): void {
    // Check if we already have a selected topic
    if (this.selectedTopicId()) {
      return;
    }

    // Default topic: Introduction to Angular
    const defaultTopicId = 'fundamentals/introduction-to-angular';
    
    // Verify the topic exists in our topics map
    const topicsMap = this.topicsMapSubject.value;
    if (topicsMap.has(defaultTopicId)) {
      this.selectTopic(defaultTopicId);
    } else {
      // Fallback: select first available fundamentals topic
      this.selectFirstAvailableTopic();
    }
  }

  /**
   * Select first available topic (fallback for default loading)
   */
  private selectFirstAvailableTopic(): void {
    const topicsMap = this.topicsMapSubject.value;
    
    // Try to find first fundamentals topic
    const fundamentalsTopics = Array.from(topicsMap.values())
      .filter(topic => topic.level === SkillLevel.Fundamentals)
      .sort((a, b) => a.title.localeCompare(b.title));

    if (fundamentalsTopics.length > 0) {
      this.selectTopic(fundamentalsTopics[0].id);
    } else {
      // Absolute fallback: select first available topic
      const firstTopic = Array.from(topicsMap.values())[0];
      if (firstTopic) {
        this.selectTopic(firstTopic.id);
      }
    }
  }

  /**
   * Check if default content should be loaded
   * @returns True if no topic is currently selected
   */
  shouldLoadDefaultContent(): boolean {
    return !this.selectedTopicId();
  }

  /**
   * Get default topic ID
   * @returns Default topic identifier
   */
  getDefaultTopicId(): string {
    return 'fundamentals/introduction-to-angular';
  }
}