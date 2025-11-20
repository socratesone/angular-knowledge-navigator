import { Pipe, PipeTransform } from '@angular/core';

export interface ContentCleanupOptions {
  removeConstitutional?: boolean;
  removeInstructions?: boolean;
  removeDigitStrings?: boolean;
  removeDuplicateCode?: boolean;
  preserveEducationalValue?: boolean;
}

@Pipe({
  name: 'contentCleanup',
  pure: true,
  standalone: true
})
export class ContentCleanupPipe implements PipeTransform {

  private defaultOptions: ContentCleanupOptions = {
    removeConstitutional: true,
    removeInstructions: true,
    removeDigitStrings: true,
    removeDuplicateCode: true,
    preserveEducationalValue: true
  };

    /**
   * Transform content by applying cleanup rules
   * @param content Content to clean up
   * @param options Optional cleanup configuration
   * @returns Cleaned content string
   */
  transform(content: any, options?: ContentCleanupOptions): string {
    if (!content) return '';

    // Handle SafeHtml objects and convert to string
    const contentString = typeof content === 'string' ? content : content.toString();
    
    const config = { ...this.defaultOptions, ...options };
    let cleanedContent = contentString;

    try {
      // Apply cleanup operations in order
      if (config.removeConstitutional) {
        cleanedContent = this.removeConstitutionalArtifacts(cleanedContent);
      }

      if (config.removeInstructions) {
        cleanedContent = this.removeInstructionalMetadata(cleanedContent);
      }

      if (config.removeDigitStrings) {
        cleanedContent = this.removeDigitArtifacts(cleanedContent);
      }

      if (config.removeDuplicateCode) {
        cleanedContent = this.removeDuplicateCodeSections(cleanedContent);
      }

      // Final cleanup and normalization
      cleanedContent = this.normalizeWhitespace(cleanedContent);
      
      // Validate educational value is preserved
      if (config.preserveEducationalValue) {
        cleanedContent = this.validateEducationalContent(cleanedContent, content);
      }

      return cleanedContent;

    } catch (error) {
      console.warn('Content cleanup failed, returning original content:', error);
      return content;
    }
  }

  /**
   * Remove constitutional badges and metadata
   * @param content Content to clean
   * @returns Cleaned content
   */
  private removeConstitutionalArtifacts(content: string): string {
    let cleaned = content;

    // Remove constitutional badges
    const constitutionalPatterns = [
      /\[!\[Constitutional[^\]]*\]\([^)]*\)\]\([^)]*\)/gi,
      /\*\*Constitutional[^*]*\*\*/gi,
      /Constitutional:\s*[^\n]*/gi,
      /<badge[^>]*constitutional[^>]*>.*?<\/badge>/gi,
      /<!--\s*Constitutional[^>]*-->/gi
    ];

    constitutionalPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove spec-driven elements
    const specPatterns = [
      /\[!\[Spec[^\]]*\]\([^)]*\)\]\([^)]*\)/gi,
      /\*\*Spec[^*]*\*\*/gi,
      /Specification:\s*[^\n]*/gi,
      /<spec[^>]*>.*?<\/spec>/gi
    ];

    specPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    return cleaned;
  }

  /**
   * Remove development instruction text
   * @param content Content to clean
   * @returns Cleaned content
   */
  private removeInstructionalMetadata(content: string): string {
    let cleaned = content;

    // Remove instructional comments and metadata
    const instructionalPatterns = [
      /<!--\s*TODO[^>]*-->/gi,
      /<!--\s*FIXME[^>]*-->/gi,
      /<!--\s*NOTE[^>]*-->/gi,
      /\[PLACEHOLDER[^\]]*\]/gi,
      /\[TODO[^\]]*\]/gi,
      /\[FIXME[^\]]*\]/gi,
      /> \*\*Note to developers?[^<]*/gi,
      /> \*\*Instructions?[^<]*/gi,
      /\*\*Implementation notes?:?\*\*[^\n]*/gi,
      /\*\*Developer notes?:?\*\*[^\n]*/gi
    ];

    instructionalPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove frontmatter fields that are not user-relevant
    const frontmatterPattern = /^---\n([\s\S]*?)\n---/;
    const frontmatterMatch = cleaned.match(frontmatterPattern);
    
    if (frontmatterMatch) {
      let frontmatter = frontmatterMatch[1];
      
      // Remove development-specific fields
      const devFields = [
        /^implementation:\s*.*$/gm,
        /^developer_notes:\s*.*$/gm,
        /^internal_id:\s*.*$/gm,
        /^review_status:\s*.*$/gm,
        /^last_reviewed:\s*.*$/gm,
        /^reviewer:\s*.*$/gm
      ];

      devFields.forEach(pattern => {
        frontmatter = frontmatter.replace(pattern, '');
      });

      // Rebuild frontmatter
      const cleanedFrontmatter = frontmatter
        .split('\n')
        .filter(line => line.trim() !== '')
        .join('\n');

      if (cleanedFrontmatter.trim()) {
        cleaned = cleaned.replace(frontmatterPattern, `---\n${cleanedFrontmatter}\n---`);
      } else {
        cleaned = cleaned.replace(frontmatterPattern, '');
      }
    }

    return cleaned;
  }

  /**
   * Remove random digit strings
   * @param content Content to clean  
   * @returns Cleaned content
   */
  private removeDigitArtifacts(content: string): string {
    let cleaned = content;

    // Remove standalone digit strings that appear above code samples
    // But preserve meaningful numbers in content
    const digitPatterns = [
      /^\d{4,}\s*$/gm,  // Lines with only 4+ digits
      /```\s*\n\d{3,}\s*\n/g,  // Digits right after opening code fence
      /\n\d{3,}\s*\n```/g,  // Digits right before closing code fence
      /^>\s*\d{4,}\s*$/gm,  // Quoted lines with only digits
    ];

    digitPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, (match) => {
        // Keep the structural elements, remove only the digits
        if (match.includes('```')) {
          return match.replace(/\d{3,}/g, '');
        }
        return '';
      });
    });

    return cleaned;
  }

  /**
   * Clean up duplicate code example sections
   * @param content Content to clean
   * @returns Cleaned content
   */
  private removeDuplicateCodeSections(content: string): string {
    let cleaned = content;

    // Remove generic "Code Examples to Include" titles
    const genericTitlePatterns = [
      /#{1,6}\s*Code Examples to Include\s*$/gm,
      /#{1,6}\s*Examples?\s*$/gm,
      /#{1,6}\s*Sample Code\s*$/gm,
      /\*\*Code Examples to Include:?\*\*/gi,
      /\*\*Examples?:?\*\*/gi
    ];

    genericTitlePatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove duplicate code blocks (same language and similar content)
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    const codeBlocks: Array<{ match: string; language: string; content: string; index: number }> = [];
    let match;

    // Collect all code blocks
    while ((match = codeBlockPattern.exec(cleaned)) !== null) {
      codeBlocks.push({
        match: match[0],
        language: match[1] || '',
        content: match[2].trim(),
        index: match.index
      });
    }

    // Find and remove duplicates (keep first occurrence)
    const seen = new Set<string>();
    const toRemove: string[] = [];

    codeBlocks.forEach(block => {
      const signature = `${block.language}:${this.normalizeCode(block.content)}`;
      
      if (seen.has(signature)) {
        toRemove.push(block.match);
      } else {
        seen.add(signature);
      }
    });

    // Remove duplicate blocks
    toRemove.forEach(blockToRemove => {
      const index = cleaned.indexOf(blockToRemove);
      if (index !== -1) {
        cleaned = cleaned.substring(0, index) + cleaned.substring(index + blockToRemove.length);
      }
    });

    return cleaned;
  }

  /**
   * Normalize whitespace and clean up formatting
   * @param content Content to normalize
   * @returns Normalized content
   */
  private normalizeWhitespace(content: string): string {
    let normalized = content;

    // Remove excessive blank lines (more than 2 consecutive)
    normalized = normalized.replace(/\n{4,}/g, '\n\n\n');

    // Remove trailing whitespace from lines
    normalized = normalized.replace(/[ \t]+$/gm, '');

    // Normalize frontmatter spacing
    normalized = normalized.replace(/^---\s*\n([\s\S]*?)\n\s*---/m, (match, frontmatter) => {
      const cleanedFrontmatter = frontmatter
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line !== '')
        .join('\n');
      return `---\n${cleanedFrontmatter}\n---`;
    });

    // Remove empty sections
    normalized = normalized.replace(/#{1,6}\s+[^\n]*\n+(?=#{1,6}|\n*$)/g, '');

    // Clean up list formatting
    normalized = normalized.replace(/^\s*-\s*$/gm, '');

    return normalized.trim();
  }

  /**
   * Validate that educational content is preserved
   * @param cleanedContent Cleaned content
   * @param originalContent Original content
   * @returns Validated content
   */
  private validateEducationalContent(cleanedContent: string, originalContent: string): string {
    // Check if too much content was removed (more than 50% reduction might be excessive)
    const originalLength = originalContent.length;
    const cleanedLength = cleanedContent.length;
    const reductionPercentage = ((originalLength - cleanedLength) / originalLength) * 100;

    if (reductionPercentage > 50) {
      console.warn(`Content cleanup removed ${reductionPercentage.toFixed(1)}% of content. Validating educational value preservation.`);
    }

    // Ensure essential educational elements are preserved
    const essentialPatterns = [
      /#{1,6}\s+[^#\n]+/g,  // Headings
      /```[\s\S]*?```/g,    // Code blocks
      /\*\*[^*]+\*\*/g,     // Bold text (likely important terms)
      /`[^`]+`/g,           // Inline code
      /^\s*[-*+]\s+/gm      // List items
    ];

    let hasEssentialContent = false;
    essentialPatterns.forEach(pattern => {
      if (pattern.test(cleanedContent)) {
        hasEssentialContent = true;
      }
    });

    if (!hasEssentialContent && originalContent.length > 100) {
      console.warn('Cleanup may have removed too much educational content. Returning less aggressive cleanup.');
      // Return content with only basic cleanup
      return this.removeConstitutionalArtifacts(
        this.removeDigitArtifacts(originalContent)
      );
    }

    return cleanedContent;
  }

  /**
   * Normalize code content for comparison
   * @param code Code content
   * @returns Normalized code
   */
  private normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
      .replace(/\/\/.*$/gm, '')          // Remove single-line comments
      .trim()
      .toLowerCase();
  }
}