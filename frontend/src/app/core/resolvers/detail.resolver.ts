import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Api } from '../services/api.service';

@Injectable({ providedIn: 'root' })
export class DetailResolver implements Resolve<unknown> {
  constructor(private api: Api) {}

  resolve(route: ActivatedRouteSnapshot): Observable<unknown> {
    const id = route.paramMap.get('id');
    const basePath = route.data?.['resolverPath'] || route.url[0]?.path;
    return this.api.get<unknown>(`/${basePath}/${id}`).pipe(
      catchError(() => of(null))
    );
  }
}