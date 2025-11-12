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
  language: string;
  code: string;
  lineCount: number;
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
      codeBlocks.push({
        language: lang,
        code: code,
        lineCount: code.split('\n').length
      });
      
      // Use Prism.js for syntax highlighting
      let highlightedCode: string;
      try {
        if (lang && Prism.languages[lang]) {
          highlightedCode = Prism.highlight(code, Prism.languages[lang], lang);
        } else {
          highlightedCode = this.escapeHtml(code);
        }
      } catch (error) {
        console.warn(`Prism.js highlighting failed for language: ${lang}`, error);
        highlightedCode = this.escapeHtml(code);
      }
      
      return `<pre class="language-${lang}"><code class="language-${lang}">${highlightedCode}</code></pre>`;
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
    
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
      const language = match[1] || 'text';
      const code = match[2].trim();
      codeBlocks.push({
        language,
        code,
        lineCount: code.split('\n').length
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
   * Check if a language is supported for highlighting
   */
  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language) || 
           (language in Prism.languages);
  }
}