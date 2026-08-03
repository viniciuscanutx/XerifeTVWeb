import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { ContentApiService } from '../../shared/data/content-api.service';
import { seriesToMediaItem, toMediaItem } from '../../shared/data/content-api.mapper';

interface WatchItem extends MediaItem {
  duration?: string;
  parentalRating?: string;
  videoUrl?: string | null;
  videoResolverUrl?: string | null;
}

@Component({
  selector: 'app-watch',
  imports: [RouterLink],
  templateUrl: './watch.html',
  styleUrl: './watch.css',
})
export class Watch {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ContentApiService);

  readonly item = signal<WatchItem | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly playerError = signal(false);
  readonly resolvingVideo = signal(false);
  readonly contentLabel = computed(() => this.item()?.type === 'series' ? 'Série' : 'Filme');

  constructor() {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) return of(null);

        return params.get('type') === 'series'
          ? this.api.getSeriesById(id).pipe(map((series) => ({
              ...seriesToMediaItem(series),
              parentalRating: series.parentalRating,
            })))
          : this.api.getMovieById(id).pipe(map((movie) => ({
              ...toMediaItem(movie),
              duration: movie.duration,
              parentalRating: movie.parentalRating,
              videoResolverUrl: movie.videoResolverURL,
            })));
      }),
      catchError(() => of(null)),
    ).subscribe((item: WatchItem | null) => {
      this.item.set(item);
      this.playerError.set(false);
      this.error.set(item ? null : 'Não foi possível encontrar este título.');
      this.loading.set(false);
      if (item?.videoResolverUrl) this.loadVideo(item.videoResolverUrl);
    });
  }

  onPlayerError(): void {
    this.playerError.set(true);
  }

  private loadVideo(resolverUrl: string): void {
    this.resolvingVideo.set(true);
    this.api.resolveVideoUrl(resolverUrl).pipe(catchError(() => of(null))).subscribe((video) => {
      this.resolvingVideo.set(false);
      if (!video?.url) {
        this.playerError.set(true);
        return;
      }
      this.item.update((item) => item ? { ...item, videoUrl: video.url } : item);
    });
  }
}
