import { Component, computed, inject, signal } from '@angular/core';
import { MediaCard, MediaItem } from '../../shared/components/media-card/media-card';
import { FilterBar, FilterOption } from '../../shared/components/filter-bar/filter-bar';
import { ContentApiService } from '../../shared/data/content-api.service';
import { seriesToMediaItem } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { catchError, of } from 'rxjs';

const SORT_OPTIONS: FilterOption[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'az', label: 'A-Z' },
  { value: 'rating', label: 'Mais bem avaliados' },
];

@Component({
  selector: 'app-series',
  imports: [MediaCard, FilterBar],
  templateUrl: './series.html',
  styleUrl: './series.css',
})
export class SeriesPage {
  private readonly api = inject(ContentApiService);

  readonly sortOptions = SORT_OPTIONS;

  readonly allSeries = signal<MediaItem[]>([]);
  readonly categories = signal<string[]>([]);
  readonly selectedCategory = signal<string>('all');
  readonly searchTerm = signal<string>('');
  readonly sortBy = signal<string>('recent');
  readonly loading = signal(true);

  readonly categoryOptions = computed<FilterOption[]>(() =>
    this.categories().map((c) => ({ value: c, label: capitalizeFirstLetter(c) })),
  );

  readonly filteredSeries = computed(() => {
    const cat = this.selectedCategory();
    const term = this.searchTerm().trim().toLowerCase();
    const sort = this.sortBy();

    let list = this.allSeries();
    if (cat !== 'all') {
      list = list.filter((s) => s.genres.some((g) => g.toLowerCase() === cat.toLowerCase()));
    }
    if (term) {
      list = list.filter((s) => s.title.toLowerCase().includes(term));
    }

    return [...list].sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title);
      if (sort === 'rating') return b.rating - a.rating;
      return b.year - a.year;
    });
  });

  constructor() {
    this.api.getSeries(60).pipe(catchError(() => of([]))).subscribe((series) => {
      const mapped = series.map(seriesToMediaItem);
      this.allSeries.set(mapped);
      this.loading.set(false);

      const catsSet = new Set<string>();
      mapped.forEach((s) => s.genres.forEach((g) => catsSet.add(g)));
      this.categories.set(Array.from(catsSet));
    });
  }
}
