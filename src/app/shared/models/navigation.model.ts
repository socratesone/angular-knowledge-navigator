/**
 * Navigation layout and responsive behavior models
 */

export enum LayoutBreakpoint {
  MOBILE = 'mobile',     // < 768px
  TABLET = 'tablet',     // 768px - 1023px
  DESKTOP = 'desktop'    // >= 1024px
}

export interface NavigationLayout {
  currentWidth: number;         // Current panel width in pixels
  widthPercentage: number;      // Percentage of viewport width (25-30%)
  minWidth: number;             // Minimum width (280px)
  maxWidth: number;             // Maximum width (480px)
  isCollapsed: boolean;         // Mobile collapsed state
  isResizable: boolean;         // User can resize
  userPreferredWidth?: number;  // User's saved preference
  breakpoint: LayoutBreakpoint; // Current responsive breakpoint
  lastResized: Date;
}

export interface NavigationCategory {
  name: string;                 // Category name
  expanded: boolean;            // Expansion state
  topicCount: number;           // Number of topics
  displayWidth: number;         // Required display width
  isResizable: boolean;         // Can be resized by user
  userPreferredWidth?: number;  // User's preferred width
  topics: NavigationTopic[];    // Topics in this category
}

export interface NavigationTopic {
  id: string;                   // Topic identifier
  title: string;                // Display title
  slug: string;                 // URL slug
  level: number;                // Difficulty level (1-4)
  readingTime: number;          // Estimated reading time
  hasCodeExamples: boolean;     // Contains code examples
  vocabularyTermCount: number;  // Number of vocabulary terms
  isCompleted: boolean;         // User completion status
  order: number;                // Display order within category
}

export interface NavigationState {
  currentTopic?: string;        // Currently viewed topic ID
  expandedCategories: string[]; // List of expanded category names
  recentTopics: string[];       // Recently viewed topics
  bookmarkedTopics: string[];   // User bookmarked topics
  navigationHistory: NavigationHistoryEntry[]; // Navigation history
}

export interface NavigationHistoryEntry {
  topicId: string;              // Topic identifier
  timestamp: Date;              // When visited
  scrollPosition: number;       // Scroll position when left
  timeSpent: number;            // Time spent on topic (seconds)
}

export interface TopicProgress {
  topicId: string;              // Topic identifier
  completed: boolean;           // Completion status
  progress: number;             // Progress percentage (0-100)
  timeSpent: number;            // Total time spent (seconds)
  lastVisited: Date;            // Last visit timestamp
  bookmarked: boolean;          // Bookmark status
}

export interface LearningPathData {
  level: string;                // Category level (Fundamentals, etc.)
  levelNumber: number;          // Numeric level (1, 2, 3, 4)
  description?: string;         // Level description
  estimatedDuration?: number;   // Estimated completion time (hours)
  topics: LearningPathTopic[];  // Topics in this level
}

export interface LearningPathTopic {
  title: string;                // Topic title
  slug: string;                 // URL slug
  description?: string;         // Brief description
  readingTime: number;          // Estimated reading time (minutes)
  hasCodeExamples: boolean;     // Contains code examples
  vocabularyTermCount: number;  // Number of vocabulary terms
  prerequisites?: string[];     // Required prior topics
  objectives: string[];         // Learning objectives
  difficulty: number;           // Difficulty rating (1-5)
  tags: string[];               // Topic tags
}

export interface NavigationMetrics {
  totalTopics: number;          // Total available topics
  completedTopics: number;      // User completed topics
  currentStreak: number;        // Consecutive days active
  totalTimeSpent: number;       // Total learning time (minutes)
  averageSessionTime: number;   // Average session duration
  topicsPerWeek: number;        // Weekly completion rate
  lastActivity: Date;           // Last learning activity
}

export interface SearchResult {
  topicId: string;              // Topic identifier
  title: string;                // Topic title
  excerpt: string;              // Content excerpt
  relevanceScore: number;       // Search relevance (0-1)
  matchedTerms: string[];       // Matched search terms
  category: string;             // Topic category
  level: number;                // Difficulty level
}