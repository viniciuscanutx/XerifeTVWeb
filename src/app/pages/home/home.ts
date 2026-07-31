import { Component, signal } from '@angular/core';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { MEDIA_DATA } from '../../shared/data/media.data';

@Component({
  selector: 'app-home',
  imports: [MediaCarousel, HeroBanner],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly heroItem = signal<MediaItem>(MEDIA_DATA[0]);
  readonly allItems = MEDIA_DATA;
  readonly trending = MEDIA_DATA.slice(0, 8);
  readonly movies = MEDIA_DATA.filter((m) => m.type === 'movie');
  readonly series = MEDIA_DATA.filter((m) => m.type === 'series');
  readonly topRated = [...MEDIA_DATA].sort((a, b) => b.rating - a.rating).slice(0, 8);
}
