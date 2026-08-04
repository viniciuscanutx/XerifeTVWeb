import { Component, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { ContentApiService } from '../../data/content-api.service';
import { seriesToMediaItem, toMediaItem } from '../../data/content-api.mapper';
import { MediaItem } from '../media-card/media-card';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(ContentApiService);

  readonly searchOpen = signal(false);
  readonly searchQuery = signal('');
  readonly currentUrl = signal('');
  readonly isSearching = signal(false);
  readonly searchResults = signal<MediaItem[]>([]);
  readonly dropdownOpen = signal(false);

  private readonly searchSubject = new Subject<string>();
  private readonly sub: Subscription;

  constructor() {
    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.searchOpen.set(false);
        this.dropdownOpen.set(false);
      });

    this.sub = this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = term.trim();
          if (!q) {
            this.isSearching.set(false);
            this.searchResults.set([]);
            this.dropdownOpen.set(false);
            return of(null);
          }
          this.isSearching.set(true);
          this.dropdownOpen.set(true);
          return this.api.search(q).pipe(catchError(() => of(null)));
        }),
      )
      .subscribe((res: any) => {
        this.isSearching.set(false);
        if (!res) {
          this.searchResults.set([]);
          return;
        }
        const movies = (res.movies || res.items?.movies || []).map(toMediaItem);
        const series = (res.series || res.items?.series || []).map(seriesToMediaItem);
        this.searchResults.set([...movies, ...series]);
      });
  }

  toggleSearch(): void {
    this.searchOpen.update((v) => !v);
    if (!this.searchOpen()) {
      this.clearSearch();
    }
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.clearSearch();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.dropdownOpen.set(false);
    this.isSearching.set(false);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.searchSubject.next(val);
  }

  onResultClick(): void {
    this.closeSearch();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
