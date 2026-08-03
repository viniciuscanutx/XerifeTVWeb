import { Component, computed, inject, signal } from '@angular/core';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { ContentApiService } from '../../shared/data/content-api.service';
import { mapHomeResponse, type HomeMappedData } from '../../shared/data/content-api.mapper';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [MediaCarousel],
  templateUrl: './home.html',
  styleUrl: './home.css',
})

export class Home {
  private readonly api = inject(ContentApiService);

  readonly heroItem = signal<MediaItem | null>(null);
  readonly trending = signal<MediaItem[]>([]);
  readonly movies = signal<MediaItem[]>([]);
  readonly series = signal<MediaItem[]>([]);
  readonly topRated = signal<MediaItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly hasData = computed(() => this.heroItem() !== null);

  constructor() {
    forkJoin({
      movies: this.api.getMovies().pipe(catchError(() => of([]))),
      series: this.api.getSeries().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ movies, series }) => {
        
        const mapped: HomeMappedData = mapHomeResponse(
          { featured: null, featuredType: 'movie', movieCategories: [], seriesCategories: [] },
          movies,
          series,
        );

        this.heroItem.set(mapped.heroItem);
        this.trending.set(mapped.trending);
        this.movies.set(mapped.movies);
        this.series.set(mapped.series);
        this.topRated.set(mapped.topRated);
        this.loading.set(false);

        if (!mapped.heroItem) {
          this.error.set('Não foi possível carregar o conteúdo.');
        }
      },
      error: () => {
        this.error.set('Não foi possível carregar o conteúdo.');
        this.loading.set(false);
      },
    });
  }
}
