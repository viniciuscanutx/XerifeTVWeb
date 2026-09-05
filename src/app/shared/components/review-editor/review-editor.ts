import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StarRating } from '../star-rating/star-rating';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileContentType, SiteReview } from '../../models/profile.model';
import { ProfileService, profileError } from '../../services/profile.service';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-review-editor',
  imports: [FormsModule, StarRating],
  templateUrl: './review-editor.html',
  styleUrl: './review-editor.css',
})
export class ReviewEditor {
  readonly movieId = input.required<string>();
  readonly contentType = input<ProfileContentType>('movie');
  readonly review = input<SiteReview | null>(null);
  readonly showCancel = input(true);
  readonly saved = output<SiteReview>();
  readonly cancelled = output<void>();
  readonly rating = signal(5);
  readonly text = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly api = inject(ProfileService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const review = this.review();
      this.movieId();
      this.contentType();
      this.rating.set(review?.rating ?? 5);
      this.text.set(review?.text ?? '');
      this.error.set('');
      this.busy.set(false);
    });
  }

  save(): void {
    if (this.busy() || !this.text().trim() || this.text().length > 2000) return;
    this.busy.set(true);
    this.error.set('');
    const id = this.movieId();
    const contentType = this.contentType();
    const isEditing = this.review() !== null;
    this.api
      .saveReview(id, Number(this.rating()), this.text().trim(), contentType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (review) => {
          if (this.movieId() === id && this.contentType() === contentType) {
            this.busy.set(false);
            this.saved.emit(review);
            this.feedback.success(
              isEditing ? 'Avaliação editada' : 'Avaliação salva',
              isEditing
                ? 'As alterações da sua avaliação foram salvas.'
                : 'Sua avaliação foi publicada.',
            );
          }
        },
        error: (error) => {
          if (this.movieId() === id && this.contentType() === contentType) {
            this.busy.set(false);
            this.error.set(profileError(error));
          }
        },
      });
  }
}
