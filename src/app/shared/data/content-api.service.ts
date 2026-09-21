import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import type {
  MovieResponse,
  SeriesSummaryResponse,
  EpisodeResponse,
  HomeResponse,
  PagedList,
  ItemsByCategory,
  EpisodesResult,
  SearchResult,
  ResolvedVideoResponse,
  VideoSource,
  ChannelResponse,
  ChannelCategoryGroup,
} from './content-api.types';

@Injectable({ providedIn: 'root' })
export class ContentApiService {
  private readonly base = `${environment.apiUrl.replace(/\/?$/, '/')}Api/Content/v2`;

  constructor(private http: HttpClient) { }

  resolveMediaUrl(url?: string | null): string | null {
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : new URL(url, environment.apiUrl).toString();
  }

  resolveVideoUrl(resolverUrl?: string | null): Observable<ResolvedVideoResponse> {
    const url = this.resolveMediaUrl(resolverUrl);
    if (!url) throw new Error('A URL de reprodução não foi informada.');
    return this.http.get<unknown>(url).pipe(
      map((payload) => this.normalizeResolvedVideo(payload, url)),
    );
  }

  private normalizeResolvedVideo(payload: unknown, fallbackUrl: string): ResolvedVideoResponse {
    if (this.isResolvedVideo(payload)) {
      return {
        url: payload.url,
        streamFormat: payload.streamFormat || this.getStreamFormat(payload.url),
        sources: this.normalizeSources(payload.sources),
      };
    }

    if (this.isStreamCatalog(payload)) {
      const sources = this.normalizeSources(payload.streams);
      const primary = sources[0];
      if (primary) {
        return {
          url: primary.url,
          streamFormat: primary.streamFormat,
          sources,
        };
      }
    }

    return {
      url: fallbackUrl,
      streamFormat: this.getStreamFormat(fallbackUrl),
    };
  }

  private normalizeSources(rawSources: unknown): VideoSource[] {
    if (!Array.isArray(rawSources)) return [];

    const unique = new Map<string, VideoSource>();
    for (const rawSource of rawSources) {
      if (!rawSource || typeof rawSource !== 'object') continue;
      const source = rawSource as Record<string, unknown>;
      const url = this.extractStreamUrl(source['url']);
      if (!url) continue;

      const quality = this.findQuality(source['quality'], source['name'], source['title'], url);
      const normalized: VideoSource = {
        url,
        streamFormat: typeof source['streamFormat'] === 'string' && source['streamFormat']
          ? source['streamFormat']
          : this.getStreamFormat(url),
        quality: quality.label,
      };

      if (!unique.has(quality.key)) unique.set(quality.key, normalized);
    }

    return [...unique.entries()]
      .sort(([left], [right]) => this.qualityRank(right) - this.qualityRank(left))
      .map(([, source]) => source);
  }

  private isResolvedVideo(payload: unknown): payload is ResolvedVideoResponse {
    if (!payload || typeof payload !== 'object') return false;
    const value = payload as Record<string, unknown>;
    return typeof value['url'] === 'string' && value['url'].length > 0;
  }

  private isStreamCatalog(payload: unknown): payload is { streams: unknown[] } {
    if (!payload || typeof payload !== 'object') return false;
    const value = payload as Record<string, unknown>;
    return Array.isArray(value['streams']);
  }

  private extractStreamUrl(value: unknown): string {
    if (typeof value !== 'string') return '';
    const normalized = value.trim()
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\\_/g, '_');
    const markdownStart = normalized.indexOf('](');
    const url = normalized.startsWith('[') && markdownStart > 0
      ? normalized.slice(markdownStart + 2).replace(/\)$/, '')
      : normalized;
    return url.trim().replace(/^<|>$/g, '');
  }

  private findQuality(...values: unknown[]): { key: string; label: string } {
    const pattern = /(?<![a-z0-9])(4k|2160p|1440p|1080p|720p|576p|480p|360p)(?![a-z0-9])/i;
    for (const value of values) {
      const match = pattern.exec(typeof value === 'string' ? value : '');
      if (match) {
        const raw = match[1].toLowerCase();
        return { key: raw, label: raw === '4k' ? '4K' : raw };
      }
    }
    return { key: 'auto', label: 'Auto' };
  }

  private qualityRank(value: string): number {
    if (value === '4k') return 2160;
    const rank = Number.parseInt(value, 10);
    return Number.isFinite(rank) ? rank : 0;
  }

  private getStreamFormat(url: string): string {
    const path = url.split('?')[0].split('#')[0];
    const extension = path.split('.').pop()?.toLowerCase();
    return extension || (url.includes('.m3u8') ? 'hls' : 'mp4');
  }

  getChannels(limit = 200): Observable<any> {
    const v1Base = `${environment.apiUrl.replace(/\/?$/, '/')}Api/Content/v2/Channels`;
    let params = new HttpParams().set('limit', limit);

    return this.http.get<any>(v1Base, { params });

  }

  getHome(): Observable<HomeResponse> {
    return this.http.get<HomeResponse>(`${this.base}/home`);
  }

  getMovies(limit = 60): Observable<MovieResponse[]> {
    return this.http.get<MovieResponse[]>(`${this.base}/Movies?limit=${limit}`);
  }

  getSeries(limit = 10): Observable<SeriesSummaryResponse[]> {
    return this.http.get<SeriesSummaryResponse[]>(`${this.base}/series?limit=${limit}`);
  }

  getMovieById(id: string): Observable<MovieResponse> {
    return this.http.get<MovieResponse>(`${this.base}/movies/${id}`);
  }

  getSeriesById(id: string): Observable<SeriesSummaryResponse> {
    return this.http.get<SeriesSummaryResponse>(`${this.base}/series/${id}`);
  }

  getEpisodes(seriesId: string, seasonNumber: number): Observable<EpisodesResult> {
    return this.http.get<EpisodesResult>(
      `${this.base}/series/${seriesId}/seasons/${seasonNumber}/episodes`,
    );
  }

  getMoviesCategories(limit = 15): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/movies/categories`, {
      params: new HttpParams().set('limit', limit),
    });
  }

  getSeriesCategories(limit = 15): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/series/categories`, {
      params: new HttpParams().set('limit', limit),
    });
  }

  getMoviesByCategory(category: string, page = 1, pageSize = 10): Observable<MovieResponse[]> {
    return this.http
      .get<PagedList<ItemsByCategory<MovieResponse>>>(`${this.base}/movies/category/${category}`, {
        params: new HttpParams().set('page', page).set('pageSize', pageSize),
      })
      .pipe(map((res) => res.items?.[0]?.items ?? []));
  }

  getSeriesByCategory(
    category: string,
    page = 1,
    pageSize = 10,
  ): Observable<SeriesSummaryResponse[]> {
    return this.http
      .get<PagedList<ItemsByCategory<SeriesSummaryResponse>>>(`${this.base}/series/category/${category}`, {
        params: new HttpParams().set('page', page).set('pageSize', pageSize),
      })
      .pipe(map((res) => res.items?.[0]?.items ?? []));
  }

  getMoviesRecommended(movieId: string): Observable<MovieResponse[]> {
    return this.http.get<MovieResponse[]>(`${this.base}/movies/${movieId}/recommended`);
  }

  getSeriesRecommended(seriesId: string): Observable<SeriesSummaryResponse[]> {
    return this.http.get<SeriesSummaryResponse[]>(`${this.base}/series/${seriesId}/recommended`);
  }

  search(term: string): Observable<SearchResult> {
    return this.http.get<SearchResult>(`${this.base}/search`, {
      params: new HttpParams().set('term', term),
    });
  }

  getMoviesByCategories(
    categories: string[],
    page = 1,
    pageSize = 10,
  ): Observable<PagedList<MovieResponse[]>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    categories.forEach((c) => (params = params.append('categories', c)));
    return this.http.get<PagedList<MovieResponse[]>>(`${this.base}/movies/categories/groups`, {
      params,
    });
  }

  getSeriesByCategories(
    categories: string[],
    page = 1,
    pageSize = 10,
  ): Observable<PagedList<SeriesSummaryResponse[]>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    categories.forEach((c) => (params = params.append('categories', c)));
    return this.http.get<PagedList<SeriesSummaryResponse[]>>(`${this.base}/series/categories/groups`, {
      params,
    });
  }
}
