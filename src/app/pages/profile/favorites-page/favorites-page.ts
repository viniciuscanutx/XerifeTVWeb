import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FavoritesCollection } from '../favorites-collection/favorites-collection';
import { ProfileContentType } from '../../../shared/models/profile.model';

@Component({
  selector: 'app-favorites-page',
  imports: [RouterLink, FavoritesCollection],
  template:
    '<div class="profile-page"><a class="back-link" routerLink="/profile"><i class="bi bi-arrow-left" aria-hidden="true"></i> Voltar ao perfil</a><app-favorites-collection [contentType]="contentType()" /></div>',
  styleUrl: '../profile.css',
})
export class FavoritesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  readonly contentType = computed<ProfileContentType>(() =>
    this.data()['contentType'] === 'series' ? 'series' : 'movie',
  );
}
