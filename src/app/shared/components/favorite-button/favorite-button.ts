import { ProfileContentType } from '../../models/profile.model';
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileService, profileError } from '../../services/profile.service';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-favorite-button',
  template: `
    <button
      class="favorite-button"
      type="button"
      [disabled]="loading() || saving() || !!error()"
      [attr.aria-pressed]="favorite()"
      [attr.aria-busy]="loading() || saving()"
      [attr.aria-label]="
        loading()
          ? 'Carregando favorito'
          : saving()
            ? 'Salvando favorito'
            : favorite()
              ? 'Remover dos favoritos'
              : 'Favoritar'
      "
      [title]="favorite() ? 'Remover dos favoritos' : 'Favoritar'"
      (click)="toggle()"
    >
      <i
        class="bi"
        [class.bi-heart-fill]="favorite()"
        [class.bi-heart]="!favorite()"
        aria-hidden="true"
      ></i>
    </button>
    @if (error()) {
      <div role="alert">
        {{ error() }}
        <button class="retry-button" type="button" (click)="retryLoad()">Tentar novamente</button>
      </div>
    }
  `,
  styles: `
    :host {
      display: inline-block;
      flex-shrink: 0;
    }
    .favorite-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 62px;
      height: 62px;
      padding: 0;
      border-radius: 50%;
      border: none;
      background-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-size: 22px;
      cursor: pointer;
      backdrop-filter: blur(6px);
      transition:
        background-color 180ms ease,
        transform 180ms ease,
        box-shadow 180ms ease;
    }
    .favorite-button:hover:not(:disabled),
    .favorite-button[aria-pressed='true'] {
      background-color: rgba(255, 255, 255, 0.22);
    }
    .favorite-button[aria-pressed='true'] {
      color: #dec9ff;
    }
    button:focus-visible {
      outline: 2px solid #c4a1ff;
      outline-offset: 3px;
    }
    button:disabled {
      opacity: 0.6;
    }
    div {
      max-width: 320px;
      margin-top: 8px;
      color: #ffb4b4;
      font-size: 13px;
    }
    .retry-button {
      border: 1px solid #746381;
      background: #211a2be6;
      color: #fff;
      border-radius: 12px;
      padding: 4px 8px;
      font-weight: 600;
    }
    .favorite-button i {
      display: inline-block;
      transition:
        transform 220ms cubic-bezier(0.2, 0.8, 0.3, 1.4),
        filter 180ms ease;
    }
    @media (hover: hover) and (pointer: fine) {
      .favorite-button:enabled:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 22px #b789ff30;
      }
      .favorite-button:enabled:hover i {
        transform: scale(1.18);
        filter: drop-shadow(0 0 6px #b789ff80);
      }
    }
    .favorite-button:enabled:active {
      transform: scale(0.9);
      box-shadow: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .favorite-button,
      .favorite-button i {
        transition: none;
        transform: none !important;
      }
    }
    @media (max-width: 576px) {
      .favorite-button {
        width: 52px;
        height: 52px;
        font-size: 20px;
      }
    }
  `,
})
export class FavoriteButton {
  readonly movieId = input.required<string>();
  readonly contentType = input<ProfileContentType>('movie');
  private readonly api = inject(ProfileService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);
  readonly favorite = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly retry = signal(0);

  constructor() {
    effect((onCleanup) => {
      const id = this.movieId();
      const contentType = this.contentType();
      this.retry();
      this.loading.set(true);
      this.saving.set(false);
      this.error.set('');
      const subscription = this.api.isFavorite(id, contentType).subscribe({
        next: (result) => {
          this.favorite.set(result.isFavorite);
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

  retryLoad(): void {
    this.retry.update((value) => value + 1);
  }

  toggle(): void {
    if (this.saving() || this.loading()) return;
    const id = this.movieId();
    const contentType = this.contentType();
    const wasFavorite = this.favorite();
    this.saving.set(true);
    (wasFavorite ? this.api.removeFavorite(id, contentType) : this.api.addFavorite(id, contentType))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (id === this.movieId() && contentType === this.contentType()) {
            this.favorite.set(!wasFavorite);
            this.saving.set(false);
            this.feedback.success(
              wasFavorite ? 'Removido dos favoritos' : 'Salvo como favorito',
              wasFavorite
                ? contentType === 'series'
                  ? 'A série foi removida dos seus favoritos.'
                  : 'O filme foi removido dos seus favoritos.'
                : contentType === 'series'
                  ? 'A série foi adicionada aos seus favoritos.'
                  : 'O filme foi adicionado aos seus favoritos.',
            );
          }
        },
        error: (error) => {
          if (id === this.movieId() && contentType === this.contentType()) {
            this.error.set(profileError(error));
            this.saving.set(false);
          }
        },
      });
  }
}
