import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Hls from 'hls.js';

type VideoState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

interface QualityLevel {
  hlsIndex: number;
  label: string;
}

@Component({
  selector: 'app-video-player',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-player.html',
  styleUrl: './video-player.css',
})
export class VideoPlayer implements OnDestroy {
  private readonly zone = inject(NgZone);

  readonly src = input.required<string>();
  readonly streamFormat = input<string>('mp4');
  readonly poster = input<string | null>(null);
  readonly autoplay = input<boolean>(true);

  private readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoRef');

  private hls: Hls | null = null;
  private rafId: number | null = null;

  readonly videoState = signal<VideoState>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly showControls = signal(true);
  readonly isMuted = signal(false);
  readonly isFullscreen = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly buffered = signal(0);
  readonly volume = signal(1);
  readonly playbackRate = signal(1);
  readonly isBuffering = signal(false);
  readonly qualities = signal<QualityLevel[]>([]);
  readonly currentQuality = signal<number>(-1);
  readonly showSettings = signal(false);
  readonly showVolume = signal(false);

  private hideControlsTimeout: ReturnType<typeof setTimeout> | null = null;
  private unbindHandlers: (() => void) | null = null;

  private readonly rates = [0.5, 1, 1.5, 2];

  readonly progress = computed(() => {
    const d = this.duration();
    return d > 0 ? Math.min(100, (this.currentTime() / d) * 100) : 0;
  });

  readonly bufferedProgress = computed(() => {
    const d = this.duration();
    return d > 0 ? Math.min(100, (this.buffered() / d) * 100) : 0;
  });

  readonly currentTimeLabel = computed(() => this.formatTime(this.currentTime()));
  readonly durationLabel = computed(() => this.formatTime(this.duration()));

  constructor() {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    effect(() => {
      const url = this.src();
      this.loadVideo(url);
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }

  private cleanup(): void {
    this.unbindHandlers?.();
    this.unbindHandlers = null;
    this.stopProgressLoop();
    if (this.hideControlsTimeout) {
      clearTimeout(this.hideControlsTimeout);
      this.hideControlsTimeout = null;
    }
    this.hls?.destroy();
    this.hls = null;
  }

  private bindVideoEvents(video: HTMLVideoElement): void {
    this.unbindHandlers?.();

    const onPlay = () => {
      this.videoState.set('playing');
      this.isBuffering.set(false);
    };
    const onPause = () => {
      if (!video.ended) this.videoState.set('paused');
    };
    const onEnded = () => {
      this.videoState.set('ended');
      this.currentTime.set(0);
    };
    const onLoadedMetadata = () => {
      this.duration.set(video.duration || 0);
      this.volume.set(video.volume);
      this.isMuted.set(video.muted);
    };
    const onWaiting = () => this.isBuffering.set(true);
    const onPlaying = () => this.isBuffering.set(false);
    const onVolumeChange = () => {
      this.volume.set(video.volume);
      this.isMuted.set(video.muted);
    };
    const onRateChange = () => this.playbackRate.set(video.playbackRate);
    const onProgress = () => this.updateBuffered(video);
    const onDurationChange = () => this.duration.set(video.duration || 0);
    const onTimeUpdate = () => {
      this.currentTime.set(video.currentTime);
      this.updateBuffered(video);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('ratechange', onRateChange);
    video.addEventListener('progress', onProgress);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('timeupdate', onTimeUpdate);

    this.unbindHandlers = () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('ratechange', onRateChange);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }

  private startProgressLoop(video: HTMLVideoElement): void {
    this.stopProgressLoop();
    const tick = () => {
      this.zone.run(() => {
        this.currentTime.set(video.currentTime);
        this.updateBuffered(video);
      });
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopProgressLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private updateBuffered(video: HTMLVideoElement): void {
    if (video.buffered.length === 0) return;
    const end = video.buffered.end(video.buffered.length - 1);
    this.buffered.set(end);
  }

  private loadVideo(url: string): void {
    const videoEl = this.videoRef();
    const video = videoEl?.nativeElement;
    if (!video) return;

    this.videoState.set('loading');
    this.errorMessage.set(null);

    this.hls?.destroy();
    this.hls = null;

    const format = (this.streamFormat() || '').toLowerCase();
    const isHls =
      format.includes('m3u8') || format.includes('hls') || url.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 90 });
      this.hls = hls;
      hls.loadSource(url);

      hls.on(Hls.Events.MANIFEST_PARSED, (_e: unknown, data: { levels: { height?: number }[] }) => {
        const levels: QualityLevel[] = data.levels
          .map((l: { height?: number }, i: number) => ({
            hlsIndex: i,
            label: l.height ? `${l.height}p` : `Stream ${i + 1}`,
          }))
          .sort((a: QualityLevel, b: QualityLevel) => parseInt(b.label) - parseInt(a.label));
        this.qualities.set(levels);
        this.currentQuality.set(-1);
      });

      hls.on(Hls.Events.ERROR, (_e: unknown, data: { type?: string }) => {
        if (data?.type === 'networkError') return;
        hls.destroy();
        this.hls = null;
        this.videoState.set('error');
        this.errorMessage.set('Não foi possível carregar o vídeo.');
      });

      hls.attachMedia(video);
    } else {
      video.src = url;
    }

    this.bindVideoEvents(video);
    this.startProgressLoop(video);

    if (this.autoplay()) {
      this.videoPromisePlay(video);
    }
  }

  private videoPromisePlay(video: HTMLVideoElement): void {
    const p = video.play();
    if (p && typeof p.then === 'function') {
      p.catch((err: DOMException) => {
        if (err?.name === 'NotAllowedError') {
          // Autoplay com som bloqueado -> tenta mutado
          video.muted = true;
          this.isMuted.set(true);
          video.play().catch(() => {});
        }
      });
    }
  }

  togglePlay(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    if (video.paused || video.ended) {
      this.videoPromisePlay(video);
    } else {
      video.pause();
    }
  }

  toggleMute(): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    video.muted = !video.muted;
  }

  changeVolume(value: number): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    const v = Math.max(0, Math.min(1, value));
    video.volume = v;
    video.muted = v === 0;
  }

  jumpProgress(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const video = this.videoRef()?.nativeElement;
    const target = event.currentTarget as HTMLElement;
    if (!video || !target) return;
    const rect = target.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    video.currentTime = Math.max(0, Math.min(video.duration || 0, pct * (video.duration || 0)));
  }

  seekForward(): void {
    const video = this.videoRef()?.nativeElement;
    if (video) video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
  }

  seekBackward(): void {
    const video = this.videoRef()?.nativeElement;
    if (video) video.currentTime = Math.max(0, video.currentTime - 10);
  }

  setPlaybackRate(rate: number): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    video.playbackRate = rate;
    this.playbackRate.set(rate);
    this.showSettings.set(false);
  }

  loopRates(): void {
    const idx = this.rates.indexOf(this.playbackRate());
    const next = this.rates[(idx + 1) % this.rates.length] ?? 1;
    this.setPlaybackRate(next);
  }

  selectQuality(hlsIndex: number): void {
    if (!this.hls) return;
    this.currentQuality.set(hlsIndex);
    this.hls.currentLevel = hlsIndex;
    this.showSettings.set(false);
  }

  async toggleFullscreen(): Promise<void> {
    const container = this.videoRef()?.nativeElement.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) {
      await container.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
  }

  private onFullscreenChange = () => {
    this.zone.run(() => this.isFullscreen.set(!!document.fullscreenElement));
  };

  onKeydown(event: KeyboardEvent): void {
    const video = this.videoRef()?.nativeElement;
    if (!video) return;
    switch (event.key) {
      case ' ':
      case 'Spacebar':
        this.togglePlay();
        event.preventDefault();
        break;
      case 'ArrowLeft':
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case 'ArrowRight':
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
        break;
      case 'ArrowUp':
        this.changeVolume(Math.min(1, video.volume + 0.1));
        break;
      case 'ArrowDown':
        this.changeVolume(Math.max(0, video.volume - 0.1));
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case 'm':
      case 'M':
        this.toggleMute();
        break;
    }
  }

  onMouseMove(): void {
    this.showControls.set(true);
    this.scheduleHideControls();
  }

  scheduleHideControls(): void {
    if (this.hideControlsTimeout) clearTimeout(this.hideControlsTimeout);
    this.hideControlsTimeout = setTimeout(() => {
      if (this.videoState() === 'playing') this.showControls.set(false);
    }, 3200);
  }

  retry(): void {
    this.loadVideo(this.src());
  }

  private formatTime(value: number): string {
    if (!isFinite(value) || value < 0) return '0:00';
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = Math.floor(value % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
