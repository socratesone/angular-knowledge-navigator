export interface ConceptTopic {
  id: string;
  title: string;
  slug: string;
  level: SkillLevel;
  skillLevel: SkillLevel; // Alias for compatibility
  description: string;
  tags: string[];
  estimatedReadingTime: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];
  relatedTopics: string[];
  lastUpdated: Date;
  content?: string; // Markdown content
  // Additional properties for navigation service compatibility
  category?: string;
  contentPath?: string;
  constitutional?: boolean;
}

export interface NavigationNode {
  id: string;
  title: string;
  slug: string;
  level: SkillLevel;
  type: NodeType;
  children?: NavigationNode[];
  parent?: string;
  order: number;
  isExpanded?: boolean;
  isSelected?: boolean;
  // Additional properties for navigation service compatibility
  topicCount?: number;
}

export enum SkillLevel {
  Fundamentals = 'fundamentals',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Expert = 'expert'
}

export enum NodeType {
  Category = 'category',
  Topic = 'topic'
}

export interface LearningPath {
  level: SkillLevel;
  description: string;
  topics: string[];
}

export interface LearningPathData {
  level: string;
  description: string;
  topics: string[];
}

export interface ContentProgress {
  topicId: string;
  completed: boolean;
  timeSpent: number; // in minutes
  lastAccessed: Date;
  bookmarked: boolean;
  notes?: string;
}

export interface ContentState {
  topicId: string;
  markdown: string;
  renderedHtml: any; // SafeHtml from DomSanitizer
  loadingStatus: LoadingStatus;
  error?: ContentError;
  lastLoaded: Date;
  scrollPosition: number;
  metadata?: ContentFrontmatter; // YAML frontmatter metadata
}

export interface ContentFrontmatter {
  title?: string;
  slug?: string;
  category?: string;
  skillLevel?: string;
  difficulty?: number;
  estimatedReadingTime?: number;
  constitutional?: boolean;
  tags?: string[];
  prerequisites?: string[];
  relatedTopics?: string[];
  lastUpdated?: string;
  contentPath?: string;
  [key: string]: any; // Allow additional properties
}

export enum LoadingStatus {
  Idle = 'idle',
  Loading = 'loading',
  Loaded = 'loaded',
  Error = 'error'
}

export interface ContentError {
  type: 'not-found' | 'parse-error' | 'validation-error';
  message: string;
  details?: string;
}