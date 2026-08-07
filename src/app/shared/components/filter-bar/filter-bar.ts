import { Component, input, model } from '@angular/core';

export interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.css',
})
export class FilterBar {
  readonly title = input<string>('');
  readonly count = input<number | null>(null);
  readonly countLabel = input<string>('títulos');

  readonly options = input.required<FilterOption[]>();
  readonly selected = model<string>('all');
  readonly allValue = input<string>('all');
  readonly allLabel = input<string>('Todos os gêneros');

  readonly searchable = input<boolean>(false);
  readonly searchTerm = model<string>('');
  readonly searchPlaceholder = input<string>('Buscar...');

  readonly sortOptions = input<FilterOption[]>([]);
  readonly sortValue = model<string>('');

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onGenreChange(event: Event): void {
    this.selected.set((event.target as HTMLSelectElement).value);
  }

  onSortChange(event: Event): void {
    this.sortValue.set((event.target as HTMLSelectElement).value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }
}
