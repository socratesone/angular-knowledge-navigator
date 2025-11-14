import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ChangeDetectionStrategy, 
  HostListener,
  ElementRef,
  signal,
  computed,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SplitterDragEvent {
  startX: number;
  currentX: number;
  deltaX: number;
  width: number;
  percentage: number;
}

export interface SplitterConfig {
  minWidth: number;
  maxWidth: number;
  snapThreshold: number;
  snapPoints: number[];
  enableSnap: boolean;
  showPreviewLine: boolean;
}

@Component({
  selector: 'app-layout-splitter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="layout-splitter"
      [class.dragging]="isDragging()"
      [class.hover]="isHovering()"
      [class.disabled]="disabled"
      [class.vertical]="orientation === 'vertical'"
      [class.horizontal]="orientation === 'horizontal'"
      [style.cursor]="disabled ? 'default' : (orientation === 'vertical' ? 'col-resize' : 'row-resize')"
      (mousedown)="onMouseDown($event)"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
      [attr.aria-label]="ariaLabel"
      [attr.role]="'separator'"
      [attr.aria-orientation]="orientation"
      data-testid="layout-splitter">
      
      <!-- Visual handle indicator -->
      <div class="splitter-handle">
        <div class="handle-dots">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>

      <!-- Preview line during drag -->
      <div 
        *ngIf="showPreviewLine && isDragging()" 
        class="preview-line"
        [style.left.px]="previewPosition()">
      </div>

      <!-- Snap indicators -->
      <div 
        *ngIf="showSnapIndicators && config.enableSnap" 
        class="snap-indicators">
        <div 
          *ngFor="let point of config.snapPoints"
          class="snap-indicator"
          [style.left.%]="point"
          [class.active]="isNearSnapPoint(point)">
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./layout-splitter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutSplitterComponent implements OnDestroy {
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
  @Input() disabled: boolean = false;
  @Input() showPreviewLine: boolean = true;
  @Input() showSnapIndicators: boolean = false;
  @Input() ariaLabel: string = 'Resize panel';
  @Input() config: SplitterConfig = {
    minWidth: 200,
    maxWidth: 600,
    snapThreshold: 15,
    snapPoints: [25, 30, 33, 40],
    enableSnap: true,
    showPreviewLine: true
  };

  @Output() dragStart = new EventEmitter<SplitterDragEvent>();
  @Output() dragMove = new EventEmitter<SplitterDragEvent>();
  @Output() dragEnd = new EventEmitter<SplitterDragEvent>();
  @Output() doubleClick = new EventEmitter<void>();

  // Internal state
  private readonly isDragging = signal<boolean>(false);
  private readonly isHovering = signal<boolean>(false);
  private readonly previewPosition = signal<number>(0);
  
  private startX = 0;
  private startWidth = 0;
  private containerWidth = 0;

  // Computed properties
  readonly canDrag = computed(() => !this.disabled && this.orientation === 'vertical');

  constructor(private elementRef: ElementRef) {}

  /**
   * Handle mouse down to start dragging
   */
  onMouseDown(event: MouseEvent): void {
    if (this.disabled) return;
    
    event.preventDefault();
    event.stopPropagation();

    this.startDrag(event);
  }

  /**
   * Handle double click for auto-resize
   */
  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    if (this.disabled) return;
    
    event.preventDefault();
    this.doubleClick.emit();
  }

  /**
   * Handle mouse enter for hover state
   */
  onMouseEnter(): void {
    if (!this.disabled) {
      this.isHovering.set(true);
    }
  }

  /**
   * Handle mouse leave for hover state
   */
  onMouseLeave(): void {
    this.isHovering.set(false);
  }

  /**
   * Start dragging operation
   */
  private startDrag(event: MouseEvent): void {
    this.isDragging.set(true);
    this.startX = event.clientX;
    
    // Calculate container and initial width
    const parentElement = this.elementRef.nativeElement.parentElement;
    if (parentElement) {
      this.containerWidth = parentElement.offsetWidth;
      
      // Get the width of the left panel (navigation)
      const leftPanel = parentElement.querySelector('.navigation-panel, .app-sidenav') as HTMLElement;
      this.startWidth = leftPanel ? leftPanel.offsetWidth : 300;
    }

    // Add global listeners
    document.addEventListener('mousemove', this.onGlobalMouseMove);
    document.addEventListener('mouseup', this.onGlobalMouseUp);
    document.body.style.cursor = this.orientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    // Emit drag start event
    const dragEvent = this.createDragEvent(event);
    this.dragStart.emit(dragEvent);
  }

  /**
   * Handle global mouse move during drag
   */
  private onGlobalMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging()) return;

    const deltaX = event.clientX - this.startX;
    let newWidth = this.startWidth + deltaX;

    // Apply constraints
    newWidth = Math.max(this.config.minWidth, Math.min(this.config.maxWidth, newWidth));

    // Apply snapping if enabled
    if (this.config.enableSnap) {
      newWidth = this.applySnapping(newWidth);
    }

    // Update preview position
    this.previewPosition.set(newWidth);

    // Emit drag move event
    const dragEvent = this.createDragEvent(event, newWidth);
    this.dragMove.emit(dragEvent);
  };

  /**
   * Handle global mouse up to end drag
   */
  private onGlobalMouseUp = (event: MouseEvent): void => {
    if (!this.isDragging()) return;

    this.isDragging.set(false);
    this.previewPosition.set(0);

    // Remove global listeners
    document.removeEventListener('mousemove', this.onGlobalMouseMove);
    document.removeEventListener('mouseup', this.onGlobalMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Emit drag end event
    const dragEvent = this.createDragEvent(event);
    this.dragEnd.emit(dragEvent);
  };

  /**
   * Apply snapping to width based on snap points
   */
  private applySnapping(width: number): number {
    if (!this.config.enableSnap || this.containerWidth === 0) {
      return width;
    }

    const percentage = (width / this.containerWidth) * 100;
    
    for (const snapPoint of this.config.snapPoints) {
      const snapWidth = (snapPoint / 100) * this.containerWidth;
      if (Math.abs(width - snapWidth) <= this.config.snapThreshold) {
        return snapWidth;
      }
    }

    return width;
  }

  /**
   * Check if current position is near a snap point
   */
  isNearSnapPoint(snapPoint: number): boolean {
    if (!this.isDragging() || this.containerWidth === 0) {
      return false;
    }

    const currentPercentage = (this.previewPosition() / this.containerWidth) * 100;
    return Math.abs(currentPercentage - snapPoint) <= (this.config.snapThreshold / this.containerWidth) * 100;
  }

  /**
   * Create drag event object
   */
  private createDragEvent(event: MouseEvent, width?: number): SplitterDragEvent {
    const currentWidth = width || this.startWidth + (event.clientX - this.startX);
    const percentage = this.containerWidth > 0 ? (currentWidth / this.containerWidth) * 100 : 0;

    return {
      startX: this.startX,
      currentX: event.clientX,
      deltaX: event.clientX - this.startX,
      width: currentWidth,
      percentage
    };
  }

  /**
   * Programmatically trigger resize to specific width
   */
  resizeTo(width: number): void {
    if (this.disabled) return;

    const constrainedWidth = Math.max(
      this.config.minWidth, 
      Math.min(this.config.maxWidth, width)
    );

    // Create synthetic drag event
    const dragEvent: SplitterDragEvent = {
      startX: 0,
      currentX: constrainedWidth,
      deltaX: constrainedWidth - this.startWidth,
      width: constrainedWidth,
      percentage: this.containerWidth > 0 ? (constrainedWidth / this.containerWidth) * 100 : 0
    };

    this.dragEnd.emit(dragEvent);
  }

  /**
   * Get current dragging state
   */
  getDragState() {
    return {
      isDragging: this.isDragging(),
      isHovering: this.isHovering(),
      previewPosition: this.previewPosition()
    };
  }

  /**
   * Update splitter configuration
   */
  updateConfig(newConfig: Partial<SplitterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Component cleanup
   */
  ngOnDestroy(): void {
    // Clean up global event listeners
    document.removeEventListener('mousemove', this.onGlobalMouseMove);
    document.removeEventListener('mouseup', this.onGlobalMouseUp);
    
    // Reset body styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
}