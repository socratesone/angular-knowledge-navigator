import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'fundamentals',
    pathMatch: 'full'
  },
  {
    path: ':level',
    loadComponent: () => import('./components/content-viewer.component').then(c => c.ContentViewerComponent)
  },
  {
    path: ':level/:topicId',
    loadComponent: () => import('./components/content-viewer.component').then(c => c.ContentViewerComponent)
  }
];