import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { ContentApiService } from '../../shared/data/content-api.service';
import { seriesToMediaItem, toMediaItem } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { VideoPlayerModal } from '../../shared/components/video-player-modal/video-player-modal';

export interface EpisodeItem {
  id: string;
  title: string;
  number?: number;
  season?: number;
  bannerUrl?: string;
  duration?: string;
  videoResolverUrl?: string | null;
  videoUrl?: string | null;
  streamFormat?: string;
}

export interface WatchItem extends MediaItem {
  duration?: string;
  parentalRating?: string;
  videoUrl?: string | null;
  videoResolverUrl?: string | null;
  streamFormat?: string;
  totalSeasons?: number;
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

  // Series & Episode signals
  readonly selectedSeason = signal<number>(1);
  readonly episodes = signal<EpisodeItem[]>([]);
  readonly loadingEpisodes = signal<boolean>(false);
  readonly activeEpisode = signal<EpisodeItem | null>(null);
  readonly episodePage = signal<number>(1);
  readonly episodesPerPage = 10;

  readonly contentLabel = computed(() => this.item()?.type === 'series' ? 'Série' : 'Filme');

  readonly seasonsList = computed<number[]>(() => {
    const seasons = this.item()?.totalSeasons || 1;
    return Array.from({ length: seasons }, (_, i) => i + 1);
  });

  readonly totalEpisodePages = computed(() => {
    return Math.ceil(this.episodes().length / this.episodesPerPage) || 1;
  });

  readonly episodePageNumbers = computed<number[]>(() => {
    const total = this.totalEpisodePages();
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  readonly paginatedEpisodes = computed(() => {
    const page = this.episodePage();
    const start = (page - 1) * this.episodesPerPage;
    return this.episodes().slice(start, start + this.episodesPerPage);
  });

  readonly playerTitle = computed(() => {
    const item = this.item();
    const ep = this.activeEpisode();
    if (!item) return '';
    if (item.type === 'series' && ep) {
      const seasonNum = ep.season ?? this.selectedSeason();
      const epNum = ep.number ?? 1;
      return `${item.title} - T${seasonNum}:E${epNum}${ep.title ? ' (' + ep.title + ')' : ''}`;
    }
    return item.title;
  });

  readonly playerVideoUrl = computed(() => {
    const ep = this.activeEpisode();
    const item = this.item();
    if (item?.type === 'series' && ep) {
      return ep.videoUrl || ep.videoResolverUrl || null;
    }
    return item?.videoUrl || item?.videoResolverUrl || null;
  });

  readonly playerStreamFormat = computed(() => {
    const ep = this.activeEpisode();
    const item = this.item();
    if (item?.type === 'series' && ep) {
      return ep.streamFormat || 'mp4';
    }
    return item?.streamFormat || 'mp4';
  });

  readonly parentalBadge = computed<ParentalBadge | null>(() => {
    const raw = this.item()?.parentalRating?.trim().toUpperCase() ?? '';
    if (!raw) return null;
    for (const key of Object.keys(PARENTAL_BADGES)) {
      if (raw === key || raw.includes(key)) return PARENTAL_BADGES[key];
    }
    return null;
  });

  openPlayer(): void {
    const item = this.item();
    if (item?.type === 'series') {
      const epList = this.episodes();
      if (epList.length > 0) {
        this.playEpisode(epList[0]);
      } else {
        this.playerOpen.set(true);
      }
    } else {
      this.activeEpisode.set(null);
      this.playerOpen.set(true);
    }
  }

  closePlayer(): void {
    this.playerOpen.set(false);
  }

  selectSeason(season: number): void {
    this.selectedSeason.set(season);
    this.episodePage.set(1);
    const seriesId = this.item()?.id;
    if (seriesId) {
      this.loadEpisodes(seriesId, season);
    }
  }

  onSeasonChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectSeason(Number(value));
  }

  goToEpisodePage(page: number): void {
    if (page >= 1 && page <= this.totalEpisodePages()) {
      this.episodePage.set(page);
    }
  }

  playEpisode(ep: EpisodeItem): void {
    this.activeEpisode.set(ep);
    const resolverUrl = ep.videoResolverUrl;
    if (resolverUrl && !ep.videoUrl) {
      this.resolvingVideo.set(true);
      this.api.resolveVideoUrl(resolverUrl).pipe(catchError(() => of(null))).subscribe((video) => {
        this.resolvingVideo.set(false);
        const url = video?.url || resolverUrl;
        const format = video?.streamFormat || (url?.includes('.m3u8') ? 'hls' : 'mp4');
        const updatedEp = { ...ep, videoUrl: url, streamFormat: format };
        this.activeEpisode.set(updatedEp);
        this.playerOpen.set(true);
      });
    } else {
      this.playerOpen.set(true);
    }
  }

  constructor() {
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) return of(null);

        return params.get('type') === 'series'
          ? this.api.getSeriesById(id).pipe(map((series: any) => ({
              ...seriesToMediaItem(series),
              parentalRating: series.parentalRating ? String(series.parentalRating) : undefined,
              totalSeasons: Number(series.totalSeasons || series.numberSeasons) || 1,
            })))
          : this.api.getMovieById(id).pipe(map((movie: any) => ({
              ...toMediaItem(movie),
              duration: movie.duration || movie.durationHHmm,
              parentalRating: movie.parentalRating ? String(movie.parentalRating) : undefined,
              videoResolverUrl: movie.videoResolverURL || movie.urlResolverPath,
            })));
      }),
      catchError(() => of(null)),
    ).subscribe((item: WatchItem | null) => {
      this.item.set(item);
      this.playerError.set(false);
      this.error.set(item ? null : 'Não foi possível encontrar este título.');
      this.loading.set(false);

      if (item?.type === 'series') {
        this.loadEpisodes(item.id, 1);
      } else if (item?.videoResolverUrl) {
        this.loadVideo(item.videoResolverUrl);
      }
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

  private loadEpisodes(seriesId: string, season: number): void {
    this.loadingEpisodes.set(true);
    this.api.getEpisodes(seriesId, season).pipe(
      catchError(() => of([])),
    ).subscribe((res: any) => {
      this.loadingEpisodes.set(false);
      let rawList: any[] = [];
      if (Array.isArray(res)) {
        rawList = res;
      } else if (res?.episodes && Array.isArray(res.episodes)) {
        rawList = res.episodes;
      } else if (res?.items && Array.isArray(res.items)) {
        rawList = res.items;
      }

      const list: EpisodeItem[] = rawList.map((ep: any, index: number) => ({
        id: ep.id || `ep-${index}`,
        title: ep.title || `Episódio ${ep.number ?? index + 1}`,
        number: ep.number ?? index + 1,
        season: ep.season ?? season,
        bannerUrl: ep.bannerURL || ep.bannerUrl,
        duration: ep.duration ? (typeof ep.duration === 'number' ? `${Math.floor(ep.duration / 60)} min` : String(ep.duration)) : ep.durationHHmm,
        videoResolverUrl: ep.videoResolverURL || ep.urlResolverPath || ep.video?.url,
        videoUrl: ep.video?.url,
        streamFormat: ep.video?.streamFormat || 'mp4',
      }));

      this.episodes.set(list);
      this.episodePage.set(1);
    });
  }
}

