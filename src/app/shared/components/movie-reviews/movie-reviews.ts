import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ProfileContentType, SiteReview } from '../../models/profile.model';
import { ProfileService, profileError } from '../../services/profile.service';
import { ReviewDialog } from '../review-dialog/review-dialog';
import { ReviewEditor } from '../review-editor/review-editor';
import { ProfileAvatar } from '../profile-avatar/profile-avatar';
import { StarRating } from '../star-rating/star-rating';

@Component({
  selector: 'app-movie-reviews',
  imports: [DatePipe, ReviewDialog, ReviewEditor, ProfileAvatar, StarRating],
  templateUrl: './movie-reviews.html',
  styleUrl: './movie-reviews.css',
})
export class MovieReviews {
  readonly movieId = input.required<string>();
  readonly contentType = input<ProfileContentType>('movie');
  private readonly api = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  readonly reviews = signal<SiteReview[]>([]);
  readonly ownReview = signal<SiteReview | null>(null);
  readonly reviewAction = signal<'edit' | 'delete' | null>(null);
  readonly displayedReviews = computed(() => {
    const own = this.ownReview();
    return own ? [own, ...this.reviews().filter((review) => review.id !== own.id)] : this.reviews();
  });
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly error = signal('');
  readonly moreError = signal('');
  readonly reload = signal(0);
  private page = 1;

  constructor() {
    effect((onCleanup) => {
      const id = this.movieId();
      const contentType = this.contentType();
      this.reload();
      this.reviewAction.set(null);
      this.loading.set(true);
      this.error.set('');
      this.moreError.set('');
      this.loadingMore.set(false);
      this.page = 1;
      const subscription = forkJoin({
        list: this.api.getMovieReviews(id, 1, contentType),
        own: this.api.getOwnReview(id, contentType),
      }).subscribe({
        next: ({ list, own }) => {
          this.reviews.set(list.items);
          this.hasMore.set(list.hasMore);
          this.ownReview.set(own.review);
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
    this.reload.update((value) => value + 1);
  }

  loadMore(): void {
    if (this.loadingMore()) return;
    const id = this.movieId();
    const contentType = this.contentType();
    const revision = this.reload();
    this.loadingMore.set(true);
    this.moreError.set('');
    this.api
      .getMovieReviews(id, this.page + 1, contentType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          if (
            id !== this.movieId() ||
            contentType !== this.contentType() ||
            revision !== this.reload()
          )
            return;
          this.reviews.update((items) => [
            ...items,
            ...list.items.filter((item) => !items.some((current) => current.id === item.id)),
          ]);
          this.page = list.page;
          this.hasMore.set(list.hasMore);
          this.loadingMore.set(false);
        },
        error: (error) => {
          if (
            id === this.movieId() &&
            contentType === this.contentType() &&
            revision === this.reload()
          ) {
            this.moreError.set(profileError(error));
            this.loadingMore.set(false);
          }
        },
      });
  }

  changed(): void {
    this.reload.update((value) => value + 1);
  }
}
