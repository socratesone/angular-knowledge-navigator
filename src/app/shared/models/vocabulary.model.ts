/**
 * Vocabulary and concept definition models for educational tooltips
 */

export enum VocabularyCategory {
  ANGULAR_CORE = 'angular-core',
  TYPESCRIPT = 'typescript',
  REACTIVE_PROGRAMMING = 'reactive-programming',
  TESTING = 'testing',
  ARCHITECTURE = 'architecture',
  WEB_APIS = 'web-apis',
  TOOLING = 'tooling'
}

export enum SkillLevel {
  FUNDAMENTALS = 'fundamentals',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface ConceptVocabulary {
  id: string;                    // Unique identifier (e.g., "angular-component")
  term: string;                  // Display term (e.g., "Component")
  category: VocabularyCategory;  // Grouping category
  definition: string;            // Brief definition for inline tooltips
  detailedExplanation: string;   // Extended explanation for hover tooltips
  relatedArticles: string[];     // Article IDs that cover this concept
  keywords: string[];            // Alternative terms and synonyms
  codeContext?: string;          // Specific context when used in code
  difficultyLevel: SkillLevel;   // Concept difficulty level
  createdAt: string;             // ISO date string
  updatedAt: string;             // ISO date string
}

export interface VocabularyReference {
  term: string;                 // Vocabulary term
  conceptId: string;            // Vocabulary entry ID
  position: TextPosition;       // Position in content
  context: string;              // Surrounding context
  confidence: number;           // Detection confidence (0-1)
}

export interface TextPosition {
  line: number;                 // Line number
  column: number;               // Column position
  offset: number;               // Character offset from start
  length: number;               // Term length
}

export interface CodeComment {
  line: number;                 // Line number
  text: string;                 // Comment text
  type: 'inline' | 'block' | 'docstring'; // Comment type
  vocabularyTerms: string[];    // Referenced concepts
}

export interface ProcessedCodeBlock {
  id: string;                   // Unique identifier
  language: string;             // Programming language
  code: string;                 // Source code
  title?: string;               // Block title
  description?: string;         // Block description
  lineNumbers: boolean;         // Show line numbers
  highlightedLines?: number[];  // Lines to highlight
  vocabularyTerms: VocabularyReference[]; // Detected terms
  comments: CodeComment[];      // Inline comments
}

export interface ProcessingError {
  type: 'warning' | 'error';    // Severity level
  message: string;              // Error description
  location?: TextPosition;      // Error location
  suggestion?: string;          // Suggested fix
}

export interface ContentProcessingResult {
  originalContent: string;      // Raw markdown content
  cleanedContent: string;       // Processed content without artifacts
  metadata: ArticleMetadata;    // Extracted metadata
  codeBlocks: ProcessedCodeBlock[]; // Enhanced code examples
  vocabularyReferences: VocabularyReference[]; // Identified concepts
  processingErrors: ProcessingError[]; // Any issues encountered
  processedAt: Date;
}

export interface ArticleMetadata {
  id: string;                    // Article identifier
  title: string;                 // Article title
  level: SkillLevel;            // Difficulty level
  category: string;             // Category (fundamentals, intermediate, etc.)
  readingTime: number;          // Estimated reading time in minutes
  wordCount: number;            // Total word count
  codeBlockCount: number;       // Number of code examples
  tableOfContents: TOCSection[]; // Generated table of contents
  hasInteractiveExamples: boolean; // Contains executable code
  tags: string[];               // Topic tags
  relatedTopics: string[];      // Related article IDs
  nextTopic?: string;           // Next recommended article ID
  lastUpdated: Date;
  contentHash: string;          // Hash for change detection
}

export interface TOCSection {
  id: string;                   // Anchor ID
  title: string;                // Section title
  level: number;                // Heading level (1-6)
  children: TOCSection[];       // Nested sections
  startPosition: number;        // Character position in content
}