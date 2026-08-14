import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

const NO_RETRY_ENDPOINTS = ['Api/Auth/Login', 'Api/Auth/Refresh'];

const withAuthHeader = (req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const isNoRetryEndpoint = NO_RETRY_ENDPOINTS.some((endpoint) => req.url.includes(endpoint));

  const authReq = isApiRequest ? withAuthHeader(req, authService.getAccessToken()) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiRequest &&
        !isNoRetryEndpoint
      ) {
        return authService.refreshToken().pipe(
          switchMap(() => next(withAuthHeader(req, authService.getAccessToken()))),
          catchError((refreshError) => {
            authService.logout().subscribe();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
