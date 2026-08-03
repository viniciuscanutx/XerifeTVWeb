import { Component, signal, computed, inject } from '@angular/core';
import { MediaCard, MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { ContentApiService } from '../../shared/data/content-api.service';
import { seriesToMediaItem } from '../../shared/data/content-api.mapper';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-series',
  imports: [MediaCard, MediaCarousel, HeroBanner],
  templateUrl: './series.html',
  styleUrl: './series.css',
})
export class Series {
  private readonly api = inject(ContentApiService);

  readonly allSeries = signal<MediaItem[]>([]);
  readonly categories = signal<string[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly search = signal('');
  readonly genreFilter = signal('');

  readonly heroItem = signal<MediaItem | null>(null);

  readonly filteredSeries = computed<MediaItem[]>(() => {
    const term = this.search().toLowerCase().trim();
    const genre = this.genreFilter();
    return this.allSeries().filter((m) => {
      const matchesTerm = !term || m.title.toLowerCase().includes(term);
      const matchesGenre = !genre || m.genres.includes(genre);
      return matchesTerm && matchesGenre;
    });
  });

  readonly byGenre = computed(() => {
    const genre = this.genreFilter();
    if (genre) return [];
    const map = new Map<string, MediaItem[]>();
    for (const m of this.filteredSeries()) {
      for (const g of m.genres) {
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(m);
      }
    }
    return [...map.entries()]
      .filter(([g]) => this.categories().includes(g))
      .map(([genre, items]) => ({ genre, items }));
  });

  constructor() {
    forkJoin({
      series: this.api.getSeries(30).pipe(catchError(() => of([]))),
      categories: this.api.getSeriesCategories(15).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ series, categories }) => {
        const items = series.map(seriesToMediaItem);
        this.allSeries.set(items);
        this.categories.set(categories);
        this.heroItem.set(items[0] ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar as séries.');
        this.loading.set(false);
      },
    });
  }

  onSearch(term: string): void {
    this.search.set(term);
  }

  onGenreChange(genre: string): void {
    this.genreFilter.set(genre);
  }
}