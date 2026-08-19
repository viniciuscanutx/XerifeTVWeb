import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { permissionGuard } from './shared/guards/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'CHELIFTV - Entrar',
  },
  {
    path: 'acesso-negado',
    loadComponent: () =>
      import('./pages/access-denied/access-denied').then((m) => m.AccessDenied),
    title: 'CHELIFTV - Acesso negado',
    canActivate: [authGuard],
  },
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
    title: 'CHELIFTV - Início',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'home.view' },
  },
  {
    path: 'movies',
    loadComponent: () => import('./pages/movies/movies').then((m) => m.Movies),
    title: 'CHELIFTV - Filmes',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'movies.view' },
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
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'series.view' },
  },
  {
    path: 'channels',
    loadComponent: () => import('./pages/channels/channels').then((m) => m.ChannelsPage),
    title: 'CHELIFTV - Canais ao Vivo',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'channels.view' },
  },
  {
    path: 'canais',
    redirectTo: 'channels',
    pathMatch: 'full',
  },
  {
    path: 'watch/:type/:id',
    loadComponent: () => import('./pages/watch/watch').then((m) => m.Watch),
    title: 'CHELIFTV - Assistir',
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'watch' },
  },
  {
    path: 'assistir/:type/:id',
    redirectTo: 'watch/:type/:id',
    pathMatch: 'full',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
    title: 'CHELIFTV - Sobre',
    canActivate: [authGuard],
  },
  {
    path: 'sobre',
    redirectTo: 'about',
    pathMatch: 'full',
  },
  { path: '**', redirectTo: '' },
];


