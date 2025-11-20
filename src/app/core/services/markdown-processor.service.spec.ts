import { expect } from '@jest/globals';
import { TestBed } from '@angular/core/testing';
import { MarkdownProcessorService } from './markdown-processor.service';

describe('MarkdownProcessorService', () => {
  let service: MarkdownProcessorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MarkdownProcessorService]
    });
    service = TestBed.inject(MarkdownProcessorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('processMarkdown', () => {
    it('should process simple markdown text', () => {
      const markdown = '# Hello World\n\nThis is a test.';
      const result = service.processMarkdown(markdown);

      expect(result).toBeDefined();
      expect(result.headings.length).toBe(1);
      expect(result.headings[0].text).toBe('Hello World');
      expect(result.headings[0].level).toBe(1);
      expect(result.codeBlocks.length).toBe(0);
    });

    it('should extract code blocks from markdown', () => {
      const markdown = `
# Test

\`\`\`typescript
console.log('Hello World');
\`\`\`

Some text here.

\`\`\`javascript
alert('Test');
\`\`\`
      `;

      const result = service.processMarkdown(markdown);

      expect(result.codeBlocks.length).toBe(2);
      expect(result.codeBlocks[0].language).toBe('typescript');
      expect(result.codeBlocks[0].code.includes("console.log('Hello World')")).toBe(true);
      expect(result.codeBlocks[1].language).toBe('javascript');
      expect(result.codeBlocks[1].code.includes("alert('Test')")).toBe(true);
    });

    it('should generate unique IDs for code blocks', () => {
      const markdown = `
\`\`\`typescript
const a = 1;
\`\`\`

\`\`\`typescript
const b = 2;
\`\`\`
      `;

      const result = service.processMarkdown(markdown);

      expect(result.codeBlocks.length).toBe(2);
      expect(result.codeBlocks[0].id).toBeDefined();
      expect(result.codeBlocks[1].id).toBeDefined();
      expect(result.codeBlocks[0].id).not.toBe(result.codeBlocks[1].id);
    });

    it('should handle empty code blocks', () => {
      const markdown = `
\`\`\`typescript
\`\`\`
      `;

      const result = service.processMarkdown(markdown);

  expect(result.codeBlocks.length).toBe(1);
  expect(result.codeBlocks[0].code.trim()).toBe('');
  expect(result.codeBlocks[0].lineCount).toBe(1);
    });

    it('should calculate reading time', () => {
      const shortText = '# Short Title\n\nThis is a short test text.';
      const result = service.processMarkdown(shortText);

      expect(result.estimatedReadingTime).toBeGreaterThan(0);
    });

    it('should extract headings with proper IDs', () => {
      const markdown = `
# Main Title
Some content here.

## Subtitle
More content.

### Sub-subtitle
Even more content.
      `;

      const result = service.processMarkdown(markdown);

      expect(result.headings.length).toBe(3);
      expect(result.headings[0].level).toBe(1);
      expect(result.headings[0].text).toBe('Main Title');
      expect(result.headings[0].id).toBe('main-title');
      expect(result.headings[1].level).toBe(2);
      expect(result.headings[1].text).toBe('Subtitle');
      expect(result.headings[1].id).toBe('subtitle');
    });

    it('should handle headings with special characters', () => {
      const markdown = `
# Test & Special Characters!
## Another: Test (with) [brackets]
      `;

      const result = service.processMarkdown(markdown);

  expect(result.headings[0].id).toBe('test-amp-special-characters');
      expect(result.headings[1].id).toBe('another-test-with-brackets');
    });

    it('should extract frontmatter when present', () => {
      const markdown = `---
title: Test Article
category: tutorial
tags: [angular, typescript]
---

# Content

This is the main content.`;

      const result = service.processMarkdown(markdown);

      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter?.title).toBe('Test Article');
      expect(result.frontmatter?.category).toBe('tutorial');
      expect(Array.isArray(result.frontmatter?.tags)).toBe(true);
      expect(result.frontmatter?.tags?.includes('angular')).toBe(true);
    });

    it('should handle markdown without frontmatter', () => {
      const markdown = `# Regular Markdown

This has no frontmatter.`;

      const result = service.processMarkdown(markdown);

      expect(result.frontmatter).toBeUndefined();
    });

    it('should preserve code indentation', () => {
      const markdown = `
\`\`\`typescript
if (true) {
  console.log('indented');
  if (nested) {
    console.log('more indented');
  }
}
\`\`\`
      `;

      const result = service.processMarkdown(markdown);

      expect(result.codeBlocks[0].code.includes('  console.log(\'indented\')')).toBe(true);
      expect(result.codeBlocks[0].code.includes('    console.log(\'more indented\')')).toBe(true);
    });

    it('should count lines correctly in code blocks', () => {
      const markdown = `
\`\`\`typescript
line 1
line 2
line 3
\`\`\`
      `;

      const result = service.processMarkdown(markdown);

      expect(result.codeBlocks.length).toBe(1);
      expect(result.codeBlocks[0].lineCount).toBe(3);
    });
  });

  // Private method tests adjusted to access via any-cast to avoid relying on private visibility
  describe('extractFrontmatter (private via any)', () => {
    it('should extract YAML frontmatter', () => {
      const markdown = `---
title: Test Article
category: tutorial
tags: [angular, typescript]
---

# Content

This is the main content.`;

  const result = (service as any).extractFrontmatter(markdown);

      expect(result.frontmatter).toBeDefined();
      expect(result.frontmatter?.title).toBe('Test Article');
      expect(result.frontmatter?.category).toBe('tutorial');
      expect(Array.isArray(result.frontmatter?.tags)).toBe(true);
      expect(result.content.includes('# Content')).toBe(true);
      expect(result.content.includes('---')).toBe(false);
    });

    it('should handle markdown without frontmatter', () => {
      const markdown = `# Regular Markdown

This has no frontmatter.`;

  const result = (service as any).extractFrontmatter(markdown);

      expect(result.frontmatter).toBeUndefined();
      expect(result.content).toBe(markdown);
    });

    it('should handle invalid YAML frontmatter', () => {
      const markdown = `---
invalid: yaml: content [
---

# Content`;

  const result = (service as any).extractFrontmatter(markdown);

      expect(result.frontmatter).toBeUndefined();
      expect(result.content.includes('# Content')).toBe(true);
    });
  });

  describe('parseCodeBlockMetadata (private via any)', () => {
    it('should parse title from comments', () => {
      const code = `// Title: Component Example
@Component({
  selector: 'app-test'
})`;

  const metadata = (service as any).parseCodeBlockMetadata(code, 'typescript');

      expect(metadata.title).toBe('Component Example');
    });

    it('should parse filename from comments', () => {
      const code = `// File: test.component.ts
export class TestComponent {}`;

  const metadata = (service as any).parseCodeBlockMetadata(code, 'typescript');

      expect(metadata.fileName).toBe('test.component.ts');
    });

    it('should parse category from comments', () => {
      const code = `// Category: components
@Component({})`;

  const metadata = (service as any).parseCodeBlockMetadata(code, 'typescript');

      expect(metadata.category).toBe('components');
    });

    it('should parse tags from comments', () => {
      const code = `// Tags: angular, component, example
export class TestComponent {}`;

  const metadata = (service as any).parseCodeBlockMetadata(code, 'typescript');

      expect(Array.isArray(metadata.tags)).toBe(true);
      expect(metadata.tags?.includes('angular')).toBe(true);
      expect(metadata.tags?.includes('component')).toBe(true);
    });

    it('should handle code without metadata', () => {
      const code = `export class TestComponent {
  constructor() {}
}`;

  const metadata = (service as any).parseCodeBlockMetadata(code, 'typescript');

  expect(metadata.title).toBe('Example (typescript)');
      expect(metadata.fileName).toBeUndefined();
      expect(metadata.category).toBeUndefined();
      expect(metadata.tags).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle null/undefined markdown', () => {
      const result = service.processMarkdown(null as any);

      expect(result.headings.length).toBe(0);
      expect(result.codeBlocks.length).toBe(0);
      expect(result.estimatedReadingTime).toBe(1);
    });

    it('should handle empty markdown', () => {
      const result = service.processMarkdown('');

      expect(result.headings.length).toBe(0);
      expect(result.codeBlocks.length).toBe(0);
      expect(result.estimatedReadingTime).toBe(1);
    });

    it('should handle malformed markdown gracefully', () => {
      const malformedMarkdown = `
# Test
\`\`\`typescript
const x = 1
// Missing closing backticks
Some random text
      `;

      const result = service.processMarkdown(malformedMarkdown);

      // Should still process the heading
      expect(result.headings.length).toBe(1);
      expect(result.headings[0].text).toBe('Test');
    });

    it('should generate unique IDs for duplicate headings', () => {
      const markdown = `
# Test
Content

# Test
More content
      `;

      const result = service.processMarkdown(markdown);

  expect(result.headings.length).toBe(2);
  expect(result.headings[0].id).toBe('test');
  expect(result.headings[1].id).toBe('test-2');
    });
  });

  describe('integration tests', () => {
    it('should handle complex markdown with multiple elements', () => {
      const complexMarkdown = `---
title: Complex Example
category: advanced
---

# Main Title

This is a paragraph with **bold** and *italic* text.

## Code Examples

Here's some TypeScript:

\`\`\`typescript
// Title: Example Component
import { Component } from '@angular/core';

@Component({
  selector: 'app-example',
  template: '<div>{{ title }}</div>'
})
export class ExampleComponent {
  title = 'Hello World';
}
\`\`\`

And some CSS:

\`\`\`css
.example {
  display: flex;
  justify-content: center;
}
\`\`\`

## Lists

- Item 1
- Item 2
- Item 3

## Links

[Angular Documentation](https://angular.io)
      `;

      const result = service.processMarkdown(complexMarkdown);

      expect(result.frontmatter?.title).toBe('Complex Example');
  expect(result.headings.length).toBe(4);
      expect(result.codeBlocks.length).toBe(2);
      expect(result.codeBlocks[0].language).toBe('typescript');
      expect(result.codeBlocks[1].language).toBe('css');
      expect(result.estimatedReadingTime).toBeGreaterThan(0);
    });

    it('should maintain consistent API', () => {
      const markdown = `# Test\n\nContent with code:\n\n\`\`\`typescript\nconst x = 1;\n\`\`\``;
      const result = service.processMarkdown(markdown);

      // Verify the result structure matches our interface
      expect(result.hasOwnProperty('html')).toBe(true);
      expect(result.hasOwnProperty('headings')).toBe(true);
      expect(result.hasOwnProperty('codeBlocks')).toBe(true);
      expect(result.hasOwnProperty('estimatedReadingTime')).toBe(true);
      expect(Array.isArray(result.headings)).toBe(true);
      expect(Array.isArray(result.codeBlocks)).toBe(true);
      expect(typeof result.estimatedReadingTime).toBe('number');
    });
  });
});