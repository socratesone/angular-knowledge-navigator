/**
 * Utility functions for generating and managing anchor IDs for navigation
 * Used by TOC system and content processing
 */

/**
 * Generate a URL-safe anchor ID from text
 * @param text The text to convert to an anchor ID
 * @param options Configuration options
 * @returns Clean anchor ID suitable for use in URLs and DOM
 */
export function generateAnchorId(
  text: string, 
  options: AnchorIdOptions = {}
): string {
  const {
    maxLength = 50,
    prefix = '',
    suffix = '',
    preserveCase = false,
    allowUnicode = false,
    customReplacements = {}
  } = options;

  let anchor = text.trim();

  // Apply custom replacements first
  Object.entries(customReplacements).forEach(([search, replace]) => {
    anchor = anchor.replace(new RegExp(search, 'g'), replace);
  });

  // Convert to lowercase unless preserveCase is true
  if (!preserveCase) {
    anchor = anchor.toLowerCase();
  }

  // Handle Unicode characters
  if (!allowUnicode) {
    // Replace common accented characters
    anchor = anchor
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ýÿ]/g, 'y')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[ß]/g, 'ss')
      .replace(/[æ]/g, 'ae')
      .replace(/[œ]/g, 'oe');
  }

  // Replace spaces and special characters with hyphens
  anchor = anchor
    .replace(/[\s\t\n\r]+/g, '-')           // Whitespace to hyphens
    .replace(/[^\w\-\.]/g, '-')             // Non-word chars to hyphens (keep dots)
    .replace(/--+/g, '-')                   // Multiple hyphens to single
    .replace(/^-+|-+$/g, '');               // Remove leading/trailing hyphens

  // Apply prefix and suffix
  if (prefix) {
    anchor = `${prefix}-${anchor}`;
  }
  if (suffix) {
    anchor = `${anchor}-${suffix}`;
  }

  // Truncate if too long
  if (anchor.length > maxLength) {
    // Try to break at a word boundary
    const truncated = anchor.substring(0, maxLength);
    const lastHyphen = truncated.lastIndexOf('-');
    
    if (lastHyphen > maxLength * 0.7) {
      anchor = truncated.substring(0, lastHyphen);
    } else {
      anchor = truncated;
    }
  }

  // Ensure it doesn't start with a number (invalid HTML ID)
  if (/^\d/.test(anchor)) {
    anchor = `section-${anchor}`;
  }

  // Ensure it's not empty
  if (!anchor) {
    anchor = 'untitled-section';
  }

  return anchor;
}

/**
 * Generate unique anchor IDs by appending numbers if duplicates exist
 * @param text Base text for the anchor
 * @param existingIds Set of existing anchor IDs to avoid
 * @param options Configuration options
 * @returns Unique anchor ID
 */
export function generateUniqueAnchorId(
  text: string,
  existingIds: Set<string>,
  options: AnchorIdOptions = {}
): string {
  const baseId = generateAnchorId(text, options);
  
  if (!existingIds.has(baseId)) {
    existingIds.add(baseId);
    return baseId;
  }

  // Find unique variant
  let counter = 2;
  let uniqueId = `${baseId}-${counter}`;
  
  while (existingIds.has(uniqueId)) {
    counter++;
    uniqueId = `${baseId}-${counter}`;
  }
  
  existingIds.add(uniqueId);
  return uniqueId;
}

/**
 * Extract anchor targets from HTML content
 * @param htmlContent HTML string to parse
 * @returns Array of anchor IDs found in the content
 */
export function extractExistingAnchors(htmlContent: string): string[] {
  const anchorRegex = /id=["']([^"']+)["']/g;
  const anchors: string[] = [];
  let match;

  while ((match = anchorRegex.exec(htmlContent)) !== null) {
    anchors.push(match[1]);
  }

  return anchors;
}

/**
 * Validate anchor ID format
 * @param anchorId Anchor ID to validate
 * @returns True if the anchor ID is valid
 */
export function isValidAnchorId(anchorId: string): boolean {
  // Must not be empty
  if (!anchorId || anchorId.trim() === '') {
    return false;
  }

  // Must not start with a number
  if (/^\d/.test(anchorId)) {
    return false;
  }

  // Must contain only valid characters
  if (!/^[a-zA-Z][a-zA-Z0-9\-_\.]*$/.test(anchorId)) {
    return false;
  }

  // Must not be too long
  if (anchorId.length > 100) {
    return false;
  }

  return true;
}

/**
 * Create anchor map from content headings
 * @param headings Array of heading objects with text and level
 * @param options Configuration options
 * @returns Map of heading text to anchor IDs
 */
export function createAnchorMap(
  headings: Array<{ text: string; level: number }>,
  options: AnchorIdOptions = {}
): Map<string, string> {
  const anchorMap = new Map<string, string>();
  const existingIds = new Set<string>();

  headings.forEach(heading => {
    const anchorId = generateUniqueAnchorId(heading.text, existingIds, options);
    anchorMap.set(heading.text, anchorId);
  });

  return anchorMap;
}

/**
 * Smooth scroll to anchor with offset
 * @param anchorId Target anchor ID
 * @param options Scroll configuration
 */
export function scrollToAnchor(
  anchorId: string, 
  options: ScrollToAnchorOptions = {}
): void {
  const {
    offset = 80,          // Offset for fixed headers
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest',
    updateUrl = true,
    focusTarget = true
  } = options;

  const targetElement = document.getElementById(anchorId);
  
  if (!targetElement) {
    console.warn(`Anchor element with ID "${anchorId}" not found`);
    return;
  }

  // Calculate scroll position with offset
  const elementRect = targetElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset + elementRect.top - offset;

  // Scroll to position
  window.scrollTo({
    top: scrollTop,
    behavior: behavior as ScrollBehavior
  });

  // Update URL if requested
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.hash = anchorId;
    window.history.replaceState(null, '', url.toString());
  }

  // Focus target for accessibility
  if (focusTarget) {
    // Set tabindex temporarily if not focusable
    const originalTabIndex = targetElement.getAttribute('tabindex');
    if (!targetElement.hasAttribute('tabindex')) {
      targetElement.setAttribute('tabindex', '-1');
    }
    
    targetElement.focus();
    
    // Restore original tabindex
    if (originalTabIndex === null) {
      targetElement.removeAttribute('tabindex');
    } else {
      targetElement.setAttribute('tabindex', originalTabIndex);
    }
  }
}

/**
 * Get anchor ID from URL hash
 * @returns Current anchor ID from URL hash, or null if none
 */
export function getCurrentAnchor(): string | null {
  const hash = window.location.hash;
  return hash ? hash.substring(1) : null;
}

/**
 * Check if element is in viewport
 * @param element Element to check
 * @param offset Additional offset consideration
 * @returns True if element is visible in viewport
 */
export function isElementInViewport(element: Element, offset: number = 0): boolean {
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  
  return (
    rect.top >= -offset &&
    rect.top <= windowHeight + offset
  );
}

/**
 * Find currently visible section
 * @param anchorIds Array of anchor IDs to check
 * @param offset Offset for header consideration
 * @returns Currently visible anchor ID, or null
 */
export function getCurrentVisibleSection(anchorIds: string[], offset: number = 100): string | null {
  for (const anchorId of anchorIds) {
    const element = document.getElementById(anchorId);
    if (element && isElementInViewport(element, offset)) {
      return anchorId;
    }
  }
  return null;
}

// Type definitions
export interface AnchorIdOptions {
  maxLength?: number;
  prefix?: string;
  suffix?: string;
  preserveCase?: boolean;
  allowUnicode?: boolean;
  customReplacements?: Record<string, string>;
}

export interface ScrollToAnchorOptions {
  offset?: number;
  behavior?: 'auto' | 'smooth';
  block?: 'start' | 'center' | 'end' | 'nearest';
  inline?: 'start' | 'center' | 'end' | 'nearest';
  updateUrl?: boolean;
  focusTarget?: boolean;
}

// Re-export for convenience
export {
  generateAnchorId as slugify,
  scrollToAnchor as smoothScrollTo
};