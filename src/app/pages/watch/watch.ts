import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { ContentApiService } from '../../shared/data/content-api.service';
import { seriesToMediaItem, toMediaItem } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { VideoPlayerModal } from '../../shared/components/video-player-modal/video-player-modal';
import { WatchProgressService } from '../../shared/services/watch-progress.service';

const PROGRESS_SAVE_INTERVAL_MS = 15000;
const PROGRESS_MIN_CURRENT_TIME = 5;

export interface EpisodeItem {
  id: string;
  title: string;
  number?: number;
  season?: number;
  bannerUrl?: string;
  duration?: string;
  videoResolverUrl?: string | null;
  alternativeVideoResolverUrl?: string | null;
  videoUrl?: string | null;
  streamFormat?: string;
  highQuality?: boolean;
}

export interface WatchItem extends MediaItem {
  duration?: string;
  parentalRating?: string;
  videoUrl?: string | null;
  videoResolverUrl?: string | null;
  alternativeVideoResolverUrl?: string | null;
  streamFormat?: string;
  totalSeasons?: number;
  highQuality?: boolean;
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
  imports: [RouterLink, VideoPlayerModal, MediaCarousel],
  templateUrl: './watch.html',
  styleUrl: './watch.css',
})
export class Watch implements OnDestroy {
  readonly capitalizeFirstLetter = capitalizeFirstLetter;

  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ContentApiService);
  private readonly watchProgress = inject(WatchProgressService);

  private lastPlayback: { currentTime: number; duration: number } | null = null;
  private lastProgressSaveAt = 0;

  readonly item = signal<WatchItem | null>(null);
  readonly recommended = signal<MediaItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly playerError = signal(false);
  readonly resolvingVideo = signal(false);
  readonly playerOpen = signal(false);
  readonly savedStartTime = signal<number>(0);
  readonly autoPlayRequested = signal<boolean>(false);
  readonly targetEpisodeId = signal<string | null>(null);
  readonly targetSeason = signal<number | null>(null);

  // Audio selection signal ('dub' = Dublado, 'sub' = Legendado)
  readonly selectedAudio = signal<'dub' | 'sub'>('dub');

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

  readonly hasDubbedVersion = computed(() => {
    const ep = this.activeEpisode();
    const item = this.item();
    if (item?.type === 'series') {
      if (ep) return !!ep.videoResolverUrl;
      return this.episodes().some((e) => !!e.videoResolverUrl);
    }
    return !!item?.videoResolverUrl;
  });

  readonly hasSubtitledVersion = computed(() => {
    const ep = this.activeEpisode();
    const item = this.item();
    if (item?.type === 'series') {
      if (ep) return !!ep.alternativeVideoResolverUrl;
      return this.episodes().some((e) => !!e.alternativeVideoResolverUrl);
    }
    return !!item?.alternativeVideoResolverUrl;
  });

  readonly hasBothAudioVersions = computed(() => {
    return this.hasDubbedVersion() && this.hasSubtitledVersion();
  });

  readonly isHighQuality = computed(() => {
    const ep = this.activeEpisode();
    const item = this.item();
    if (item?.type === 'series') {
      if (ep) return !!ep.highQuality;
      return !!item?.highQuality || this.episodes().some((e) => !!e.highQuality);
    }
    return !!item?.highQuality;
  });

  readonly hasNextEpisode = computed(() => {
    const item = this.item();
    const ep = this.activeEpisode();
    if (item?.type !== 'series' || !ep) return false;
    const list = this.episodes();
    const idx = list.findIndex((e) => e.id === ep.id);
    if (idx >= 0 && idx < list.length - 1) return true;
    const seasons = item.totalSeasons || 1;
    const currentSeason = ep.season ?? this.selectedSeason();
    return currentSeason < seasons;
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

  private getActiveResolverUrl(
    target: { videoResolverUrl?: string | null; alternativeVideoResolverUrl?: string | null } | null,
    preferredLanguage: 'dub' | 'sub' = this.selectedAudio()
  ): string | null {
    if (!target) return null;
    if (preferredLanguage === 'sub') {
      return target.alternativeVideoResolverUrl || target.videoResolverUrl || null;
    } else {
      return target.videoResolverUrl || target.alternativeVideoResolverUrl || null;
    }
  }

  setAudio(mode: 'dub' | 'sub'): void {
    if (mode === 'sub' && !this.hasSubtitledVersion()) return;
    if (mode === 'dub' && !this.hasDubbedVersion()) return;
    if (this.selectedAudio() === mode) return;
    this.selectedAudio.set(mode);

    const item = this.item();
    if (item?.type === 'series') {
      const ep = this.activeEpisode() || this.episodes()[0];
      if (ep) {
        const resetEp = { ...ep, videoUrl: null };
        this.activeEpisode.set(resetEp);
        this.loadEpisodeVideo(resetEp);
      }
    } else if (item) {
      this.item.update((curr) => (curr ? { ...curr, videoUrl: null } : curr));
      const resolverUrl = this.getActiveResolverUrl(item);
      if (resolverUrl) {
        this.loadVideo(resolverUrl);
      }
    }
  }

  openPlayer(): void {
    const item = this.item();
    if (!item) return;

    const progress = this.watchProgress.getItemProgress(item.id);
    if (progress && progress.currentTime > 0) {
      this.savedStartTime.set(progress.currentTime);
    } else {
      this.savedStartTime.set(0);
    }

    if (item.type === 'series') {
      const epList = this.episodes();
      const ep = this.activeEpisode() || epList[0];
      if (ep) {
        this.playEpisode(ep);
      } else {
        this.playerOpen.set(true);
      }
    } else {
      this.activeEpisode.set(null);
      const resolverUrl = this.getActiveResolverUrl(item);
      if (resolverUrl) {
        this.resolvingVideo.set(true);
        this.api
          .resolveVideoUrl(resolverUrl)
          .pipe(catchError(() => of(null)))
          .subscribe((video) => {
            this.resolvingVideo.set(false);
            const url = video?.url || resolverUrl;
            const format = video?.streamFormat || (url?.includes('.m3u8') ? 'hls' : 'mp4');
            this.item.update((curr) => (curr ? { ...curr, videoUrl: url, streamFormat: format } : curr));
            this.playerOpen.set(true);
          });
      } else {
        alert('Nenhum vídeo disponível para este conteúdo.');
        this.playerOpen.set(true);
      }
    }
  }

  closePlayer(): void {
    this.flushProgress();
    this.playerOpen.set(false);
  }

  ngOnDestroy(): void {
    this.flushProgress();
  }

  onTimeUpdate(evt: { currentTime: number; duration: number }): void {
    if (evt.duration <= 0) return;
    this.lastPlayback = evt;

    if (evt.currentTime < PROGRESS_MIN_CURRENT_TIME) return;
    if (Date.now() - this.lastProgressSaveAt < PROGRESS_SAVE_INTERVAL_MS) return;

    this.saveProgress(evt.currentTime, evt.duration);
  }

  onVideoEnded(): void {
    const item = this.item();
    if (!item) return;
    this.lastPlayback = null;
    this.watchProgress.remove(item.id).subscribe();
  }

  private flushProgress(): void {
    const last = this.lastPlayback;
    if (!last || last.currentTime < PROGRESS_MIN_CURRENT_TIME) return;
    this.saveProgress(last.currentTime, last.duration);
    this.lastPlayback = null;
  }

  private saveProgress(currentTime: number, duration: number): void {
    const item = this.item();
    if (!item) return;
    this.lastProgressSaveAt = Date.now();

    if (item.type === 'series') {
      const ep = this.activeEpisode();
      this.watchProgress.save({
        contentId: item.id,
        type: 'series',
        title: item.title,
        poster: item.poster,
        backdrop: item.backdrop,
        season: ep?.season ?? this.selectedSeason(),
        episodeId: ep?.id,
        episodeNumber: ep?.number,
        episodeTitle: ep?.title,
        currentTime,
        duration,
      }).subscribe();
    } else {
      this.watchProgress.save({
        contentId: item.id,
        type: 'movie',
        title: item.title,
        poster: item.poster,
        backdrop: item.backdrop,
        currentTime,
        duration,
      }).subscribe();
    }
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
    this.flushProgress();

    const item = this.item();
    if (item) {
      const progress = this.watchProgress.getItemProgress(item.id);
      if (progress && progress.episodeId === ep.id && progress.currentTime > 0) {
        this.savedStartTime.set(progress.currentTime);
      } else {
        this.savedStartTime.set(0);
      }
    }
    this.activeEpisode.set(ep);
    this.loadEpisodeVideo(ep, true);
  }

  private loadEpisodeVideo(ep: EpisodeItem, openPlayerWhenDone = false): void {
    const resolverUrl = this.getActiveResolverUrl(ep);
    if (!resolverUrl) {
      if (openPlayerWhenDone) this.playerOpen.set(true);
      return;
    }

    this.resolvingVideo.set(true);
    this.api.resolveVideoUrl(resolverUrl).pipe(catchError(() => of(null))).subscribe((video) => {
      this.resolvingVideo.set(false);
      const url = video?.url || resolverUrl;
      const format = video?.streamFormat || (url?.includes('.m3u8') ? 'hls' : 'mp4');
      const updatedEp = { ...ep, videoUrl: url, streamFormat: format };
      this.episodes.update((list) => list.map((e) => e.id === ep.id ? updatedEp : e));
      this.activeEpisode.set(updatedEp);
      if (openPlayerWhenDone) {
        this.playerOpen.set(true);
      }
    });
  }

  playNextEpisode(): void {
    const item = this.item();
    const ep = this.activeEpisode();
    if (item?.type !== 'series' || !ep) return;

    const list = this.episodes();
    const idx = list.findIndex((e) => e.id === ep.id);

    if (idx >= 0 && idx < list.length - 1) {
      const nextEp = list[idx + 1];
      this.playEpisode(nextEp);
    } else {
      const seasons = item.totalSeasons || 1;
      const currentSeason = ep.season ?? this.selectedSeason();
      if (currentSeason < seasons) {
        const nextSeason = currentSeason + 1;
        this.selectedSeason.set(nextSeason);
        this.episodePage.set(1);
        this.loadingEpisodes.set(true);
        this.api.getEpisodes(item.id, nextSeason).pipe(catchError(() => of([]))).subscribe((res: any) => {
          this.loadingEpisodes.set(false);
          let rawList: any[] = [];
          if (Array.isArray(res)) rawList = res;
          else if (res?.episodes && Array.isArray(res.episodes)) rawList = res.episodes;
          else if (res?.items && Array.isArray(res.items)) rawList = res.items;

          const nextList: EpisodeItem[] = rawList.map((e: any, index: number) => ({
            id: e.id || `ep-${index}`,
            title: e.title || `Episódio ${e.number ?? index + 1}`,
            number: e.number ?? index + 1,
            season: e.season ?? nextSeason,
            bannerUrl: e.bannerURL || e.bannerUrl,
            duration: e.duration ? (typeof e.duration === 'number' ? `${Math.floor(e.duration / 60)} min` : String(e.duration)) : e.durationHHmm,
            videoResolverUrl: e.videoResolverURL || e.urlResolverPath || e.video?.url,
            alternativeVideoResolverUrl: e.alternativeVideoResolverURL || e.alternativeVideoResolverUrl,
            videoUrl: e.video?.url,
            streamFormat: e.video?.streamFormat || 'mp4',
            highQuality: e.highQuality ?? e.HighQuality ?? false,
          }));

          this.episodes.set(nextList);
          if (nextList.length > 0) {
            this.playEpisode(nextList[0]);
          }
        });
      }
    }
  }

  constructor() {
    this.route.queryParamMap.subscribe((qParams) => {
      if (qParams.get('autoplay') === 'true') {
        this.autoPlayRequested.set(true);
      }
      if (qParams.get('episodeId')) {
        this.targetEpisodeId.set(qParams.get('episodeId'));
      }
      if (qParams.get('season')) {
        const s = Number(qParams.get('season')) || 1;
        this.targetSeason.set(s);
        this.selectedSeason.set(s);
      }
    });

    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = params.get('id');
        if (!id) return of(null);

        return params.get('type') === 'series'
          ? this.api.getSeriesById(id).pipe(map((series: any) => ({
              ...seriesToMediaItem(series),
              parentalRating: series.parentalRating ? String(series.parentalRating) : undefined,
              totalSeasons: Number(series.totalSeasons || series.numberSeasons) || 1,
              highQuality: series.highQuality ?? series.HighQuality ?? false,
            })))
          : this.api.getMovieById(id).pipe(map((movie: any) => ({
              ...toMediaItem(movie),
              duration: movie.duration || movie.durationHHmm,
              parentalRating: movie.parentalRating ? String(movie.parentalRating) : undefined,
              videoResolverUrl: movie.videoResolverURL || movie.urlResolverPath,
              alternativeVideoResolverUrl: movie.alternativeVideoResolverURL || movie.alternativeVideoResolverUrl,
              highQuality: movie.highQuality ?? movie.HighQuality ?? false,
            })));
      }),
      catchError(() => of(null)),
    ).subscribe(async (item: WatchItem | null) => {
      this.item.set(item);
      this.playerError.set(false);
      this.error.set(item ? null : 'Não foi possível encontrar este título.');

      if (item) {
        const imageUrl = item.backdrop || item.poster;
        if (imageUrl) {
          await this.preloadImage(imageUrl);
        }
      }

      this.loading.set(false);

      if (item) {
        this.loadRecommended(item);
      }

      if (item?.type === 'series') {
        const seasonToLoad = this.targetSeason() || 1;
        this.loadEpisodes(item.id, seasonToLoad);
      } else if (item) {
        if (this.autoPlayRequested()) {
          this.autoPlayRequested.set(false);
          this.openPlayer();
        } else {
          const resolverUrl = this.getActiveResolverUrl(item);
          if (resolverUrl) {
            this.loadVideo(resolverUrl);
          }
        }
      }
    });
  }

  private loadRecommended(item: WatchItem): void {
    const rec$ = item.type === 'series'
      ? this.api.getSeriesRecommended(item.id).pipe(map((list) => list.map(seriesToMediaItem)), catchError(() => of([])))
      : this.api.getMoviesRecommended(item.id).pipe(map((list) => list.map(toMediaItem)), catchError(() => of([])));

    rec$.subscribe((list) => this.recommended.set(list));
  }

  private preloadImage(url?: string | null): Promise<void> {
    if (!url) return Promise.resolve();
    return new Promise((resolve) => {
      const img = new Image();
      let resolved = false;

      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      const timer = setTimeout(done, 5000);

      img.onload = () => {
        clearTimeout(timer);
        done();
      };
      img.onerror = () => {
        clearTimeout(timer);
        done();
      };

      img.src = url;
      if (img.complete) {
        clearTimeout(timer);
        done();
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
        alternativeVideoResolverUrl: ep.alternativeVideoResolverURL || ep.alternativeVideoResolverUrl,
        videoUrl: ep.video?.url,
        streamFormat: ep.video?.streamFormat || 'mp4',
        highQuality: ep.highQuality ?? ep.HighQuality ?? false,
      }));

      this.episodes.set(list);
      this.episodePage.set(1);

      if (this.autoPlayRequested()) {
        this.autoPlayRequested.set(false);
        const targetEpId = this.targetEpisodeId();
        const targetEp = (targetEpId ? list.find((e) => e.id === targetEpId) : null) || list[0];
        if (targetEp) {
          this.playEpisode(targetEp);
        }
      }
    });
  }
}
