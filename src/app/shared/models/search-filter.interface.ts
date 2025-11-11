import { SkillLevel } from './content.interface';

export interface SearchFilter {
  query: string;
  categories: SearchCategory[];
  skillLevels: SkillLevel[];
  tags: string[];
  constitutional: boolean | null;
  difficulty: {
    min: number;
    max: number;
  };
  hasCodeExamples: boolean | null;
  hasBestPractices: boolean | null;
}

export interface SearchResultGroup {
  skillLevel: SkillLevel;
  results: SearchResultItem[];
  totalCount: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  skillLevel: SkillLevel;
  difficulty: number;
  tags: string[];
  constitutional: boolean;
  hasCodeExamples: boolean;
  hasBestPractices: boolean;
  contentPath: string;
  relevanceScore: number;
  highlightedContent: string[];
  matchType: SearchMatchType;
}

export interface SearchState {
  query: string;
  filters: SearchFilter;
  results: SearchResultItem[];
  groupedResults: SearchResultGroup[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  totalResults: number;
  searchTime: number;
  suggestions: SearchSuggestion[];
}

export enum SearchCategory {
  Components = 'components',
  Services = 'services',
  Directives = 'directives',
  Pipes = 'pipes',
  Forms = 'forms',
  Routing = 'routing',
  Testing = 'testing',
  Performance = 'performance',
  Architecture = 'architecture',
  BestPractices = 'best-practices'
}

export enum SearchMatchType {
  Exact = 'exact',
  Partial = 'partial',
  Fuzzy = 'fuzzy',
  Semantic = 'semantic'
}

export interface SearchHighlightItem {
  text: string;
  isHighlighted: boolean;
  matchType: SearchMatchType;
}

export interface SearchSuggestion {
  text: string;
  type: 'topic' | 'tag' | 'category';
  count: number;
}