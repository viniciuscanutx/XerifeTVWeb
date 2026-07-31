import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'Xel If TV - Início',
  },
  {
    path: 'filmes',
    loadComponent: () => import('./pages/movies/movies').then((m) => m.Movies),
    title: 'Xel If TV - Filmes',
  },
  {
    path: 'series',
    loadComponent: () => import('./pages/series/series').then((m) => m.Series),
    title: 'Xel If TV - Séries',
  },
  { path: '**', redirectTo: '' },
];
