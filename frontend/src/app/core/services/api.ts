// Servicio centralizado para realizar peticiones HTTP al backend.
// Expone métodos genéricos get, post, put y delete que tipan las respuestas
// con la interfaz ApiResponse y construyen la URL base automáticamente.
import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private baseUrl = environment.apiUrl;
  private requestTimeoutMs = 5000;

  constructor(private http: HttpClient, private zone: NgZone) {}

  private inAngularZone<T>(source: Observable<T>): Observable<T> {
    return new Observable<T>(observer => source.subscribe({
      next: value => this.zone.run(() => observer.next(value)),
      error: error => this.zone.run(() => observer.error(error)),
      complete: () => this.zone.run(() => observer.complete())
    }));
  }

  // Realiza una petición GET. Los parámetros de consulta se filtran
  // para omitir valores vacíos o nulos.
  get<T>(path: string, params?: Record<string, any>): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, v);
      }
    }
    return this.inAngularZone(this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params: httpParams }).pipe(timeout(this.requestTimeoutMs)));
  }

  // Realiza una petición POST con un cuerpo opcional.
  post<T>(path: string, body?: any): Observable<ApiResponse<T>> {
    return this.inAngularZone(this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body).pipe(timeout(this.requestTimeoutMs)));
  }

  // Realiza una petición PUT con un cuerpo opcional.
  put<T>(path: string, body?: any): Observable<ApiResponse<T>> {
    return this.inAngularZone(this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body).pipe(timeout(this.requestTimeoutMs)));
  }

  // Realiza una petición DELETE.
  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.inAngularZone(this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`).pipe(timeout(this.requestTimeoutMs)));
  }
}
