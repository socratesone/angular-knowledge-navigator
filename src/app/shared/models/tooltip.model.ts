/**
 * Tooltip system models for interactive code documentation
 */

export enum TooltipPlacement {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  AUTO = 'auto'
}

export interface TooltipPosition {
  x: number;                    // Horizontal position
  y: number;                    // Vertical position
  placement: TooltipPlacement;  // Preferred placement
  strategy: 'absolute' | 'fixed'; // Positioning strategy
}

export interface TooltipContent {
  title: string;                // Concept term
  description: string;          // Brief explanation
  detailedText?: string;        // Extended explanation
  relatedLinks?: TooltipLink[]; // Links to related articles
}

export interface TooltipLink {
  text: string;                 // Link text
  url: string;                  // Article URL
  type: 'internal' | 'external'; // Link type
}

export interface TooltipState {
  isVisible: boolean;           // Current visibility
  conceptId: string;            // Associated vocabulary concept
  position: TooltipPosition;    // Calculated position
  triggerElement: HTMLElement;  // Element that triggered tooltip
  content: TooltipContent;      // Tooltip content data
  showDelay: number;            // Delay before showing (ms)
  hideDelay: number;            // Delay before hiding (ms)
  zIndex: number;               // Stacking order
}

export interface TooltipOptions {
  placement?: TooltipPlacement; // Preferred placement
  showDelay?: number;           // Show delay in milliseconds
  hideDelay?: number;           // Hide delay in milliseconds
  maxWidth?: number;            // Maximum tooltip width
  offset?: number;              // Offset from trigger element
  arrow?: boolean;              // Show arrow pointer
  closeOnClick?: boolean;       // Close when clicked outside
  closeOnEscape?: boolean;      // Close on ESC key
  interactive?: boolean;        // Allow interaction with tooltip
  theme?: 'dark' | 'light';     // Visual theme
}

export interface TooltipTrigger {
  element: HTMLElement;         // Trigger element
  conceptId: string;            // Associated concept ID
  options?: TooltipOptions;     // Custom options
  isActive: boolean;            // Currently active
  listeners: TooltipListeners;  // Event listeners
}

export interface TooltipListeners {
  mouseEnter: () => void;       // Mouse enter handler
  mouseLeave: () => void;       // Mouse leave handler
  focus: () => void;            // Focus handler (accessibility)
  blur: () => void;             // Blur handler (accessibility)
  keydown: (event: KeyboardEvent) => void; // Keyboard handler
}

export interface TooltipConfiguration {
  defaultOptions: TooltipOptions; // Default tooltip options
  vocabularyServiceUrl: string;   // Vocabulary data source
  enableKeyboardNavigation: boolean; // Keyboard support
  enableMobile: boolean;          // Mobile device support
  debugMode: boolean;             // Debug logging
  preloadVocabulary: boolean;     // Preload vocabulary data
  cacheTimeout: number;           // Cache timeout (ms)
}

export interface TooltipInteraction {
  conceptId: string;            // Concept identifier
  action: TooltipAction;        // Interaction type
  timestamp: Date;              // When interaction occurred
  duration?: number;            // How long tooltip was visible
  triggerType: 'hover' | 'focus' | 'click'; // How tooltip was triggered
  userAgent: string;            // Browser/device info
}

export enum TooltipAction {
  SHOW = 'show',
  HIDE = 'hide',
  CLICK_LINK = 'click_link',
  KEYBOARD_NAVIGATE = 'keyboard_navigate',
  TIMEOUT = 'timeout',
  ERROR = 'error'
}

export interface TooltipMetrics {
  totalInteractions: number;    // Total tooltip interactions
  averageViewTime: number;      // Average time tooltips are visible
  mostViewedConcepts: ConceptViewMetric[]; // Popular concepts
  clickThroughRate: number;     // Rate of clicking related links
  errorRate: number;            // Error percentage
  performanceMetrics: TooltipPerformanceMetrics; // Performance data
}

export interface ConceptViewMetric {
  conceptId: string;            // Concept identifier
  viewCount: number;            // Number of views
  averageDuration: number;      // Average view duration
  clickThroughCount: number;    // Related link clicks
}

export interface TooltipPerformanceMetrics {
  averageRenderTime: number;    // Average tooltip render time (ms)
  averagePositionTime: number;  // Average positioning time (ms)
  vocabularyLoadTime: number;   // Vocabulary data load time (ms)
  memoryUsage: number;          // Estimated memory usage (KB)
  errorCount: number;           // Number of errors
}

export interface TooltipError {
  type: TooltipErrorType;       // Error category
  message: string;              // Error description
  conceptId?: string;           // Related concept (if applicable)
  timestamp: Date;              // When error occurred
  stack?: string;               // Stack trace (if available)
  userAgent: string;            // Browser information
  recoverable: boolean;         // Can be recovered from
}

export enum TooltipErrorType {
  VOCABULARY_LOAD_FAILED = 'vocabulary_load_failed',
  CONCEPT_NOT_FOUND = 'concept_not_found',
  POSITIONING_FAILED = 'positioning_failed',
  RENDER_FAILED = 'render_failed',
  INTERACTION_FAILED = 'interaction_failed',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error'
}