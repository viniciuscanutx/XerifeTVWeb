import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'CHELIFTV - Início',
  },
  {
    path: 'movies',
    loadComponent: () => import('./pages/movies/movies').then((m) => m.Movies),
    title: 'CHELIFTV - Filmes',
  },
  {
    path: 'filmes',
    redirectTo: 'movies',
    pathMatch: 'full',
  },
  {
    path: 'series',
    loadComponent: () => import('./pages/series/series').then((m) => m.SeriesPage),
    title: 'CHELIFTV - Séries',
  },
  {
    path: 'watch/:type/:id',
    loadComponent: () => import('./pages/watch/watch').then((m) => m.Watch),
    title: 'CHELIFTV - Assistir',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
    title: 'CHELIFTV - Sobre',
  },
  {
    path: 'sobre',
    redirectTo: 'about',
    pathMatch: 'full',
  },
  { path: '**', redirectTo: '' },
];


