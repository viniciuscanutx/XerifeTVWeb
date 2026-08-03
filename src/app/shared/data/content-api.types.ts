export interface MovieResponse {
  id: string;
  title: string;
  categories: string[];
  posterURL: string;
  bannerURL: string;
  parentalRating: string;
  releaseYear: number;
  synopsis: string;
  ratingImdb: number;
  duration: string;
  durationSeconds: number;
  videoResolverURL: string;
  alternativeVideoResolverURL?: string;
  subtitleURL?: string;
  trailerVideoYoutubeId?: string;
}

export interface SeriesSummaryResponse {
  id: string;
  title: string;
  categories: string[];
  posterURL: string;
  bannerURL: string;
  parentalRating: string;
  releaseYear: number;
  ratingImdb: number;
  synopsis: string;
  totalSeasons: number;
  hasSubtitles: boolean;
}

export interface EpisodeResponse {
  id: string;
  title: string;
  bannerURL: string;
  duration: string;
  durationSeconds: number;
  subtitleURL: string;
  videoResolverURL: string;
  alternativeVideoResolverURL?: string;
}

export interface HomeResponse {
  featured: MovieResponse | SeriesSummaryResponse | null;
  featuredType: 'movie' | 'series';
  movieCategories: string[];
  seriesCategories: string[];
}

export interface PagedList<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ItemsByCategory<T> {
  category: string;
  items: T[];
}

export interface EpisodesResult {
  seriesId: string;
  seasonNumber: number;
  episodes: EpisodeResponse[];
}

export interface SearchResult {
  movies: MovieResponse[];
  series: SeriesSummaryResponse[];
}

export interface ResolvedVideoResponse {
  url: string;
  streamFormat: string;
}
