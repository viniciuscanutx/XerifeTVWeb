import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  inject,
  viewChild,
} from '@angular/core';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-feedback-dialog',
  templateUrl: './feedback-dialog.html',
  styleUrl: './feedback-dialog.css',
})
export class FeedbackDialog {
  readonly feedback = inject(FeedbackService);
  private readonly document = inject(DOCUMENT);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private previousOverflow: string | null = null;

  constructor() {
    afterRenderEffect(() => {
      const message = this.feedback.message();
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (message && !dialog.open) {
        this.previousOverflow = this.document.body.style.overflow;
        this.document.body.style.overflow = 'hidden';
        dialog.showModal();
      } else if (!message && dialog.open) {
        dialog.close();
        this.restoreScrolling();
      }
    });
    inject(DestroyRef).onDestroy(() => this.restoreScrolling());
  }

  closed(): void {
    this.feedback.dismiss();
    this.restoreScrolling();
  }

  private restoreScrolling(): void {
    if (this.previousOverflow === null) return;
    this.document.body.style.overflow = this.previousOverflow;
    this.previousOverflow = null;
  }
}
