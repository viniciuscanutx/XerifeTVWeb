import { Component, computed, input } from '@angular/core';
import { MediaItem } from '../media-card/media-card';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-hero-banner',
  imports: [RouterLink],
  templateUrl: './hero-banner.html',
  styleUrl: './hero-banner.css',
})
export class HeroBanner {
  readonly item = input.required<MediaItem>();
  readonly rating = computed(() => (Number(this.item().rating) || 0).toFixed(1));
  readonly backgroundImage = computed(() => {
    const image = this.item().backdrop || this.item().poster;
    return image ? `url("${image.replaceAll('"', '%22')}")` : 'none';
  });
}
