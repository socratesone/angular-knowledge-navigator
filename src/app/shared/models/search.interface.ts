import { SkillLevel } from './content.interface';

export interface SearchResult {
  id: string;
  title: string;
  slug: string;
  level: SkillLevel;
  type: 'topic' | 'section' | 'code-example';
  excerpt: string;
  highlights: SearchHighlight[];
  relevanceScore: number;
  url: string;
}

export interface SearchHighlight {
  field: 'title' | 'content' | 'tags';
  matches: TextMatch[];
}

export interface TextMatch {
  text: string;
  start: number;
  end: number;
  isMatch: boolean;
}

export interface SearchFilters {
  levels?: SkillLevel[];
  tags?: string[];
  difficulty?: (1 | 2 | 3 | 4 | 5)[];
  contentType?: ('topic' | 'section' | 'code-example')[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface SearchQuery {
  term: string;
  filters?: SearchFilters;
  sortBy?: 'relevance' | 'date' | 'difficulty' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  query: SearchQuery;
  executionTime: number;
  suggestions?: string[];
}

