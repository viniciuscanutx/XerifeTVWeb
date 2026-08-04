import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly router = inject(Router);

  readonly searchOpen = signal(false);
  readonly searchQuery = signal('');
  readonly currentUrl = signal('');

  constructor() {
    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.searchOpen.set(false);
      });
  }

  toggleSearch(): void {
    this.searchOpen.update((v) => !v);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    if (this.searchQuery().trim()) {
      console.log('Searching for:', this.searchQuery());
    }
  }
}
