import { Component, computed, inject, signal } from '@angular/core';
import { MediaCard, MediaItem } from '../../shared/components/media-card/media-card';
import { ContentApiService } from '../../shared/data/content-api.service';
import { toMediaItem } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-movies',
  imports: [MediaCard],
  templateUrl: './movies.html',
  styleUrl: './movies.css',
})
export class Movies {
  readonly capitalizeFirstLetter = capitalizeFirstLetter;
  private readonly api = inject(ContentApiService);

  readonly allMovies = signal<MediaItem[]>([]);
  readonly categories = signal<string[]>([]);
  readonly selectedCategory = signal<string>('all');
  readonly loading = signal(true);
  readonly mobileCategoryModalOpen = signal(false);

  readonly filteredMovies = computed(() => {
    const cat = this.selectedCategory();
    const list = this.allMovies();
    if (cat === 'all') return list;
    return list.filter((m) =>
      m.genres.some((g) => g.toLowerCase() === cat.toLowerCase()),
    );
  });

  constructor() {
    this.api.getMovies(100).pipe(catchError(() => of([]))).subscribe((movies) => {
      const mapped = movies.map(toMediaItem);
      this.allMovies.set(mapped);
      this.loading.set(false);

      const catsSet = new Set<string>();
      mapped.forEach((m) => m.genres.forEach((g) => catsSet.add(g)));
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
