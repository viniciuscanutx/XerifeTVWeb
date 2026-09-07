import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Favorite,
  ProfileContentType,
  ProfilePage,
  SiteProfile,
  SiteReview,
} from '../models/profile.model';
import { AuthService } from './auth.service';
import { WatchProgress } from './watch-progress.service';

export function profileError(error: unknown): string {
  return error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
    ? error.error.message
    : 'Não foi possível concluir a operação. Tente novamente.';
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl.replace(/\/?$/, '/')}Api`;

  selectBadge(badgeId: string | null) {
    return this.http.put<SiteProfile>(`${this.base}/Profile/Badge`, { badgeId });
  }

  getProfile() {
    return this.http.get<SiteProfile>(`${this.base}/Profile`);
  }

  updateProfile(name: string, avatarUrl: string | null, avatarGiphyId: string | null = null) {
    return this.http
      .put<SiteProfile>(`${this.base}/Profile`, { name, avatarUrl, avatarGiphyId })
      .pipe(
        tap((profile) => {
          this.auth.currentUser.update((user) =>
            user
              ? {
                  ...user,
                  name: profile.name,
                  avatarUrl: profile.avatarUrl,
                  avatarGiphyId: profile.avatarGiphyId,
                }
              : user,
          );
        }),
      );
  }

  getFavorites(page = 1, contentType: ProfileContentType = 'movie', pageSize = 24) {
    return this.http.get<ProfilePage<Favorite>>(`${this.base}/Profile/Favorites`, {
      params: { page, contentType, pageSize },
    });
  }

  isFavorite(movieId: string, contentType: ProfileContentType = 'movie') {
    return this.http.get<{ isFavorite: boolean }>(
      `${this.base}/Profile/Favorites/${encodeURIComponent(movieId)}`,
      { params: { contentType } },
    );
  }

  addFavorite(movieId: string, contentType: ProfileContentType = 'movie') {
    return this.http.put<void>(
      `${this.base}/Profile/Favorites/${encodeURIComponent(movieId)}`,
      {},
      { params: { contentType } },
    );
  }

  removeFavorite(movieId: string, contentType: ProfileContentType = 'movie') {
    return this.http.delete<void>(`${this.base}/Profile/Favorites/${encodeURIComponent(movieId)}`, {
      params: { contentType },
    });
  }

  getRecent(page = 1, contentType: ProfileContentType | 'all' = 'movie', pageSize = 24) {
    return this.http.get<ProfilePage<WatchProgress>>(`${this.base}/Profile/Recent`, {
      params: { page, contentType, pageSize },
    });
  }

  getMyReviews(page = 1, contentType: ProfileContentType | 'all' = 'movie', pageSize = 12) {
    return this.http.get<ProfilePage<SiteReview>>(`${this.base}/Profile/Reviews`, {
      params: { page, contentType, pageSize },
    });
  }

  getMovieReviews(movieId: string, page = 1, contentType: ProfileContentType = 'movie') {
    return this.http.get<ProfilePage<SiteReview>>(
      `${this.base}/Reviews/${contentType === 'series' ? 'Series' : 'Movies'}/${encodeURIComponent(movieId)}`,
      { params: { page } },
    );
  }

  getOwnReview(movieId: string, contentType: ProfileContentType = 'movie') {
    return this.http.get<{ review: SiteReview | null }>(
      `${this.base}/Reviews/${contentType === 'series' ? 'Series' : 'Movies'}/${encodeURIComponent(movieId)}/Me`,
    );
  }

  saveReview(
    movieId: string,
    rating: number,
    text: string,
    contentType: ProfileContentType = 'movie',
  ) {
    return this.http.put<SiteReview>(
      `${this.base}/Reviews/${contentType === 'series' ? 'Series' : 'Movies'}/${encodeURIComponent(movieId)}/Me`,
      { rating, text },
    );
  }

  deleteReview(movieId: string, contentType: ProfileContentType = 'movie') {
    return this.http.delete<void>(
      `${this.base}/Reviews/${contentType === 'series' ? 'Series' : 'Movies'}/${encodeURIComponent(movieId)}/Me`,
    );
  }
}
