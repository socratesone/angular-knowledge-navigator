import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NavigationTreeComponent } from '../../navigation/components/navigation-tree.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    NavigationTreeComponent
  ],
  template: `
    <div class="app-layout" data-testid="app-layout">
      <mat-toolbar color="primary" class="app-header">
        <button mat-icon-button (click)="toggleSidenav()" class="menu-toggle">
          <mat-icon>menu</mat-icon>
        </button>
        <span class="app-title">Angular Knowledge Navigator</span>
        <span class="spacer"></span>
        <button mat-icon-button>
          <mat-icon>settings</mat-icon>
        </button>
      </mat-toolbar>

      <mat-sidenav-container class="app-container">
        <mat-sidenav 
          #sidenav 
          mode="side" 
          opened="true" 
          class="app-sidenav"
          [fixedInViewport]="true"
        >
          <div class="sidenav-content">
            <app-navigation-tree data-testid="navigation-tree"></app-navigation-tree>
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="app-content">
          <main class="content-area">
            <router-outlet></router-outlet>
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styleUrls: ['./app-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLayoutComponent {
  
  toggleSidenav(): void {
    // This will be connected to sidenav reference when needed
    console.log('Toggle sidenav');
  }
}