import {
  Component,
  input,
  viewChild,
  ElementRef,
  AfterViewInit,
  signal,
} from '@angular/core';
import { MediaCard, MediaItem } from '../media-card/media-card';

@Component({
  selector: 'app-media-carousel',
  imports: [MediaCard],
  templateUrl: './media-carousel.html',
  styleUrl: './media-carousel.css',
})
export class MediaCarousel implements AfterViewInit {
  readonly title = input.required<string>();
  readonly items = input.required<MediaItem[]>();
  readonly icon = input<string>('bi-fire');

  private readonly trackRef = viewChild.required<ElementRef<HTMLElement>>('track');
  protected readonly canScrollLeft = signal(false);
  protected readonly canScrollRight = signal(true);

  ngAfterViewInit() {
    this.updateScrollState();
    const track = this.trackRef().nativeElement;
    track.addEventListener('scroll', this.updateScrollState, { passive: true });
  }

  private readonly updateScrollState = () => {
    const el = this.trackRef().nativeElement;
    const max = el.scrollWidth - el.clientWidth - 2;
    this.canScrollLeft.set(el.scrollLeft > 4);
    this.canScrollRight.set(el.scrollLeft < max);
  };

  scrollLeft() {
    const el = this.trackRef().nativeElement;
    el.scrollBy({ left: -el.clientWidth * 0.85, behavior: 'smooth' });
  }

  scrollRight() {
    const el = this.trackRef().nativeElement;
    el.scrollBy({ left: el.clientWidth * 0.85, behavior: 'smooth' });
  }
}
