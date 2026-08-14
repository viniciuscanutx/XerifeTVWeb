import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SitePermission, User } from '../models/user.model';

interface MeResponse {
  user: User;
}

interface AuthResponse extends MeResponse {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, mirrors refresh_token server-side TTL

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax; Secure`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = `${environment.apiUrl.replace(/\/?$/, '/')}Api/Auth`;

  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly sessionChecked = signal(false);

  constructor(private http: HttpClient) {}

  hasPermission(permission: SitePermission): boolean {
    return this.currentUser()?.permissions?.includes(permission) ?? false;
  }

  getAccessToken(): string | null {
    return getCookie(ACCESS_TOKEN_KEY);
  }

  private getRefreshTokenValue(): string | null {
    return getCookie(REFRESH_TOKEN_KEY);
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    setCookie(ACCESS_TOKEN_KEY, accessToken);
    setCookie(REFRESH_TOKEN_KEY, refreshToken);
  }

  private clearTokens(): void {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/Login`, { email, password }).pipe(
      tap((res) => {
        this.setTokens(res.accessToken, res.refreshToken);
        this.currentUser.set(res.user);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/Logout`, {}).pipe(
      tap(() => {
        this.clearTokens();
        this.currentUser.set(null);
      }),
      catchError(() => {
        this.clearTokens();
        this.currentUser.set(null);
        return of(void 0);
      }),
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshTokenValue();
    if (!refreshToken) {
      this.clearTokens();
      this.currentUser.set(null);
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.base}/Refresh`, { refreshToken }).pipe(
      tap((res) => {
        this.setTokens(res.accessToken, res.refreshToken);
        this.currentUser.set(res.user);
      }),
      catchError((error) => {
        this.clearTokens();
        this.currentUser.set(null);
        return throwError(() => error);
      }),
    );
  }

  checkSession(): Observable<User | null> {
    if (!this.getAccessToken()) {
      this.sessionChecked.set(true);
      return of(null);
    }

    return this.http.get<MeResponse>(`${this.base}/Me`).pipe(
      tap((res) => this.currentUser.set(res.user)),
      map((res) => res.user),
      catchError(() => {
        this.clearTokens();
        this.currentUser.set(null);
        return of(null);
      }),
      tap(() => this.sessionChecked.set(true)),
    );
  }
}
