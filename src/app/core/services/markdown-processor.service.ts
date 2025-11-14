import { Injectable } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as Prism from 'prismjs';
import * as yaml from 'js-yaml';

import { 
  ArticleMetadata, 
  TOCSection, 
  ProcessedCodeBlock,
  SkillLevel 
} from '../../shared/models/vocabulary.model';

// Import specific language support
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';

export interface ProcessedContent {
  html: SafeHtml;
  headings: ContentHeading[];
  codeBlocks: CodeBlock[];
  estimatedReadingTime: number;
  frontmatter?: ContentFrontmatter;
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

export interface ContentHeading {
  id: string;
  text: string;
  level: number;
}

export interface CodeBlock {
  id: string;
  language: string;
  detectedLanguage?: string;
  code: string;
  lineCount: number;
  startLine?: number;
  fileName?: string;
  title?: string;
  category?: string;
  tags?: string[];
  isCollapsible?: boolean;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class MarkdownProcessorService {
  
  constructor(private sanitizer: DomSanitizer) {
    this.configureMarked();
    this.loadPrismTheme();
  }

  /**
   * Process markdown content into safe HTML with metadata
   */
  processMarkdown(markdown: string): ProcessedContent {
    const headings: ContentHeading[] = [];
    const codeBlocks: CodeBlock[] = [];
    
    // Extract frontmatter and clean content
    const { content: cleanMarkdown, frontmatter } = this.extractFrontmatter(markdown);
    
    // Configure renderer to extract metadata
    const renderer = new marked.Renderer();
    
    // Keep track of used anchor IDs to ensure uniqueness
    const usedAnchorIds = new Set<string>();

    // Override heading renderer to collect headings with unique anchor IDs
    renderer.heading = (text: string, level: number): string => {
      const baseId = this.slugify(text);
      let uniqueId = baseId;
      let counter = 1;
      
      // Ensure unique ID
      while (usedAnchorIds.has(uniqueId)) {
        counter++;
        uniqueId = `${baseId}-${counter}`;
      }
      
      usedAnchorIds.add(uniqueId);
      headings.push({ id: uniqueId, text, level });
      
      // Enhanced heading with accessibility and navigation attributes
      return `<h${level} id="${uniqueId}" class="content-heading level-${level}" tabindex="-1" data-toc-anchor="${uniqueId}">
        <a href="#${uniqueId}" class="heading-anchor" aria-label="Link to ${text}" title="Link to this section">
          <span class="heading-text">${text}</span>
          <span class="anchor-icon" aria-hidden="true">#</span>
        </a>
      </h${level}>`;
    };

    // Override code renderer to collect code blocks and apply Prism.js highlighting
    renderer.code = (code: string, language: string | undefined): string => {
      const lang = language || 'text';
      const detectedLang = this.detectLanguage(code, lang);
      const codeId = this.generateCodeBlockId(codeBlocks.length);
      
      // Clean code by removing random digit strings and artifacts
      const cleanedCode = this.cleanCodeBlock(code);
      
      // Parse code block metadata from comments or attributes
      const metadata = this.parseCodeBlockMetadata(cleanedCode, lang);
      
      codeBlocks.push({
        id: codeId,
        language: lang,
        detectedLanguage: detectedLang,
        code: cleanedCode,
        lineCount: cleanedCode.split('\n').length,
        showLineNumbers: metadata.showLineNumbers ?? (cleanedCode.split('\n').length > 10),
        ...metadata
      });
      
      // Use Prism.js for enhanced syntax highlighting
      let highlightedCode: string;
      const targetLang = detectedLang || lang;
      
      try {
        if (targetLang && Prism.languages[targetLang]) {
          highlightedCode = Prism.highlight(cleanedCode, Prism.languages[targetLang], targetLang);
        } else {
          highlightedCode = this.escapeHtml(cleanedCode);
        }
      } catch (error) {
        console.warn(`Prism.js highlighting failed for language: ${targetLang}`, error);
        highlightedCode = this.escapeHtml(cleanedCode);
      }
      
      // Generate enhanced HTML with line numbers and metadata
      return this.generateEnhancedCodeBlock(highlightedCode, {
        id: codeId,
        language: targetLang,
        lineCount: cleanedCode.split('\n').length,
        showLineNumbers: metadata.showLineNumbers ?? (cleanedCode.split('\n').length > 10),
        title: metadata.title,
        fileName: metadata.fileName,
        isCollapsible: metadata.isCollapsible,
        highlightLines: metadata.highlightLines
      });
    };

    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true
    });

    const html = marked(cleanMarkdown) as string;
    const safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    
    return {
      html: safeHtml,
      headings,
      codeBlocks,
      estimatedReadingTime: this.calculateReadingTime(cleanMarkdown),
      frontmatter
    };
  }

  /**
   * Extract just the headings for table of contents
   */
  extractHeadings(markdown: string): ContentHeading[] {
    const headings: ContentHeading[] = [];
    const lines = markdown.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = this.slugify(text);
        headings.push({ id, text, level });
      }
    });
    
    return headings;
  }

  /**
   * Extract code blocks for analysis
   */
  extractCodeBlocks(markdown: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;
    
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      const detectedLang = this.detectLanguage(code, language);
      const metadata = this.parseCodeBlockMetadata(code, language);
      
      codeBlocks.push({
        id: this.generateCodeBlockId(blockIndex++),
        language,
        detectedLanguage: detectedLang,
        code,
        lineCount: code.split('\n').length,
        showLineNumbers: metadata.showLineNumbers ?? (code.split('\n').length > 10),
        ...metadata
      });
    }
    
    return codeBlocks;
  }

  /**
   * Calculate estimated reading time (average 200 words per minute)
   */
  private calculateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Convert text to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clean code blocks by removing random digit strings and rendering artifacts
   */
  private cleanCodeBlock(code: string): string {
    return code
      // Remove standalone digit sequences (3+ digits not part of code)
      .replace(/^\d{3,}$/gm, '')
      // Remove digit strings that appear above code samples (common pattern)
      .replace(/^\d{3,}\n/gm, '')
      // Remove lines that are only digits and whitespace
      .replace(/^\s*\d{3,}\s*$/gm, '')
      // Remove constitutional badges and development artifacts
      .replace(/\[Constitutional[^\]]*\]/gi, '')
      .replace(/\*\*Constitutional\*\*/gi, '')
      // Remove TODO/FIXME/NOTE comments that aren't part of actual code
      .replace(/^\s*(\/\/|#|<!--)\s*(TODO|FIXME|NOTE).*$/gm, '')
      // Clean up excessive whitespace but preserve code indentation
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Extract YAML frontmatter from markdown content
   */
  private extractFrontmatter(markdown: string): { content: string; frontmatter?: ContentFrontmatter } {
    // Check if content starts with frontmatter delimiter
    if (!markdown.startsWith('---\n')) {
      return { content: markdown };
    }

    // Find the closing delimiter
    const frontmatterEndIndex = markdown.indexOf('\n---\n', 4);
    if (frontmatterEndIndex === -1) {
      // No closing delimiter found, treat as regular content
      return { content: markdown };
    }

    try {
      // Extract YAML content (skip the opening '---\n')
      const yamlContent = markdown.substring(4, frontmatterEndIndex);
      
      // Parse YAML frontmatter
      const frontmatter = yaml.load(yamlContent) as ContentFrontmatter;
      
      // Extract the main content (skip the closing '\n---\n')
      const content = markdown.substring(frontmatterEndIndex + 5).trim();
      
      return { content, frontmatter };
    } catch (error) {
      console.warn('Failed to parse YAML frontmatter:', error);
      // If YAML parsing fails, return the original content without frontmatter
      const content = markdown.substring(frontmatterEndIndex + 5).trim();
      return { content };
    }
  }

  /**
   * Configure marked with safe defaults
   */
  private configureMarked(): void {
    marked.setOptions({
      breaks: true,
      gfm: true
    });
  }

  /**
   * Generate table of contents HTML from headings
   */
  generateTableOfContents(headings: ContentHeading[]): SafeHtml {
    if (headings.length === 0) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    let tocHtml = '<nav class="table-of-contents"><ul>';
    
    headings.forEach(heading => {
      const indent = '  '.repeat(heading.level - 1);
      tocHtml += `${indent}<li><a href="#${heading.id}">${heading.text}</a></li>`;
    });
    
    tocHtml += '</ul></nav>';
    
    return this.sanitizer.bypassSecurityTrustHtml(tocHtml);
  }

  /**
   * Load Prism.js CSS theme for syntax highlighting
   */
  private loadPrismTheme(): void {
    // Check if theme is already loaded
    if (document.querySelector('link[data-prism-theme]')) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
    link.setAttribute('data-prism-theme', 'tomorrow');
    document.head.appendChild(link);
  }

  /**
   * Get supported languages for syntax highlighting
   */
  getSupportedLanguages(): string[] {
    return [
      'typescript',
      'javascript', 
      'html',
      'css',
      'scss',
      'json',
      'bash',
      'markdown',
      'text'
    ];
  }

  /**
   * Generate unique ID for code blocks
   */
  private generateCodeBlockId(index: number): string {
    return `code-block-${index}-${Date.now()}`;
  }

  /**
   * Detect programming language from code content
   */
  private detectLanguage(code: string, declaredLang: string): string {
    // If language is explicitly declared and valid, use it
    if (declaredLang && declaredLang !== 'text' && Prism.languages[declaredLang]) {
      return declaredLang;
    }

    // Simple heuristics for language detection
    const codeLines = code.trim().split('\n');
    const firstLine = codeLines[0]?.trim() || '';
    const codeContent = code.toLowerCase();

    // TypeScript/JavaScript detection
    if (codeContent.includes('interface ') || 
        codeContent.includes('type ') || 
        codeContent.includes(': string') ||
        codeContent.includes(': number') ||
        codeContent.includes('readonly ')) {
      return 'typescript';
    }

    if (codeContent.includes('function ') || 
        codeContent.includes('const ') || 
        codeContent.includes('let ') ||
        codeContent.includes('var ') ||
        codeContent.includes('=>')) {
      return 'javascript';
    }

    // HTML detection
    if (codeContent.includes('<html>') || 
        codeContent.includes('<!doctype') ||
        (codeContent.includes('<') && codeContent.includes('>'))) {
      return 'html';
    }

    // CSS/SCSS detection
    if (codeContent.includes('{') && 
        (codeContent.includes('color:') || 
         codeContent.includes('background:') ||
         codeContent.includes('margin:') ||
         codeContent.includes('$'))) {
      return codeContent.includes('$') ? 'scss' : 'css';
    }

    // JSON detection
    if ((firstLine.startsWith('{') || firstLine.startsWith('[')) &&
        codeContent.includes('"') && codeContent.includes(':')) {
      return 'json';
    }

    // Bash/Shell detection
    if (firstLine.startsWith('#!') || 
        codeContent.includes('npm ') ||
        codeContent.includes('ng ') ||
        codeContent.includes('$ ')) {
      return 'bash';
    }

    return declaredLang || 'text';
  }

  /**
   * Parse metadata from code block comments
   */
  private parseCodeBlockMetadata(code: string, language: string): Partial<CodeBlock> {
    const metadata: Partial<CodeBlock> = {};
    const lines = code.split('\n');
    
    // Look for metadata in first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim();
      
      // Title from comment
      if (line.startsWith('// Title:') || line.startsWith('/* Title:')) {
        metadata.title = line.replace(/^(\/\/|\/\*)\s*Title:\s*/, '').replace(/\*\/$/, '').trim();
      }
      
      // Filename from comment
      if (line.startsWith('// File:') || line.startsWith('/* File:')) {
        metadata.fileName = line.replace(/^(\/\/|\/\*)\s*File:\s*/, '').replace(/\*\/$/, '').trim();
      }
      
      // Category from comment
      if (line.startsWith('// Category:') || line.startsWith('/* Category:')) {
        metadata.category = line.replace(/^(\/\/|\/\*)\s*Category:\s*/, '').replace(/\*\/$/, '').trim();
      }
      
      // Tags from comment
      if (line.startsWith('// Tags:') || line.startsWith('/* Tags:')) {
        const tagsStr = line.replace(/^(\/\/|\/\*)\s*Tags:\s*/, '').replace(/\*\/$/, '').trim();
        metadata.tags = tagsStr.split(',').map(tag => tag.trim());
      }
    }
    
    // Set defaults based on language and content
    metadata.isCollapsible = lines.length > 20;
    metadata.showLineNumbers = lines.length > 10;
    
    // Normalize and standardize title if present or infer one
    metadata.title = this.standardizeCodeBlockTitle(metadata.title, metadata.fileName, language, code);

    return metadata;
  }

  /**
   * Standardize code block titles: replace generic headings with descriptive titles
   */
  private standardizeCodeBlockTitle(title: string | undefined, fileName: string | undefined, language: string, code: string): string | undefined {
    const genericPatterns = [
      /code examples to include/i,
      /^code examples?$/i,
      /^example$/i,
      /^sample$/i,
      /^snippet$/i,
      /^code snippet$/i,
      /^example:\s*$/i
    ];

    if (title) {
      const trimmed = title.trim();
      // If title is generic, replace it
      for (const pat of genericPatterns) {
        if (pat.test(trimmed)) {
          // Prefer filename if available
          if (fileName) return fileName;
          // Else use language-based title
          return `Example (${language || 'code'})`;
        }
      }

      // If title already looks descriptive, return as-is
      return trimmed;
    }

    // No title present: infer from filename, first non-empty comment line, or language
    if (fileName) return fileName;

    // Try to infer a short description from first comment line
    const firstComment = code.split('\n').find(l => l.trim().startsWith('//') || l.trim().startsWith('/*'));
    if (firstComment) {
      const inferred = firstComment.replace(/^(\/\/|\/\*)\s*/, '').replace(/\*\/$/, '').trim();
      if (inferred.length > 3 && inferred.length < 80) return inferred;
    }

    // Fallback to language
    return language ? `Example (${language})` : undefined;
  }

  /**
   * Generate enhanced HTML for code blocks with line numbers and metadata
   */
  private generateEnhancedCodeBlock(highlightedCode: string, options: {
    id: string;
    language: string;
    lineCount: number;
    showLineNumbers?: boolean;
    title?: string;
    fileName?: string;
    isCollapsible?: boolean;
    highlightLines?: number[];
  }): string {
    const { id, language, showLineNumbers, title, fileName, isCollapsible } = options;
    
    let html = `<div class="enhanced-code-block" data-code-id="${id}" data-language="${language}">`;
    
    // Header with metadata
    if (title || fileName) {
      html += `<div class="code-header">`;
      if (title) {
        html += `<span class="code-title">${title}</span>`;
      }
      if (fileName) {
        html += `<span class="code-filename">${fileName}</span>`;
      }
      html += `<div class="code-actions">
        <button class="copy-code-btn" data-code-id="${id}" title="Copy to clipboard">
          <span class="material-icons">content_copy</span>
        </button>
      </div>`;
      html += `</div>`;
    }
    
    // Code content with optional line numbers
    if (showLineNumbers) {
      const lines = highlightedCode.split('\n');
      html += `<div class="code-container">
        <div class="line-numbers">`;
      
      for (let i = 1; i <= lines.length; i++) {
        html += `<span class="line-number">${i}</span>`;
      }
      
      html += `</div>
        <pre class="language-${language}"><code class="language-${language}">${highlightedCode}</code></pre>
      </div>`;
    } else {
      html += `<pre class="language-${language}"><code class="language-${language}">${highlightedCode}</code></pre>`;
    }
    
    html += `</div>`;
    
    return html;
  }

  /**
   * Check if a language is supported for highlighting
   */
  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language) || 
           (language in Prism.languages);
  }

  /**
   * Extract comprehensive article metadata
   * @param markdown Raw markdown content
   * @param articleId Article identifier
   * @returns Complete article metadata
   */
  extractArticleMetadata(markdown: string, articleId: string): ArticleMetadata {
    const { content, frontmatter } = this.extractFrontmatter(markdown);
    const headings = this.extractHeadings(content);
    const codeBlocks = this.extractCodeBlocks(content);
    const wordCount = this.countWords(content);
    const readingTime = this.calculateReadingTime(content);

    // Enhanced metadata extraction with advanced reading time calculation
    const enhancedReadingTime = this.calculateEnhancedReadingTime(content, this.getComplexityMultiplier(frontmatter?.skillLevel));

    return {
      id: articleId,
      title: frontmatter?.title || this.extractTitleFromContent(content) || 'Untitled',
      level: this.mapSkillLevel(frontmatter?.skillLevel || frontmatter?.category),
      category: this.extractCategory(articleId, frontmatter?.category),
      readingTime: enhancedReadingTime,
      wordCount,
      codeBlockCount: codeBlocks.length,
      tableOfContents: this.buildTOCHierarchy(headings),
      hasInteractiveExamples: this.hasInteractiveExamples(codeBlocks),
      tags: this.extractTags(frontmatter, content),
      relatedTopics: frontmatter?.relatedTopics || [],
      nextTopic: frontmatter?.['nextTopic'],
      lastUpdated: frontmatter?.lastUpdated ? new Date(frontmatter.lastUpdated) : new Date(),
      contentHash: this.generateContentHash(content),
      // Additional metadata from frontmatter
      description: frontmatter?.['description'] || this.extractDescription(content),
      author: frontmatter?.['author'],
      version: frontmatter?.['version'],
      difficulty: frontmatter?.['difficulty'] || this.calculateDifficulty(codeBlocks.length, headings.length),
      prerequisites: frontmatter?.['prerequisites'] || [],
      estimatedTime: frontmatter?.['estimatedReadingTime'] || enhancedReadingTime
    };
  }

  /**
   * Calculate enhanced reading time with complexity factors
   */
  private calculateEnhancedReadingTime(content: string, complexityMultiplier: number = 1.0): number {
    const wordCount = this.countWords(content);
    const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
    const inlineCode = (content.match(/`[^`]+`/g) || []).length;
    const images = (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
    const lists = (content.match(/^\s*[-*+]\s/gm) || []).length;

    // Base reading time (200 words per minute)
    let readingTime = wordCount / 200;
    
    // Add time for code blocks (1.5 minutes each)
    readingTime += codeBlocks * 1.5;
    
    // Add time for inline code (6 seconds each)
    readingTime += inlineCode * 0.1;
    
    // Add time for images (30 seconds each)
    readingTime += images * 0.5;
    
    // Add time for lists (3 seconds per item)
    readingTime += lists * 0.05;
    
    // Apply complexity multiplier
    readingTime *= complexityMultiplier;
    
    return Math.max(1, Math.round(readingTime));
  }

  /**
   * Get complexity multiplier based on skill level
   */
  private getComplexityMultiplier(skillLevel?: string): number {
    const multipliers = {
      'fundamentals': 0.8,
      'intermediate': 1.0,
      'advanced': 1.3,
      'expert': 1.5
    };
    
    return multipliers[skillLevel?.toLowerCase() as keyof typeof multipliers] || 1.0;
  }

  /**
   * Extract tags from frontmatter and content analysis
   */
  private extractTags(frontmatter: any, content: string): string[] {
    const tags = [...(frontmatter?.tags || [])];
    
    // Add auto-detected tags based on content
    if (content.includes('@Component')) tags.push('component');
    if (content.includes('@Injectable')) tags.push('service');
    if (content.includes('@Directive')) tags.push('directive');
    if (content.includes('@Pipe')) tags.push('pipe');
    if (content.includes('FormControl')) tags.push('forms');
    if (content.includes('Router')) tags.push('routing');
    if (content.includes('HttpClient')) tags.push('http');
    if (content.includes('Observable')) tags.push('rxjs');
    if (content.includes('signal(')) tags.push('signals');
    
    // Remove duplicates and return
    return [...new Set(tags)];
  }

  /**
   * Extract description from content or frontmatter
   */
  private extractDescription(content: string): string {
    // Try to find first paragraph after title
    const lines = content.split('\n');
    let firstParagraph = '';
    let foundTitle = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) continue;
      
      // Skip title (starts with #)
      if (trimmed.startsWith('#')) {
        foundTitle = true;
        continue;
      }
      
      // First non-empty, non-title line is likely the description
      if (foundTitle && trimmed.length > 0) {
        firstParagraph = trimmed;
        break;
      }
    }
    
    // Truncate to reasonable length
    return firstParagraph.length > 200 
      ? firstParagraph.substring(0, 197) + '...'
      : firstParagraph;
  }

  /**
   * Calculate difficulty score based on content complexity
   */
  private calculateDifficulty(codeBlockCount: number, headingCount: number): number {
    // Simple heuristic: more code blocks and sections = higher difficulty
    const codeComplexity = Math.min(codeBlockCount * 0.5, 3);
    const structureComplexity = Math.min(headingCount * 0.2, 2);
    
    return Math.min(5, Math.max(1, Math.round(codeComplexity + structureComplexity)));
  }

  /**
   * Generate table of contents with proper hierarchy
   * @param content Markdown content
   * @returns Hierarchical TOC structure
   */
  generateTOCFromContent(content: string): TOCSection[] {
    const headings = this.extractHeadings(content);
    return this.buildTOCHierarchy(headings);
  }

  /**
   * Calculate reading time with configurable words per minute
   * @param content Text content
   * @param wordsPerMinute Reading speed (default: 250)
   * @returns Estimated reading time in minutes
   */
  calculateReadingTimeCustom(content: string, wordsPerMinute: number = 250): number {
    const wordCount = this.countWords(content);
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Generate anchor IDs for headings
   * @param title Heading text
   * @returns URL-safe anchor ID
   */
  generateAnchorId(title: string): string {
    return this.slugify(title);
  }

  /**
   * Process content for vocabulary term detection
   * @param content Markdown content
   * @returns Enhanced content with term markers
   */
  prepareContentForVocabulary(content: string): string {
    // Add data attributes to potential vocabulary terms
    let processedContent = content;

    // Common Angular terms that should be highlighted
    const angularTerms = [
      'Component', 'Service', 'Directive', 'Pipe', 'Module',
      'Injectable', 'ViewChild', 'Input', 'Output', 'EventEmitter',
      'Observable', 'Subscription', 'Router', 'ActivatedRoute',
      'FormControl', 'FormGroup', 'Validators'
    ];

    angularTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      processedContent = processedContent.replace(regex, 
        `<span data-vocabulary-term="${term.toLowerCase()}" class="vocabulary-term">${term}</span>`
      );
    });

    return processedContent;
  }

  /**
   * Build hierarchical TOC structure from flat headings
   * @param headings Flat array of headings
   * @returns Hierarchical TOC structure
   */
  private buildTOCHierarchy(headings: ContentHeading[]): TOCSection[] {
    const toc: TOCSection[] = [];
    const stack: TOCSection[] = [];

    headings.forEach((heading, index) => {
      const section: TOCSection = {
        id: heading.id,
        title: heading.text,
        level: heading.level,
        children: [],
        startPosition: index
      };

      // Find the correct parent level
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        toc.push(section);
      } else {
        stack[stack.length - 1].children.push(section);
      }

      stack.push(section);
    });

    return toc;
  }

  /**
   * Extract title from content if not in frontmatter
   * @param content Markdown content
   * @returns Extracted title or null
   */
  private extractTitleFromContent(content: string): string | null {
    const firstHeading = content.match(/^#\s+(.+)$/m);
    return firstHeading ? firstHeading[1].trim() : null;
  }

  /**
   * Map skill level from various formats
   * @param level Level from frontmatter
   * @returns Standardized skill level
   */
  private mapSkillLevel(level?: string): SkillLevel {
    if (!level) return SkillLevel.FUNDAMENTALS;
    
    const normalizedLevel = level.toLowerCase();
    
    if (normalizedLevel.includes('fundamental') || normalizedLevel.includes('beginner') || normalizedLevel.includes('basic')) {
      return SkillLevel.FUNDAMENTALS;
    }
    if (normalizedLevel.includes('intermediate') || normalizedLevel.includes('medium')) {
      return SkillLevel.INTERMEDIATE;
    }
    if (normalizedLevel.includes('advanced') || normalizedLevel.includes('expert')) {
      return SkillLevel.ADVANCED;
    }
    if (normalizedLevel.includes('expert') || normalizedLevel.includes('master')) {
      return SkillLevel.EXPERT;
    }

    return SkillLevel.FUNDAMENTALS;
  }

  /**
   * Extract category from article ID or frontmatter
   * @param articleId Article identifier
   * @param frontmatterCategory Category from frontmatter
   * @returns Article category
   */
  private extractCategory(articleId: string, frontmatterCategory?: string): string {
    if (frontmatterCategory) return frontmatterCategory;
    
    // Extract from path structure (e.g., "fundamentals/introduction-to-angular")
    const pathParts = articleId.split('/');
    return pathParts.length > 1 ? pathParts[0] : 'general';
  }

  /**
   * Count words in text content
   * @param content Text content
   * @returns Word count
   */
  private countWords(content: string): number {
    // Remove code blocks and inline code for more accurate count
    const textOnly = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '')        // Remove inline code
      .replace(/[#*_[\]()]/g, ' ')    // Remove markdown formatting
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim();

    return textOnly ? textOnly.split(/\s+/).length : 0;
  }

  /**
   * Check if code blocks contain interactive examples
   * @param codeBlocks Array of code blocks
   * @returns True if interactive examples found
   */
  private hasInteractiveExamples(codeBlocks: CodeBlock[]): boolean {
    return codeBlocks.some(block => 
      block.code.includes('@Component') ||
      block.code.includes('ngOnInit') ||
      block.code.includes('constructor') ||
      block.title?.toLowerCase().includes('example') ||
      block.title?.toLowerCase().includes('demo')
    );
  }

  /**
   * Generate content hash for change detection
   * @param content Content to hash
   * @returns Content hash
   */
  private generateContentHash(content: string): string {
    // Simple hash function for content change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}