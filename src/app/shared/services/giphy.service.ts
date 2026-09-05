import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, throwError, timeout } from 'rxjs';
import { giphyConfig } from '../../environments/giphy.config';

interface GiphyImage {
  url?: string;
}
interface GiphyResponseGif {
  id: string;
  title: string;
  url: string;
  images: {
    fixed_height?: GiphyImage;
    fixed_height_still?: GiphyImage;
    original?: GiphyImage;
    original_still?: GiphyImage;
  };
}
export interface GiphyGif {
  id: string;
  title: string;
  url: string;
  stillUrl: string;
  sourceUrl: string;
}
interface GiphyResponse<T> {
  data: T;
  pagination?: { total_count: number; count: number; offset: number };
}
export interface GiphyPage {
  items: GiphyGif[];
  hasMore: boolean;
  nextOffset: number;
}

function mapGif(gif: GiphyResponseGif): GiphyGif {
  return {
    id: gif.id,
    title: gif.title || 'GIF do GIPHY',
    url: gif.images?.fixed_height?.url || gif.images?.original?.url || '',
    stillUrl: gif.images?.fixed_height_still?.url || gif.images?.original_still?.url || '',
    sourceUrl: gif.url,
  };
}

export function giphyError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 429)
    return 'O GIPHY atingiu o limite de buscas. Tente novamente mais tarde.';
  return 'Não foi possível carregar os GIFs. Tente novamente.';
}

@Injectable({ providedIn: 'root' })
export class GiphyService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://api.giphy.com/v1/gifs';
  private readonly pending = new Map<string, Observable<GiphyGif | null>>();
  readonly configured = !!giphyConfig.apiKey.trim();

  search(query: string, offset = 0): Observable<GiphyPage> {
    if (!this.configured) return throwError(() => new Error('GIPHY indisponível'));
    const searching = !!query.trim();
    const params: Record<string, string | number> = {
      api_key: giphyConfig.apiKey,
      limit: 24,
      offset,
      rating: 'g',
    };
    if (searching) {
      params['q'] = query;
      params['lang'] = 'pt';
    }
    return this.http
      .get<GiphyResponse<GiphyResponseGif[]>>(this.base + (searching ? '/search' : '/trending'), {
        params,
      })
      .pipe(
        timeout(15000),
        map((response) => {
          const items = response.data.map(mapGif);
          const count = response.pagination?.count ?? items.length;
          const nextOffset = offset + count;
          return {
            items,
            nextOffset,
            hasMore:
              count > 0 &&
              nextOffset <= (searching ? 4999 : 499) &&
              (response.pagination ? nextOffset < response.pagination.total_count : count === 24),
          };
        }),
      );
  }

  getGif(id: string): Observable<GiphyGif | null> {
    if (!this.configured || !/^[a-zA-Z0-9]{1,100}$/.test(id)) return of(null);
    const pending = this.pending.get(id);
    if (pending) return pending;
    const request = this.http
      .get<GiphyResponse<GiphyResponseGif>>(this.base + '/' + encodeURIComponent(id), {
        params: { api_key: giphyConfig.apiKey, rating: 'g' },
      })
      .pipe(
        timeout(15000),
        map((response) => (response.data?.id ? mapGif(response.data) : null)),
        catchError(() => of(null)),
        finalize(() => this.pending.delete(id)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );
    this.pending.set(id, request);
    return request;
  }
}
