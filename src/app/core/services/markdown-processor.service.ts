import { Injectable } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as Prism from 'prismjs';
import * as yaml from 'js-yaml';

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
    
    // Override heading renderer to collect headings
    renderer.heading = (text: string, level: number): string => {
      const id = this.slugify(text);
      headings.push({ id, text, level });
      return `<h${level} id="${id}">${text}</h${level}>`;
    };

    // Override code renderer to collect code blocks and apply Prism.js highlighting
    renderer.code = (code: string, language: string | undefined): string => {
      const lang = language || 'text';
      const detectedLang = this.detectLanguage(code, lang);
      const codeId = this.generateCodeBlockId(codeBlocks.length);
      
      // Parse code block metadata from comments or attributes
      const metadata = this.parseCodeBlockMetadata(code, lang);
      
      codeBlocks.push({
        id: codeId,
        language: lang,
        detectedLanguage: detectedLang,
        code: code,
        lineCount: code.split('\n').length,
        showLineNumbers: metadata.showLineNumbers ?? (code.split('\n').length > 10),
        ...metadata
      });
      
      // Use Prism.js for enhanced syntax highlighting
      let highlightedCode: string;
      const targetLang = detectedLang || lang;
      
      try {
        if (targetLang && Prism.languages[targetLang]) {
          highlightedCode = Prism.highlight(code, Prism.languages[targetLang], targetLang);
        } else {
          highlightedCode = this.escapeHtml(code);
        }
      } catch (error) {
        console.warn(`Prism.js highlighting failed for language: ${targetLang}`, error);
        highlightedCode = this.escapeHtml(code);
      }
      
      // Generate enhanced HTML with line numbers and metadata
      return this.generateEnhancedCodeBlock(highlightedCode, {
        id: codeId,
        language: targetLang,
        lineCount: code.split('\n').length,
        showLineNumbers: metadata.showLineNumbers ?? (code.split('\n').length > 10),
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
    
    return metadata;
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
}