import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { SitePermission, User } from '../models/user.model';

interface AuthResponse {
  user: User;
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

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.base}/Login`, { email, password })
      .pipe(tap((res) => this.currentUser.set(res.user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/Logout`, {}).pipe(
      tap(() => this.currentUser.set(null)),
      catchError(() => {
        this.currentUser.set(null);
        return of(void 0);
      }),
    );
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/Refresh`, {}).pipe(
      tap((res) => this.currentUser.set(res.user)),
    );
  }

  checkSession(): Observable<User | null> {
    return this.http.get<AuthResponse>(`${this.base}/Me`).pipe(
      tap((res) => this.currentUser.set(res.user)),
      map((res) => res.user),
      catchError(() =>
        this.refreshToken().pipe(
          map((res) => res.user),
          catchError(() => {
            this.currentUser.set(null);
            return of(null);
          }),
        ),
      ),
      tap(() => this.sessionChecked.set(true)),
    );
  }
}
