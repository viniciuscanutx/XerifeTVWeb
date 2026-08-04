import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaCard, MediaItem } from '../../shared/components/media-card/media-card';
import { ContentApiService } from '../../shared/data/content-api.service';
import { seriesToMediaItem, toMediaItem } from '../../shared/data/content-api.mapper';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-search',
  imports: [MediaCard],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class SearchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ContentApiService);

  readonly queryTerm = signal<string>('');
  readonly filterType = signal<'all' | 'movie' | 'series'>('all');
  readonly loading = signal<boolean>(false);
  readonly movieResults = signal<MediaItem[]>([]);
  readonly seriesResults = signal<MediaItem[]>([]);

  readonly allResults = computed<MediaItem[]>(() => {
    return [...this.movieResults(), ...this.seriesResults()];
  });

  readonly filteredResults = computed<MediaItem[]>(() => {
    const type = this.filterType();
    if (type === 'movie') return this.movieResults();
    if (type === 'series') return this.seriesResults();
    return this.allResults();
  });

  readonly totalCount = computed(() => this.filteredResults().length);

  constructor() {
    this.route.queryParamMap
      .pipe(
        switchMap((params) => {
          const q = params.get('q')?.trim() ?? '';
          this.queryTerm.set(q);
          if (!q) {
            this.movieResults.set([]);
            this.seriesResults.set([]);
            this.loading.set(false);
            return of(null);
          }

          this.loading.set(true);
          return this.api.search(q).pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((res: any) => {
        this.loading.set(false);
        if (!res) return;

        const movies = (res.movies || res.items?.movies || []).map(toMediaItem);
        const series = (res.series || res.items?.series || []).map(seriesToMediaItem);

        this.movieResults.set(movies);
        this.seriesResults.set(series);
      });
  }

  onSearchInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: term || null },
      queryParamsHandling: 'merge',
    });
  }

  setFilter(type: 'all' | 'movie' | 'series'): void {
    this.filterType.set(type);
  }
}
