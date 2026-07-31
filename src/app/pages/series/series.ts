import { Component, signal, computed } from '@angular/core';
import { MediaCard, MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { MEDIA_DATA } from '../../shared/data/media.data';

@Component({
  selector: 'app-series',
  imports: [MediaCard, MediaCarousel, HeroBanner],
  templateUrl: './series.html',
  styleUrl: './series.css',
})
export class Series {
  private readonly allSeries = MEDIA_DATA.filter((m) => m.type === 'series');
  readonly search = signal('');
  readonly genreFilter = signal('');

  readonly heroItem = signal<MediaItem>(this.allSeries[0]);

  readonly genres = [...new Set(this.allSeries.flatMap((m) => m.genres))].sort();

  readonly series = computed<MediaItem[]>(() => {
    const term = this.search().toLowerCase().trim();
    const genre = this.genreFilter();
    return this.allSeries.filter((m) => {
      const matchesTerm = !term || m.title.toLowerCase().includes(term);
      const matchesGenre = !genre || m.genres.includes(genre);
      return matchesTerm && matchesGenre;
    });
  });

  readonly byGenre = computed(() => {
    const genre = this.genreFilter();
    if (genre) return [];
    const map = new Map<string, MediaItem[]>();
    for (const m of this.series()) {
      for (const g of m.genres) {
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(m);
      }
    }
    return [...map.entries()].map(([genre, items]) => ({ genre, items }));
  });
}
