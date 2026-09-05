import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteReview } from '../../../shared/models/profile.model';
import { ProfileService, profileError } from '../../../shared/services/profile.service';
import { ReviewDialog } from '../../../shared/components/review-dialog/review-dialog';
import { StarRating } from '../../../shared/components/star-rating/star-rating';

@Component({
  selector: 'app-profile-reviews',
  imports: [DatePipe, RouterLink, ReviewDialog, StarRating],
  templateUrl: './profile-reviews.html',
  styleUrls: ['../profile-collection.css', './profile-reviews.css'],
})
export class ProfileReviews {
  readonly reviews = signal<SiteReview[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly page = signal(1);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.reviews().length / 5)));
  readonly visibleReviews = computed(() =>
    this.reviews().slice((this.page() - 1) * 5, this.page() * 5),
  );
  readonly reviewAction = signal<{ review: SiteReview; mode: 'edit' | 'delete' } | null>(null);
  private readonly api = inject(ProfileService);
  private readonly revision = signal(0);

  constructor() {
    effect((onCleanup) => {
      this.revision();
      this.loading.set(true);
      this.error.set('');
      const subscription = this.api.getMyReviews(1, 'all', 10).subscribe({
        next: (data) => {
          this.reviews.set(data.items.slice(0, 10));
          this.page.set(Math.min(this.page(), Math.max(1, Math.ceil(data.items.length / 5))));
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
    this.reviewAction.set(null);
    this.revision.update((value) => value + 1);
  }
}
