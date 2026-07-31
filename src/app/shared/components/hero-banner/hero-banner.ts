import { Component, input } from '@angular/core';
import { MediaItem } from '../media-card/media-card';

@Component({
  selector: 'app-hero-banner',
  imports: [],
  templateUrl: './hero-banner.html',
  styleUrl: './hero-banner.css',
})
export class HeroBanner {
  readonly item = input.required<MediaItem>();
}
