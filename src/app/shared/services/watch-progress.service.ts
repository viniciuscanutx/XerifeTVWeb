import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WatchProgress {
  contentId: string;
  type: 'movie' | 'series';
  title: string;
  poster: string;
  backdrop?: string | null;
  season?: number;
  episodeId?: string;
  episodeNumber?: number;
  episodeTitle?: string;
  currentTime: number;
  duration: number;
  progressPercentage: number;
  updatedAt: number;
}

export type UpsertWatchProgressDto = Omit<WatchProgress, 'progressPercentage' | 'updatedAt'>;

@Injectable({ providedIn: 'root' })
export class WatchProgressService {
  private readonly base = `${environment.apiUrl.replace(/\/?$/, '/')}Api/WatchProgress`;

  private readonly auth = inject(AuthService);
  readonly items = signal<WatchProgress[]>([]);

  constructor(private http: HttpClient) {
    effect(onCleanup => {
      const userId = this.auth.currentUser()?.id;
      this.items.set([]);
      if (!userId) return;
      const subscription = this.getContinueWatching().subscribe({
        next: list => this.items.set(list), error: () => {},
      });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  refresh(limit = 50): void {
    this.getContinueWatching(limit).subscribe({
      next: (list) => this.items.set(list),
      error: () => {},
    });
  }

  getContinueWatching(limit = 50): Observable<WatchProgress[]> {
    return this.http.get<WatchProgress[]>(`${this.base}?limit=${limit}`);
  }

  getItemProgress(contentId: string): WatchProgress | null {
    return this.items().find((i) => i.contentId === contentId) ?? null;
  }

  save(dto: UpsertWatchProgressDto): Observable<WatchProgress> {
    const userId = this.auth.currentUser()?.id;
    return this.http.post<WatchProgress>(this.base, dto).pipe(
      tap((res) => {
        if (userId !== this.auth.currentUser()?.id) return;
        const list = [...this.items()];
        const index = list.findIndex((i) => i.contentId === res.contentId);
        if (index >= 0) list[index] = res;
        else list.unshift(res);
        this.items.set(list);
      }),
    );
  }

  remove(contentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${contentId}`).pipe(
      tap(() => this.items.set(this.items().filter((i) => i.contentId !== contentId))),
    );
  }
}
