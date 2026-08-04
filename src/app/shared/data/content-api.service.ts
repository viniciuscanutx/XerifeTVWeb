import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import { Observable, catchError } from 'rxjs';
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
    return this.http.get<ResolvedVideoResponse>(url);
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
    return this.http.get<SeriesSummaryResponse[]>(`${this.base}/series`);
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
    return this.http.get<MovieResponse[]>(`${this.base}/movies/category/${category}`, {
      params: new HttpParams().set('page', page).set('pageSize', pageSize),
    });
  }

  getSeriesByCategory(
    category: string,
    page = 1,
    pageSize = 10,
  ): Observable<SeriesSummaryResponse[]> {
    return this.http.get<SeriesSummaryResponse[]>(`${this.base}/series/category/${category}`, {
      params: new HttpParams().set('page', page).set('pageSize', pageSize),
    });
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
