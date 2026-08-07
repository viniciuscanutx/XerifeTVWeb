import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { ContentApiService } from '../../shared/data/content-api.service';
import { mapHomeResponse, toMediaItem, seriesToMediaItem, type HomeMappedData } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { catchError, forkJoin, map, of } from 'rxjs';
import { WatchHistoryService, WatchHistoryItem } from '../../shared/services/watch-history.service';

interface CategoryRail {
  title: string;
  icon: string;
  items: MediaItem[];
}

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
  readonly topRated = signal<MediaItem[]>([]);
  readonly trending = signal<MediaItem[]>([]);
  readonly categoryRails = signal<CategoryRail[]>([]);
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
        this.topRated.set(mapped.topRated);
        this.trending.set(mapped.trending);
        this.loading.set(false);

        if (!mapped.heroItem && movies.length === 0 && series.length === 0) {
          this.error.set('Não foi possível carregar o conteúdo.');
        }

        this.loadCategoryRails(mapped.movieCategories, mapped.seriesCategories);
      },
      error: () => {
        this.error.set('Não foi possível carregar o conteúdo.');
        this.loading.set(false);
      },
    });
  }

  private loadCategoryRails(movieCategories: string[], seriesCategories: string[]): void {
    const movieCalls = movieCategories.map((cat) =>
      this.api.getMoviesByCategory(cat, 1, 15).pipe(
        map((items): CategoryRail => ({
          title: capitalizeFirstLetter(cat),
          icon: 'bi-film',
          items: items.map(toMediaItem),
        })),
        catchError(() => of(null)),
      ),
    );

    const seriesCalls = seriesCategories.map((cat) =>
      this.api.getSeriesByCategory(cat, 1, 15).pipe(
        map((items): CategoryRail => ({
          title: capitalizeFirstLetter(cat),
          icon: 'bi-tv',
          items: items.map(seriesToMediaItem),
        })),
        catchError(() => of(null)),
      ),
    );

    const calls = [...movieCalls, ...seriesCalls];
    if (calls.length === 0) return;

    forkJoin(calls).subscribe((rails) => {
      this.categoryRails.set(
        rails.filter((r): r is CategoryRail => !!r && r.items.length > 0),
      );
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
