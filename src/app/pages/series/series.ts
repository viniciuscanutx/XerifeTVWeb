import { Component, computed, inject, signal } from '@angular/core';
import { MediaCard, MediaItem } from '../../shared/components/media-card/media-card';
import { ContentApiService } from '../../shared/data/content-api.service';
import { seriesToMediaItem } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-series',
  imports: [MediaCard],
  templateUrl: './series.html',
  styleUrl: './series.css',
})
export class SeriesPage {
  readonly capitalizeFirstLetter = capitalizeFirstLetter;
  private readonly api = inject(ContentApiService);

  readonly allSeries = signal<MediaItem[]>([]);
  readonly categories = signal<string[]>([]);
  readonly selectedCategory = signal<string>('all');
  readonly loading = signal(true);
  readonly mobileCategoryModalOpen = signal(false);

  readonly filteredSeries = computed(() => {
    const cat = this.selectedCategory();
    const list = this.allSeries();
    if (cat === 'all') return list;
    return list.filter((s) =>
      s.genres.some((g) => g.toLowerCase() === cat.toLowerCase()),
    );
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

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.mobileCategoryModalOpen.set(false);
  }

  toggleMobileModal(): void {
    this.mobileCategoryModalOpen.update((v) => !v);
  }

  closeMobileModal(): void {
    this.mobileCategoryModalOpen.set(false);
  }
}
