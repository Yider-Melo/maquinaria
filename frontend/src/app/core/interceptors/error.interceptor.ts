import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isLoginRequest = req.url.endsWith('/auth/login');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isLoginRequest) {
        localStorage.removeItem('rentamaq_token');
        localStorage.removeItem('rentamaq_user');
        router.navigate(['/auth/login']);
      } else if (error.status === 404 && !req.url.includes('/api/')) {
        router.navigate(['/404']);
      }
      return throwError(() => error);
    })
  );
};