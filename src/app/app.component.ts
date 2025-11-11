import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppLayoutComponent } from './core/layout/app-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AppLayoutComponent],
  template: `<app-layout></app-layout>`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'Angular Knowledge Navigator';
}