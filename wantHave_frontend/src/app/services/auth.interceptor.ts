import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.accessToken();

  // Clone request with auth header if token exists
  let authReq = req;
  if (token && req.url.startsWith('/api')) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 errors for API requests (not login/refresh endpoints)
      if (error.status === 401 &&
          req.url.startsWith('/api') &&
          !req.url.includes('/api/token/')) {

        // Try to refresh the token
        return authService.refreshToken().pipe(
          switchMap(({ access }) => {
            // Retry original request with new token
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${access}` }
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // Refresh failed - logout and redirect
            authService.logout();
            router.navigate(['/login']);
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
