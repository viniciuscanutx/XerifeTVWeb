import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileContentType, SiteReview } from '../../models/profile.model';
import { ProfileService, profileError } from '../../services/profile.service';
import { FeedbackService } from '../../services/feedback.service';
import { ReviewEditor } from '../review-editor/review-editor';

@Component({
  selector: 'app-review-dialog',
  imports: [ReviewEditor],
  templateUrl: './review-dialog.html',
  styleUrl: './review-dialog.css',
})
export class ReviewDialog {
  readonly open = input(false);
  readonly movieId = input.required<string>();
  readonly contentType = input<ProfileContentType>('movie');
  readonly review = input<SiteReview | null>(null);
  readonly mode = input<'edit' | 'delete'>('edit');
  readonly saved = output<SiteReview>();
  readonly deleted = output<void>();
  readonly closed = output<void>();
  readonly deleting = signal(false);
  readonly error = signal('');
  private readonly api = inject(ProfileService);
  private readonly feedback = inject(FeedbackService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly editor = viewChild(ReviewEditor);
  readonly busy = computed(() => this.deleting() || !!this.editor()?.busy());
  private previousOverflow: string | null = null;

  constructor() {
    afterRenderEffect(() => {
      const open = this.open();
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (open && !dialog.open) {
        this.error.set('');
        this.previousOverflow = this.document.body.style.overflow;
        this.document.body.style.overflow = 'hidden';
        dialog.showModal();
      } else if (!open && dialog.open) {
        this.closeDialog();
      }
    });
    this.destroyRef.onDestroy(() => this.closeDialog());
  }

  dismiss(): void {
    if (this.busy()) return;
    this.closeDialog();
    this.closed.emit();
  }

  cancel(event: Event): void {
    event.preventDefault();
    this.dismiss();
  }

  onNativeClose(): void {
    if (this.open()) this.closed.emit();
  }

  onSaved(review: SiteReview): void {
    this.closeDialog();
    this.closed.emit();
    this.saved.emit(review);
  }

  remove(): void {
    if (this.busy() || !this.review()) return;
    this.deleting.set(true);
    this.error.set('');
    this.api
      .deleteReview(this.movieId(), this.contentType())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.closeDialog();
          this.closed.emit();
          this.deleted.emit();
          this.feedback.success('Avaliação excluída', 'Sua avaliação foi excluída.');
        },
        error: (error) => {
          this.deleting.set(false);
          this.error.set(profileError(error));
        },
      });
  }

  private closeDialog(): void {
    this.dialog()?.nativeElement.close();
    if (this.previousOverflow === null) return;
    this.document.body.style.overflow = this.previousOverflow;
    this.previousOverflow = null;
  }
}
