import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/concepts/fundamentals/introduction-to-angular',
    pathMatch: 'full'
  },
  {
    path: 'concepts',
    loadChildren: () => import('./concepts/routes').then(m => m.routes)
  },
  {
    path: 'navigation',
    loadChildren: () => import('./navigation/routes').then(m => m.routes)
  }
];