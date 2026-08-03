import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { VideoPlayer } from '../video-player/video-player';

@Component({
  selector: 'app-video-player-modal',
  imports: [VideoPlayer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-player-modal.html',
  styleUrl: './video-player-modal.css',
})
export class VideoPlayerModal implements OnDestroy {
  readonly open = input<boolean>(false);
  readonly src = input<string | null>(null);
  readonly streamFormat = input<string>('mp4');
  readonly poster = input<string | null>(null);
  readonly title = input<string>('');

  readonly closed = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open()) this.close();
  };

  readonly isOpen = computed(() => this.open() && !!this.src());

  constructor() {
    afterNextRender(() => {
      this.host.nativeElement.ownerDocument.addEventListener(
        'keydown',
        this.keydownHandler,
      );
    });
  }

  close(): void {
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  ngOnDestroy(): void {
    this.host?.nativeElement.ownerDocument.removeEventListener(
      'keydown',
      this.keydownHandler,
    );
  }
}
