import { CodeExample } from './code-example.interface';

export interface BestPractice {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'maintainability' | 'accessibility' | 'security' | 'testing' | 'architecture';
  level: 'fundamentals' | 'intermediate' | 'advanced' | 'expert';
  constitutional: boolean;
  examples: BestPracticeExample[];
  antiPatterns: AntiPattern[];
  relatedPractices: string[];
  checklist: ChecklistItem[];
  resources: ResourceLink[];
}

export interface BestPracticeExample {
  title: string;
  description: string;
  goodExample: CodeExample;
  badExample?: CodeExample;
  explanation: string;
  benefits: string[];
}

export interface AntiPattern {
  title: string;
  description: string;
  problemCode: CodeExample;
  solutionCode: CodeExample;
  whyItsBad: string[];
  howToFix: string[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
  category: string;
  helpText?: string;
}

export interface ResourceLink {
  title: string;
  url: string;
  type: 'documentation' | 'article' | 'video' | 'tutorial' | 'reference';
  external: boolean;
}

export interface Caveat {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'gotcha' | 'limitation' | 'breaking-change' | 'deprecated' | 'performance';
  affectedVersions?: string[];
  workaround?: string;
  example?: CodeExample;
  relatedConcepts: string[];
}