import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GiphyGif, GiphyService, giphyError } from '../../services/giphy.service';

@Component({
  selector: 'app-giphy-picker',
  imports: [FormsModule],
  templateUrl: './giphy-picker.html',
  styleUrl: './giphy-picker.css',
})
export class GiphyPicker {
  readonly selected = output<string>();
  readonly closed = output<void>();
  readonly giphy = inject(GiphyService);
  readonly draft = signal('');
  readonly query = signal('');
  readonly offset = signal(0);
  readonly items = signal<GiphyGif[]>([]);
  readonly choice = signal<GiphyGif | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly hasMore = signal(false);
  readonly nextOffset = signal(0);
  private readonly revision = signal(0);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private previousOverflow: string | null = null;

  constructor() {
    afterNextRender(() => {
      this.previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
      this.dialog()?.nativeElement.showModal();
    });
    this.destroyRef.onDestroy(() => this.closeDialog());
    effect((onCleanup) => {
      const query = this.query();
      const offset = this.offset();
      this.revision();
      if (!this.giphy.configured) return;
      this.loading.set(true);
      this.error.set('');
      const request = this.giphy.search(query, offset).subscribe({
        next: (page) => {
          this.items.set(page.items);
          this.hasMore.set(page.hasMore);
          this.nextOffset.set(page.nextOffset);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(giphyError(error));
          this.loading.set(false);
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }

  search(): void {
    this.choice.set(null);
    this.query.set(this.draft());
    this.offset.set(0);
    this.retry();
  }

  retry(): void {
    this.revision.update((value) => value + 1);
  }

  dismiss(): void {
    this.closeDialog();
    this.closed.emit();
  }

  cancel(event: Event): void {
    event.preventDefault();
    this.dismiss();
  }

  useGif(): void {
    const choice = this.choice();
    if (!choice) return;
    this.closeDialog();
    this.selected.emit(choice.id);
    this.closed.emit();
  }

  private closeDialog(): void {
    this.dialog()?.nativeElement.close();
    if (this.previousOverflow === null) return;
    this.document.body.style.overflow = this.previousOverflow;
    this.previousOverflow = null;
  }
}
