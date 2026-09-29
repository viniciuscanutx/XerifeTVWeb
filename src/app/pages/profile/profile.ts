import { ProfileBadge } from '../../shared/components/profile-badge/profile-badge';
import { ProfileBadges } from './profile-badges/profile-badges';
import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { SiteProfile } from '../../shared/models/profile.model';
import { ProfileService, profileError } from '../../shared/services/profile.service';
import { FeedbackService } from '../../shared/services/feedback.service';
import { AuthService } from '../../shared/services/auth.service';
import { WatchProgress } from '../../shared/services/watch-progress.service';
import { ProfileAvatar } from '../../shared/components/profile-avatar/profile-avatar';
import { GiphyPicker } from '../../shared/components/giphy-picker/giphy-picker';
import { FavoritesCollection } from './favorites-collection/favorites-collection';
import { ProfileReviews } from './profile-reviews/profile-reviews';

type ProfileSection = 'movies' | 'series' | 'reviews';

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-profile',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    ProfileAvatar,
    FavoritesCollection,
    ProfileReviews,
    GiphyPicker,
    ProfileBadge,
    ProfileBadges,
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile-collection.css', './profile.css'],
})
export class Profile {
  private readonly api = inject(ProfileService);
  private readonly feedback = inject(FeedbackService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly tabPanels = viewChild<ElementRef<HTMLElement>>('tabPanels');
  readonly profile = signal<SiteProfile | null>(null);
  readonly loading = signal(true);
  readonly profileError = signal('');
  readonly editing = signal(false);
  readonly name = signal('');
  readonly avatarUrl = signal('');
  readonly avatarGiphyId = signal<string | null>(null);
  readonly selectedBadgeId = signal<string | null>(null);
  readonly bannerUrlDraft = signal('');
  readonly failedBannerUrl = signal<string | null>(null);
  readonly visibleBannerUrl = computed(() => {
    const url = this.editing() ? this.bannerUrlDraft().trim() : this.profile()?.bannerUrl;
    return url && isHttpUrl(url) && url !== this.failedBannerUrl() ? url : null;
  });
  readonly giphyPickerOpen = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly activeTab = signal<'profile' | 'reviews'>('profile');
  readonly recent = signal<WatchProgress[]>([]);
  readonly recentLoading = signal(true);
  readonly recentError = signal('');
  private recentRevision = 0;
  /** Seções que já terminaram o primeiro carregamento; o conteúdo só aparece com todas prontas. */
  private readonly loadedSections = signal<ReadonlySet<ProfileSection>>(new Set());
  readonly sectionsReady = computed(() => {
    const loaded = this.loadedSections();
    if (!loaded.has('reviews')) return false;
    if (this.activeTab() === 'reviews') return true;
    return loaded.has('movies') && loaded.has('series') && !this.recentLoading();
  });

  markSectionLoaded(section: ProfileSection): void {
    this.loadedSections.update((loaded) =>
      loaded.has(section) ? loaded : new Set([...loaded, section]),
    );
  }

  constructor() {
    this.loadProfile();
    this.loadRecent();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.profileError.set('');
    this.api
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: (error) => {
          this.profileError.set(profileError(error));
          this.loading.set(false);
        },
      });
  }

  edit(): void {
    this.name.set(this.profile()?.name ?? '');
    this.avatarUrl.set(this.profile()?.avatarUrl ?? '');
    this.avatarGiphyId.set(this.profile()?.avatarGiphyId ?? null);
    this.selectedBadgeId.set(this.profile()?.selectedBadge?.id ?? null);
    this.bannerUrlDraft.set(this.profile()?.bannerUrl ?? '');
    this.saveError.set('');
    this.editing.set(true);
  }

  save(): void {
    if (this.saving() || !this.name().trim()) return;
    this.saving.set(true);
    this.saveError.set('');
    const badgeId = this.selectedBadgeId();
    const badgeChanged = badgeId !== (this.profile()?.selectedBadge?.id ?? null);
    this.api
      .updateProfile(
        this.name().trim(),
        this.avatarUrl().trim() || null,
        this.avatarGiphyId(),
        this.bannerUrlDraft().trim() || null,
      )
      .pipe(
        switchMap((profile) => (badgeChanged ? this.api.selectBadge(badgeId) : of(profile))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.saving.set(false);
          this.editing.set(false);
          this.feedback.success('Perfil atualizado', 'As alterações do seu perfil foram salvas.');
        },
        error: (error) => {
          this.saveError.set(profileError(error));
          this.saving.set(false);
        },
      });
  }

  setAvatarUrl(url: string): void {
    this.avatarUrl.set(url);
    this.avatarGiphyId.set(null);
  }

  selectGif(id: string): void {
    this.avatarGiphyId.set(id);
    this.avatarUrl.set('');
  }

  selectTab(tab: 'profile' | 'reviews'): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    afterNextRender(() => this.animateTabChange(tab === 'reviews' ? 1 : -1), {
      injector: this.injector,
    });
    if (tab === 'profile') {
      // Os favoritos são recriados ao voltar para a aba, então esperam carregar de novo.
      this.loadedSections.update(
        (loaded) => new Set([...loaded].filter((section) => section === 'reviews')),
      );
      this.loadRecent();
    }
  }

  /**
   * Desliza o conteúdo na direção da aba escolhida (1 = direita, -1 = esquerda).
   * Com "reduzir movimento" ativo no sistema, faz só um fade, sem deslocamento.
   */
  private animateTabChange(direction: 1 | -1): void {
    const panels = this.tabPanels()?.nativeElement;
    if (!panels) return;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const offset = reduceMotion ? 0 : direction * 24;
    panels.animate(
      [
        { opacity: 0, transform: `translateX(${offset}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: reduceMotion ? 200 : 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }

  loadRecent(): void {
    const revision = ++this.recentRevision;
    this.recentLoading.set(true);
    this.recentError.set('');
    this.api
      .getRecent(1, 'all', 5)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          if (revision !== this.recentRevision) return;
          this.recent.set(data.items.slice(0, 5));
          this.recentLoading.set(false);
        },
        error: (error) => {
          if (revision !== this.recentRevision) return;
          this.recentError.set(profileError(error));
          this.recentLoading.set(false);
        },
      });
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
