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
      const sources = this.normalizeSources(this.getRawSources(payload));
      const matchedSource = sources.find((source) => source.url === payload.url);
      return {
        url: payload.url,
        streamFormat: payload.streamFormat || (matchedSource ? matchedSource.streamFormat : this.getStreamFormat(payload.url)),
        sources,
      };
    }

    if (this.isStreamCatalog(payload)) {
      const sources = this.normalizeSources(this.getRawSources(payload));
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
      const url = this.extractStreamUrl(source['url'] || source['link'] || source['streamUrl'] || source['source']);
      if (!url) continue;

      const quality = this.getSourceQuality(source, url);
      const streamFormat = this.getSourceStreamFormat(source, url);
      const normalized: VideoSource = {
        url,
        streamFormat,
        quality,
      };

      const key = url + '|' + streamFormat + '|' + quality.toLowerCase();
      if (!unique.has(key)) unique.set(key, normalized);
    }

    return [...unique.values()].sort((left, right) => {
      const qualityDifference = this.qualityRank(right.quality) - this.qualityRank(left.quality);
      return qualityDifference || left.quality.localeCompare(right.quality);
    });
  }

  private isResolvedVideo(payload: unknown): payload is ResolvedVideoResponse {
    if (!payload || typeof payload !== 'object') return false;
    const value = payload as Record<string, unknown>;
    return typeof value['url'] === 'string' && value['url'].length > 0;
  }

  private isStreamCatalog(payload: unknown): payload is { streams: unknown[] | undefined; sources: unknown[] | undefined } {
    if (!payload || typeof payload !== 'object') return false;
    const value = payload as Record<string, unknown>;
    return Array.isArray(value['streams']) || Array.isArray(value['sources']);
  }

  private getRawSources(payload: unknown): unknown[] {
    if (!payload || typeof payload !== 'object') return [];
    const value = payload as Record<string, unknown>;
    if (Array.isArray(value['sources'])) return value['sources'];
    if (Array.isArray(value['streams'])) return value['streams'];
    return [];
  }

  private getSourceQuality(source: Record<string, unknown>, url: string): string {
    const explicitQuality = [source['quality'], source['label']]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (explicitQuality) return explicitQuality.trim();

    const quality = this.findQuality(source['name'], source['title'], source['provider'], url);
    return quality.label;
  }

  private getSourceStreamFormat(source: Record<string, unknown>, url: string): string {
    const explicitFormat = [source['streamFormat'], source['type'], source['format']]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (!explicitFormat) return this.getStreamFormat(url);

    const format = explicitFormat.trim().toLowerCase();
    if (format === 'm3u8') return 'hls';
    return format;
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
    const quality = this.findQuality(value).key;
    if (quality === '4k') return 2160;
    const rank = Number.parseInt(quality, 10);
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
