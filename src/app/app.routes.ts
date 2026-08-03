import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Xel If TV - Início',
  },
  {
    path: 'watch/:type/:id',
    loadComponent: () => import('./pages/watch/watch').then((m) => m.Watch),
    title: 'Xel If TV - Detalhes',
  },
  { path: '**', redirectTo: '' },
];
