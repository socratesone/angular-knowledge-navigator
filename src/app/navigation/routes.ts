import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/navigation-tree.component').then(c => c.NavigationTreeComponent)
  }
];