import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteProfile } from '../../shared/models/profile.model';
import { ProfileService, profileError } from '../../shared/services/profile.service';
import { FeedbackService } from '../../shared/services/feedback.service';
import { AuthService } from '../../shared/services/auth.service';
import { WatchProgress } from '../../shared/services/watch-progress.service';
import { ProfileAvatar } from '../../shared/components/profile-avatar/profile-avatar';
import { GiphyPicker } from '../../shared/components/giphy-picker/giphy-picker';
import { FavoritesCollection } from './favorites-collection/favorites-collection';
import { ProfileReviews } from './profile-reviews/profile-reviews';

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
  readonly profile = signal<SiteProfile | null>(null);
  readonly loading = signal(true);
  readonly profileError = signal('');
  readonly editing = signal(false);
  readonly name = signal('');
  readonly avatarUrl = signal('');
  readonly avatarGiphyId = signal<string | null>(null);
  readonly giphyPickerOpen = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly activeTab = signal<'profile' | 'reviews'>('profile');
  readonly recent = signal<WatchProgress[]>([]);
  readonly recentLoading = signal(true);
  readonly recentError = signal('');
  private recentRevision = 0;

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
    this.saveError.set('');
    this.editing.set(true);
  }

  save(): void {
    if (this.saving() || !this.name().trim()) return;
    this.saving.set(true);
    this.saveError.set('');
    this.api
      .updateProfile(this.name().trim(), this.avatarUrl().trim() || null, this.avatarGiphyId())
      .pipe(takeUntilDestroyed(this.destroyRef))
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
    if (tab === 'profile') this.loadRecent();
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
