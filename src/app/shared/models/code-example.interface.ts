export interface CodeExample {
  id: string;
  title: string;
  description: string;
  language: 'typescript' | 'html' | 'scss' | 'json' | 'bash';
  code: string;
  explanation: string;
  bestPractice: boolean;
  constitutional: boolean;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  relatedConcepts: string[];
  prerequisites: string[];
  caveats?: string[];
  output?: string;
  category: 'component' | 'service' | 'directive' | 'pipe' | 'template' | 'configuration' | 'testing';
}

export interface CodeSnippet {
  language: string;
  code: string;
  lineCount: number;
  startLine?: number;
  endLine?: number;
  highlight?: number[];
}

export interface CodeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}