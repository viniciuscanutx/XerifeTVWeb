import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { ContentApiService } from '../../data/content-api.service';
import { seriesToMediaItem, toMediaItem } from '../../data/content-api.mapper';
import { MediaItem } from '../media-card/media-card';
import { AuthService } from '../../services/auth.service';
import { ProfileAvatar } from '../profile-avatar/profile-avatar';

const IMMERSIVE_ROUTE = /^\/((?=[?#]|$)|profile(?=[?#]|$)|(watch|assistir)\/)/;
const SCROLL_THRESHOLD_PX = 24;

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, ProfileAvatar],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnDestroy {
  private readonly router = inject(Router);
  private readonly api = inject(ContentApiService);
  readonly authService = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  readonly searchOpen = signal(false);
  readonly searchQuery = signal('');
  readonly currentUrl = signal('');
  readonly isSearching = signal(false);
  readonly searchResults = signal<MediaItem[]>([]);
  readonly dropdownOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly isLoginPage = computed(() => this.currentUrl().startsWith('/login'));
  /** Páginas com imagem de fundo no topo: a navbar fica sobre ela, transparente até rolar. */
  readonly isImmersivePage = computed(() => IMMERSIVE_ROUTE.test(this.currentUrl()));
  readonly scrolled = signal(false);
  readonly isTransparent = computed(() => this.isImmersivePage() && !this.scrolled());

  private readonly searchSubject = new Subject<string>();
  private readonly sub: Subscription;

  constructor() {
    // Remove o espaço reservado da navbar no layout para o fundo da página subir até o topo.
    effect(() => this.document.body.classList.toggle('nav-immersive', this.isImmersivePage()));

    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        // A página nova só volta ao topo depois de renderizar; relê a rolagem nesse momento.
        afterNextRender(() => this.updateScrolled(), { injector: this.injector });
        this.searchOpen.set(false);
        this.dropdownOpen.set(false);
        this.accountMenuOpen.set(false);
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

  @HostListener('window:scroll')
  updateScrolled(): void {
    this.scrolled.set(window.scrollY > SCROLL_THRESHOLD_PX);
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

  toggleAccountMenu(): void {
    this.accountMenuOpen.update((v) => !v);
  }

  logout(): void {
    this.accountMenuOpen.set(false);
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
