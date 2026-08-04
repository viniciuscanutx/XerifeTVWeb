import type { MediaItem } from '../components/media-card/media-card';
import type { MovieResponse, SeriesSummaryResponse } from './content-api.types';
import type { HomeResponse } from './content-api.types';

export function toMediaItem(movie: MovieResponse): MediaItem {
  return {
    id: movie.id,
    title: movie.title ?? '',
    type: 'movie',
    year: Number(movie.releaseYear) || 0,
    rating: Number(movie.ratingImdb) || 0,
    poster: movie.posterURL ?? '',
    backdrop: movie.bannerURL ?? '',
    overview: movie.synopsis ?? '',
    genres: Array.isArray(movie.categories) ? movie.categories : [],
    highQuality: (movie as any).highQuality ?? (movie as any).HighQuality ?? false,
  };
}

export function seriesToMediaItem(series: SeriesSummaryResponse): MediaItem {
  return {
    id: series.id,
    title: series.title ?? '',
    type: 'series',
    year: Number(series.releaseYear) || 0,
    rating: Number(series.ratingImdb) || 0,
    poster: series.posterURL ?? '',
    backdrop: series.bannerURL ?? '',
    overview: series.synopsis ?? '',
    genres: Array.isArray(series.categories) ? series.categories : [],
    highQuality: (series as any).highQuality ?? (series as any).HighQuality ?? false,
  };
}

export interface HomeMappedData {
  heroItem: MediaItem | null;
  featuredType: 'movie' | 'series';
  trending: MediaItem[];
  movies: MediaItem[];
  series: MediaItem[];
  topRated: MediaItem[];
  movieCategories: string[];
  seriesCategories: string[];
}

export function mapHomeResponse(home: HomeResponse, movies: MovieResponse[], series: SeriesSummaryResponse[]): HomeMappedData {
  const movieItems = movies.map(toMediaItem);
  const seriesItems = series.map(seriesToMediaItem);
  const allItems = [...movieItems, ...seriesItems];

  const featuredType = home.featuredType?.toLowerCase() === 'movie' ? 'movie' : 'series';
  const featured: MediaItem | null = home.featured
    ? featuredType === 'movie'
      ? toMediaItem(home.featured as MovieResponse)
      : seriesToMediaItem(home.featured as SeriesSummaryResponse)
    : allItems[0] ?? null;

  return {
    heroItem: featured,
    featuredType,
    movies: movieItems,
    series: seriesItems,
    movieCategories: home.movieCategories ?? [],
    seriesCategories: home.seriesCategories ?? [],
    trending: allItems.slice(0, 10),
    topRated: [...allItems].sort((a, b) => b.rating - a.rating).slice(0, 10),
  };
}
