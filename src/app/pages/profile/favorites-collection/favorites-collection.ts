import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Favorite, ProfileContentType } from '../../../shared/models/profile.model';
import { ProfileService, profileError } from '../../../shared/services/profile.service';
import { FeedbackService } from '../../../shared/services/feedback.service';

@Component({
  selector: 'app-favorites-collection',
  imports: [RouterLink],
  templateUrl: './favorites-collection.html',
  styleUrl: '../profile-collection.css',
})
export class FavoritesCollection {
  readonly contentType = input.required<ProfileContentType>();
  readonly preview = input(false);
  readonly favorites = signal<Favorite[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly removing = signal<string | null>(null);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly title = computed(() =>
    this.contentType() === 'series' ? 'Séries favoritas' : 'Filmes favoritos',
  );
  private readonly api = inject(ProfileService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly revision = signal(0);
  private loadedType: ProfileContentType | null = null;

  constructor() {
    effect((onCleanup) => {
      const type = this.contentType();
      const page = this.page();
      this.revision();
      if (this.loadedType !== type) {
        this.loadedType = type;
        this.actionError.set('');
        if (page !== 1) {
          this.page.set(1);
          return;
        }
      }
      this.loading.set(true);
      this.error.set('');
      const subscription = this.api.getFavorites(page, type, this.preview() ? 5 : 20).subscribe({
        next: (data) => {
          if (!data.items.length && page > 1) {
            this.page.set(page - 1);
            return;
          }
          this.favorites.set(data.items);
          this.hasMore.set(data.hasMore);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(profileError(error));
          this.loading.set(false);
        },
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  reload(): void {
    this.revision.update((value) => value + 1);
  }

  remove(favorite: Favorite): void {
    if (this.removing()) return;
    const type = this.contentType();
    this.removing.set(favorite.movie.id);
    this.actionError.set('');
    this.api
      .removeFavorite(favorite.movie.id, type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removing.set(null);
          this.feedback.success(
            'Removido dos favoritos',
            type === 'series'
              ? 'A série foi removida dos seus favoritos.'
              : 'O filme foi removido dos seus favoritos.',
          );
          if (type === this.contentType()) this.reload();
        },
        error: (error) => {
          this.removing.set(null);
          if (type === this.contentType()) this.actionError.set(profileError(error));
        },
      });
  }
}
