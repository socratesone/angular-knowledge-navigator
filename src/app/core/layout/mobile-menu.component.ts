import { Component, ChangeDetectionStrategy, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointService } from '../../core/services/breakpoint.service';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <button 
      mat-icon-button 
      (click)="toggleMenu()"
      [class.menu-open]="isMenuOpen"
      [class.menu-closed]="!isMenuOpen"
      [attr.aria-label]="menuButtonLabel()"
      [matTooltip]="menuButtonTooltip()"
      class="mobile-menu-button"
      data-testid="mobile-menu-button">
      <mat-icon class="menu-icon">{{ menuIcon() }}</mat-icon>
    </button>
  `,
  styleUrls: ['./mobile-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileMenuComponent {
  @Input() isMenuOpen = false;
  @Output() menuToggle = new EventEmitter<boolean>();
  
  readonly breakpointService = inject(BreakpointService);

  /**
   * Toggle menu open/closed state
   */
  toggleMenu(): void {
    const newState = !this.isMenuOpen;
    this.menuToggle.emit(newState);
  }

  /**
   * Get appropriate menu icon
   */
  menuIcon(): string {
    return this.isMenuOpen ? 'close' : 'menu';
  }

  /**
   * Get menu button aria label
   */
  menuButtonLabel(): string {
    return this.isMenuOpen ? 'Close navigation menu' : 'Open navigation menu';
  }

  /**
   * Get menu button tooltip
   */
  menuButtonTooltip(): string {
    return this.isMenuOpen ? 'Close menu' : 'Open menu';
  }
}