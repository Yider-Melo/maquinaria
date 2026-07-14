import { HttpInterceptorFn, HttpEventType } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const start = Date.now();

  return next(req).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) {
        const duration = Date.now() - start;
        console.debug(`[HTTP] ${req.method} ${req.url} - ${event.status} (${duration}ms)`);
      }
    })
  );
};