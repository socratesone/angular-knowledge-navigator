import { Injectable } from '@angular/core';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface ProcessedContent {
  html: SafeHtml;
  headings: ContentHeading[];
  codeBlocks: CodeBlock[];
  estimatedReadingTime: number;
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
  }

  /**
   * Process markdown content into safe HTML with metadata
   */
  processMarkdown(markdown: string): ProcessedContent {
    const headings: ContentHeading[] = [];
    const codeBlocks: CodeBlock[] = [];
    
    // Configure renderer to extract metadata
    const renderer = new marked.Renderer();
    
    // Override heading renderer to collect headings
    renderer.heading = (text: string, level: number): string => {
      const id = this.slugify(text);
      headings.push({ id, text, level });
      return `<h${level} id="${id}">${text}</h${level}>`;
    };

    // Override code renderer to collect code blocks
    renderer.code = (code: string, language: string | undefined): string => {
      const lang = language || 'text';
      codeBlocks.push({
        language: lang,
        code: code,
        lineCount: code.split('\n').length
      });
      
      return `<pre><code class="language-${lang}">${this.escapeHtml(code)}</code></pre>`;
    };

    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true
    });

    const html = marked(markdown) as string;
    const safeHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    
    return {
      html: safeHtml,
      headings,
      codeBlocks,
      estimatedReadingTime: this.calculateReadingTime(markdown)
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
}