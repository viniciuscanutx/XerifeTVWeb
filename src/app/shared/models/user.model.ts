export type SitePermission =
  | 'home.view'
  | 'movies.view'
  | 'series.view'
  | 'channels.view'
  | 'watch'
  | 'search';

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  permissions: SitePermission[];
}
