import { Component, signal, computed, inject } from '@angular/core';
import { MediaCard, MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { HeroBanner } from '../../shared/components/hero-banner/hero-banner';
import { ContentApiService } from '../../shared/data/content-api.service';
import { toMediaItem } from '../../shared/data/content-api.mapper';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-movies',
  imports: [MediaCard, MediaCarousel, HeroBanner],
  templateUrl: './movies.html',
  styleUrl: './movies.css',
})
export class Movies {
  private readonly api = inject(ContentApiService);

  readonly allMovies = signal<MediaItem[]>([]);
  readonly categories = signal<string[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly search = signal('');
  readonly genreFilter = signal('');

  readonly heroItem = signal<MediaItem | null>(null);

  readonly filteredMovies = computed<MediaItem[]>(() => {
    const term = this.search().toLowerCase().trim();
    const genre = this.genreFilter();
    return this.allMovies().filter((m) => {
      const matchesTerm = !term || m.title.toLowerCase().includes(term);
      const matchesGenre = !genre || m.genres.includes(genre);
      return matchesTerm && matchesGenre;
    });
  });

  readonly byGenre = computed(() => {
    const genre = this.genreFilter();
    if (genre) return [];
    const map = new Map<string, MediaItem[]>();
    for (const m of this.filteredMovies()) {
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
      movies: this.api.getMovies(30).pipe(catchError(() => of([]))),
      categories: this.api.getMoviesCategories(15).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ movies, categories }) => {
        const items = movies.map(toMediaItem);
        this.allMovies.set(items);
        this.categories.set(categories);
        this.heroItem.set(items[0] ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os filmes.');
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