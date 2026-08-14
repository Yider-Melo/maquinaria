// Interceptor HTTP que agrega el token JWT y, ante un 401, renueva el access
// token con el refresh token y reintenta la petición una vez. Si la renovación
// falla, cierra la sesión y redirige al login.
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { Auth } from '../services/auth.service';

let refreshing: Promise<boolean> | null = null;

// Evita lanzar varias renovaciones simultáneas ante ráfagas de 401.
function performRefresh(auth: Auth): Promise<boolean> {
  if (!refreshing) {
    refreshing = lastValueFrom(auth.refreshAccessToken())
      .catch(() => false)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const token = auth.getToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const url = req.url;
        const esAuthPublico = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/forgot-password',
          '/auth/reset-password', '/auth/resend-verification', '/auth/verify-email']
          .some((p) => url.includes(p));
        if (!esAuthPublico) {
          return from(performRefresh(auth)).pipe(
            switchMap((ok) => {
              if (ok) {
                const newToken = auth.getToken();
                return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
              }
              router.navigate(['/auth/login']);
              return throwError(() => err);
            })
          );
        }
      }
      return throwError(() => err);
    })
  );
};
