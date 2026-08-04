import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { ContentApiService } from '../../shared/data/content-api.service';
import { mapHomeResponse, type HomeMappedData } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { catchError, forkJoin, of } from 'rxjs';
import { WatchHistoryService, WatchHistoryItem } from '../../shared/services/watch-history.service';

@Component({
  selector: 'app-home',
  imports: [MediaCarousel, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly capitalizeFirstLetter = capitalizeFirstLetter;
  private readonly api = inject(ContentApiService);
  private readonly watchHistory = inject(WatchHistoryService);

  readonly heroItem = signal<MediaItem | null>(null);
  readonly trending = signal<MediaItem[]>([]);
  readonly movies = signal<MediaItem[]>([]);
  readonly series = signal<MediaItem[]>([]);
  readonly topRated = signal<MediaItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly continueWatchingItems = computed(() => {
    return this.watchHistory.history().filter((i) => i.progressPercentage > 0 && i.progressPercentage < 95);
  });

  readonly hasData = computed(() => this.heroItem() !== null);

  constructor() {
    forkJoin({
      home: this.api.getHome().pipe(catchError(() => of(null))),
      movies: this.api.getMovies().pipe(catchError(() => of([]))),
      series: this.api.getSeries().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ home, movies, series }) => {
        const mapped: HomeMappedData = mapHomeResponse(
          home ?? { featured: null, featuredType: 'movie', movieCategories: [], seriesCategories: [] },
          movies,
          series,
        );

        this.heroItem.set(mapped.heroItem);
        this.trending.set(mapped.trending);
        this.movies.set(mapped.movies);
        this.series.set(mapped.series);
        this.topRated.set(mapped.topRated);
        this.loading.set(false);

        if (!mapped.heroItem && mapped.movies.length === 0 && mapped.series.length === 0) {
          this.error.set('Não foi possível carregar o conteúdo.');
        }
      },
      error: () => {
        this.error.set('Não foi possível carregar o conteúdo.');
        this.loading.set(false);
      },
    });
  }

  formatRemainingTime(item: WatchHistoryItem): string {
    const remainingSeconds = Math.max(0, item.duration - item.currentTime);
    const minutes = Math.ceil(remainingSeconds / 60);
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h ${m}m restantes`;
    }
    return `${minutes}m restantes`;
  }

  removeHistory(event: Event, contentId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.watchHistory.removeProgress(contentId);
  }
}
