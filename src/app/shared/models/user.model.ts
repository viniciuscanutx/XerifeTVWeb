export type SitePermission =
  'home.view' | 'movies.view' | 'series.view' | 'channels.view' | 'watch' | 'search';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  avatarGiphyId?: string | null;
  roleId: string | null;
  roleName: string | null;
  permissions: SitePermission[];
}
