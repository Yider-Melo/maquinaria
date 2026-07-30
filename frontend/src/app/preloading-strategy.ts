import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DelayedPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data?.['preload'] === false) return of(null);
    if (typeof requestIdleCallback === 'function') {
      return new Observable(subscriber => {
        requestIdleCallback(() => {
          load().subscribe(subscriber);
        }, { timeout: 3000 });
      });
    }
    return timer(2000).pipe(mergeMap(() => load()));
  }
}
