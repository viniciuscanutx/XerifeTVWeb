export interface ProfileBadge { id: string; name: string; color: string; }

export type ProfileContentType = 'movie' | 'series';

export interface SiteProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarGiphyId?: string | null;
  joinedAt: string;
  badges?: ProfileBadge[];
  selectedBadge?: ProfileBadge | null;
}

export interface ProfilePage<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ProfileMovie {
  type?: ProfileContentType;
  id: string;
  title: string;
  poster: string;
  year: number;
  isAvailable: boolean;
}

export interface Favorite {
  movie: ProfileMovie;
  addedAt: string;
}

export interface SiteReview {
  id: string;
  movie: ProfileMovie;
  author: { id: string; name: string; avatarUrl: string | null; avatarGiphyId?: string | null };
  rating: number;
  text: string;
  createdAt: string;
  updatedAt: string | null;
}
