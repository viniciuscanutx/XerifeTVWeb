import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { ContentApiService } from '../../shared/data/content-api.service';
import { seriesToMediaItem, toMediaItem } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { VideoPlayerModal } from '../../shared/components/video-player-modal/video-player-modal';

interface WatchItem extends MediaItem {
  duration?: string;
  parentalRating?: string;
  videoUrl?: string | null;
  videoResolverUrl?: string | null;
  streamFormat?: string;
}

interface ParentalBadge {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const PARENTAL_BADGES: Record<string, ParentalBadge> = {
  'L':    { label: 'L',    color: '#00b04f', bgColor: '#00b04f', description: 'Livre' },
  '10':   { label: '10',   color: '#00aaff', bgColor: '#00aaff', description: 'Não recomendado para menores de 10 anos' },
  '12':   { label: '12',   color: '#ffc107', bgColor: '#ffc107', description: 'Não recomendado para menores de 12 anos' },
  '14':   { label: '14',   color: '#ff8c00', bgColor: '#ff8c00', description: 'Não recomendado para menores de 14 anos' },
  '16':   { label: '16',   color: '#ff0000', bgColor: '#ff0000', description: 'Não recomendado para menores de 16 anos' },
  '18':   { label: '18',   color: '#000000', bgColor: '#000000', description: 'Não recomendado para menores de 18 anos' },
};

@Component({
  selector: 'app-watch',
  imports: [RouterLink, VideoPlayerModal],
  templateUrl: './watch.html',
  styleUrl: './watch.css',
})
export class Watch {
  readonly capitalizeFirstLetter = capitalizeFirstLetter;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ContentApiService);

  readonly item = signal<WatchItem | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly playerError = signal(false);
  readonly resolvingVideo = signal(false);
  readonly playerOpen = signal(false);
  readonly contentLabel = computed(() => this.item()?.type === 'series' ? 'Série' : 'Filme');
  readonly parentalBadge = computed<ParentalBadge | null>(() => {
    const raw = this.item()?.parentalRating?.trim().toUpperCase() ?? '';
    if (!raw) return null;
    for (const key of Object.keys(PARENTAL_BADGES)) {
      if (raw === key || raw.includes(key)) return PARENTAL_BADGES[key];
    }
    return null;
  });

  openPlayer(): void {
    this.playerOpen.set(true);
  }

  closePlayer(): void {
    this.playerOpen.set(false);
  }

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
      const url = video?.url || resolverUrl;
      const format = video?.streamFormat || (url.includes('.m3u8') ? 'hls' : 'mp4');
      this.item.update((item) => item ? { ...item, videoUrl: url, streamFormat: format } : item);
    });
  }

  

}
