import { Injectable, signal, computed, inject } from '@angular/core';
import { CodeBlock } from './markdown-processor.service';

export interface CodeCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parentId?: string;
  order: number;
}

export interface CodeTag {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  count: number;
}

export interface CodeFilter {
  categories: string[];
  tags: string[];
  languages: string[];
  difficulty?: number[];
  searchTerm?: string;
}

export interface CodeExampleMeta extends CodeBlock {
  categories: string[];
  tags: string[];
  difficulty: number;
  popularity: number;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CodeCategoryService {
  
  // Default categories for Angular development
  private readonly defaultCategories: CodeCategory[] = [
    {
      id: 'components',
      name: 'Components',
      description: 'Angular component examples and patterns',
      icon: 'widgets',
      color: '#2196f3',
      order: 1
    },
    {
      id: 'services',
      name: 'Services',
      description: 'Angular services and dependency injection',
      icon: 'build',
      color: '#4caf50',
      order: 2
    },
    {
      id: 'directives',
      name: 'Directives',
      description: 'Custom directives and built-in directive usage',
      icon: 'code',
      color: '#ff9800',
      order: 3
    },
    {
      id: 'pipes',
      name: 'Pipes',
      description: 'Data transformation and custom pipes',
      icon: 'filter_list',
      color: '#9c27b0',
      order: 4
    },
    {
      id: 'routing',
      name: 'Routing',
      description: 'Navigation and route configuration',
      icon: 'navigation',
      color: '#607d8b',
      order: 5
    },
    {
      id: 'forms',
      name: 'Forms',
      description: 'Reactive and template-driven forms',
      icon: 'dynamic_form',
      color: '#795548',
      order: 6
    },
    {
      id: 'testing',
      name: 'Testing',
      description: 'Unit tests, integration tests, and E2E testing',
      icon: 'bug_report',
      color: '#f44336',
      order: 7
    },
    {
      id: 'performance',
      name: 'Performance',
      description: 'Optimization techniques and best practices',
      icon: 'speed',
      color: '#3f51b5',
      order: 8
    },
    {
      id: 'architecture',
      name: 'Architecture',
      description: 'Application structure and design patterns',
      icon: 'account_tree',
      color: '#009688',
      order: 9
    },
    {
      id: 'constitutional',
      name: 'Constitutional',
      description: 'Modern Angular patterns and constitutional examples',
      icon: 'verified',
      color: '#673ab7',
      order: 10
    }
  ];

  // Default tags for Angular development
  private readonly defaultTags: CodeTag[] = [
    { id: 'standalone', name: 'Standalone', description: 'Standalone components', category: 'components', color: '#2196f3', count: 0 },
    { id: 'signals', name: 'Signals', description: 'Angular Signals usage', category: 'components', color: '#4caf50', count: 0 },
    { id: 'onpush', name: 'OnPush', description: 'OnPush change detection', category: 'performance', color: '#ff9800', count: 0 },
    { id: 'reactive', name: 'Reactive', description: 'Reactive programming patterns', category: 'services', color: '#9c27b0', count: 0 },
    { id: 'typescript', name: 'TypeScript', description: 'TypeScript features', category: 'architecture', color: '#607d8b', count: 0 },
    { id: 'rxjs', name: 'RxJS', description: 'Reactive extensions', category: 'services', color: '#795548', count: 0 },
    { id: 'material', name: 'Material', description: 'Angular Material components', category: 'components', color: '#e91e63', count: 0 },
    { id: 'animation', name: 'Animation', description: 'Angular animations', category: 'components', color: '#00bcd4', count: 0 },
    { id: 'lazy-loading', name: 'Lazy Loading', description: 'Module lazy loading', category: 'routing', color: '#cddc39', count: 0 },
    { id: 'guard', name: 'Guards', description: 'Route guards', category: 'routing', color: '#ffc107', count: 0 },
    { id: 'interceptor', name: 'Interceptor', description: 'HTTP interceptors', category: 'services', color: '#ff5722', count: 0 },
    { id: 'validation', name: 'Validation', description: 'Form validation', category: 'forms', color: '#3f51b5', count: 0 },
    { id: 'accessibility', name: 'A11y', description: 'Accessibility features', category: 'components', color: '#009688', count: 0 },
    { id: 'best-practice', name: 'Best Practice', description: 'Recommended patterns', category: 'constitutional', color: '#4caf50', count: 0 },
    { id: 'anti-pattern', name: 'Anti-pattern', description: 'Common mistakes to avoid', category: 'constitutional', color: '#f44336', count: 0 }
  ];

  // Reactive state
  private readonly _categories = signal<CodeCategory[]>(this.defaultCategories);
  private readonly _tags = signal<CodeTag[]>(this.defaultTags);
  private readonly _codeExamples = signal<CodeExampleMeta[]>([]);
  private readonly _activeFilter = signal<CodeFilter>({
    categories: [],
    tags: [],
    languages: []
  });

  // Computed properties
  readonly categories = this._categories.asReadonly();
  readonly tags = this._tags.asReadonly();
  readonly codeExamples = this._codeExamples.asReadonly();
  readonly activeFilter = this._activeFilter.asReadonly();

  // Filtered code examples based on active filter
  readonly filteredCodeExamples = computed(() => {
    const examples = this._codeExamples();
    const filter = this._activeFilter();

    if (this.isFilterEmpty(filter)) {
      return examples;
    }

    return examples.filter(example => {
      // Category filter
      if (filter.categories.length > 0) {
        const hasMatchingCategory = filter.categories.some(categoryId =>
          example.categories.includes(categoryId)
        );
        if (!hasMatchingCategory) return false;
      }

      // Tag filter
      if (filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tagId =>
          example.tags?.includes(tagId)
        );
        if (!hasMatchingTag) return false;
      }

      // Language filter
      if (filter.languages.length > 0) {
        if (!filter.languages.includes(example.language)) return false;
      }

      // Difficulty filter
      if (filter.difficulty && filter.difficulty.length > 0) {
        if (!filter.difficulty.includes(example.difficulty)) return false;
      }

      // Search term filter
      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        const searchableText = [
          example.title,
          example.code,
          ...(example.tags || []),
          ...(example.categories || [])
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) return false;
      }

      return true;
    });
  });

  // Category statistics
  readonly categoryStats = computed(() => {
    const examples = this._codeExamples();
    const stats = new Map<string, number>();

    examples.forEach(example => {
      example.categories.forEach(categoryId => {
        stats.set(categoryId, (stats.get(categoryId) || 0) + 1);
      });
    });

    return stats;
  });

  // Tag statistics
  readonly tagStats = computed(() => {
    const examples = this._codeExamples();
    const stats = new Map<string, number>();

    examples.forEach(example => {
      example.tags?.forEach(tagId => {
        stats.set(tagId, (stats.get(tagId) || 0) + 1);
      });
    });

    return stats;
  });

  /**
   * Add a new category
   */
  addCategory(category: Omit<CodeCategory, 'id'>): string {
    const id = this.generateId(category.name);
    const newCategory: CodeCategory = { ...category, id };
    
    this._categories.update(categories => [...categories, newCategory]);
    return id;
  }

  /**
   * Add a new tag
   */
  addTag(tag: Omit<CodeTag, 'id' | 'count'>): string {
    const id = this.generateId(tag.name);
    const newTag: CodeTag = { ...tag, id, count: 0 };
    
    this._tags.update(tags => [...tags, newTag]);
    return id;
  }

  /**
   * Add or update a code example
   */
  addCodeExample(example: CodeExampleMeta): void {
    this._codeExamples.update(examples => {
      const existingIndex = examples.findIndex(e => e.id === example.id);
      
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...examples];
        updated[existingIndex] = example;
        return updated;
      } else {
        // Add new
        return [...examples, example];
      }
    });

    // Update tag counts
    this.updateTagCounts();
  }

  /**
   * Remove a code example
   */
  removeCodeExample(id: string): void {
    this._codeExamples.update(examples => 
      examples.filter(example => example.id !== id)
    );
    this.updateTagCounts();
  }

  /**
   * Update active filter
   */
  updateFilter(filter: Partial<CodeFilter>): void {
    this._activeFilter.update(current => ({ ...current, ...filter }));
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this._activeFilter.set({
      categories: [],
      tags: [],
      languages: []
    });
  }

  /**
   * Get category by ID
   */
  getCategoryById(id: string): CodeCategory | undefined {
    return this._categories().find(cat => cat.id === id);
  }

  /**
   * Get tag by ID
   */
  getTagById(id: string): CodeTag | undefined {
    return this._tags().find(tag => tag.id === id);
  }

  /**
   * Get categories by parent ID
   */
  getCategoriesByParent(parentId?: string): CodeCategory[] {
    return this._categories()
      .filter(cat => cat.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get tags by category
   */
  getTagsByCategory(categoryId: string): CodeTag[] {
    return this._tags()
      .filter(tag => tag.category === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get popular tags (with most usage)
   */
  getPopularTags(limit: number = 10): CodeTag[] {
    return this._tags()
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Auto-categorize code block based on content analysis
   */
  autoCategorizeCodeBlock(codeBlock: CodeBlock): string[] {
    const code = codeBlock.code.toLowerCase();
    const categories: string[] = [];

    // Analyze code content for automatic categorization
    if (code.includes('@component') || code.includes('component.ts')) {
      categories.push('components');
    }
    
    if (code.includes('@injectable') || code.includes('service.ts')) {
      categories.push('services');
    }
    
    if (code.includes('@directive') || code.includes('directive.ts')) {
      categories.push('directives');
    }
    
    if (code.includes('@pipe') || code.includes('pipe.ts')) {
      categories.push('pipes');
    }
    
    if (code.includes('router') || code.includes('route') || code.includes('routerlink')) {
      categories.push('routing');
    }
    
    if (code.includes('formgroup') || code.includes('formcontrol') || code.includes('validators')) {
      categories.push('forms');
    }
    
    if (code.includes('describe(') || code.includes('it(') || code.includes('expect(')) {
      categories.push('testing');
    }
    
    if (code.includes('onpush') || code.includes('trackby') || code.includes('async')) {
      categories.push('performance');
    }
    
    if (code.includes('standalone: true') || code.includes('signals') || codeBlock.constitutional) {
      categories.push('constitutional');
    }

    return categories.length > 0 ? categories : ['components']; // Default fallback
  }

  /**
   * Auto-tag code block based on content analysis
   */
  autoTagCodeBlock(codeBlock: CodeBlock): string[] {
    const code = codeBlock.code.toLowerCase();
    const tags: string[] = [];

    // Pattern-based auto-tagging
    if (code.includes('standalone: true')) tags.push('standalone');
    if (code.includes('signal(') || code.includes('computed(')) tags.push('signals');
    if (code.includes('onpush')) tags.push('onpush');
    if (code.includes('observable') || code.includes('subscribe')) tags.push('reactive', 'rxjs');
    if (code.includes('mat-') || code.includes('angular/material')) tags.push('material');
    if (code.includes('@angular/animations')) tags.push('animation');
    if (code.includes('loadchildren') || code.includes('lazy')) tags.push('lazy-loading');
    if (code.includes('canguard') || code.includes('guard')) tags.push('guard');
    if (code.includes('interceptor')) tags.push('interceptor');
    if (code.includes('validators') || code.includes('validation')) tags.push('validation');
    if (code.includes('aria-') || code.includes('accessibility')) tags.push('accessibility');
    if (codeBlock.category === 'best-practice' || code.includes('best practice')) tags.push('best-practice');

    return tags;
  }

  /**
   * Private helper methods
   */
  private generateId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private isFilterEmpty(filter: CodeFilter): boolean {
    return filter.categories.length === 0 &&
           filter.tags.length === 0 &&
           filter.languages.length === 0 &&
           (!filter.difficulty || filter.difficulty.length === 0) &&
           !filter.searchTerm;
  }

  private updateTagCounts(): void {
    const tagCounts = this.tagStats();
    
    this._tags.update(tags =>
      tags.map(tag => ({
        ...tag,
        count: tagCounts.get(tag.id) || 0
      }))
    );
  }
}