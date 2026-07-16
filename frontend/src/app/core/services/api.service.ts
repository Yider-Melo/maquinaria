import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout, retry, shareReplay, filter, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const CACHE_TTL = 30000;

interface CacheEntry {
  observable: Observable<any>;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private baseUrl = environment.apiUrl;
  private requestTimeoutMs = 30000;
  private cache = new Map<string, CacheEntry>();

  constructor(private http: HttpClient) {}

  private request<T>(
    method: string,
    path: string,
    options?: { body?: any; params?: HttpParams; cacheKey?: string }
  ): Observable<ApiResponse<T>> {
    const key = options?.cacheKey;
    if (key) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.observable;
      }
    }

    const url = `${this.baseUrl}${path}`;
    let obs: Observable<ApiResponse<T>>;

    switch (method) {
      case 'GET':
        obs = this.http.get<ApiResponse<T>>(url, { params: options?.params });
        break;
      case 'POST':
        obs = this.http.post<ApiResponse<T>>(url, options?.body);
        break;
      case 'PUT':
        obs = this.http.put<ApiResponse<T>>(url, options?.body);
        break;
      case 'PATCH':
        obs = this.http.patch<ApiResponse<T>>(url, options?.body);
        break;
      case 'DELETE':
        obs = this.http.delete<ApiResponse<T>>(url);
        break;
      default:
        obs = this.http.get<ApiResponse<T>>(url);
    }

    obs = obs.pipe(
      timeout(this.requestTimeoutMs),
      retry(1)
    );

    if (key) {
      for (const [k, v] of this.cache.entries()) {
        if (Date.now() - v.timestamp > CACHE_TTL) this.cache.delete(k);
      }
      const shared = obs.pipe(shareReplay(1));
      this.cache.set(key, { observable: shared, timestamp: Date.now() });
      return shared;
    }

    return obs;
  }

  get<T>(path: string, params?: Record<string, any>, cacheKey?: string): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, v);
      }
    }
    return this.request<T>('GET', path, { params: httpParams, cacheKey });
  }

  post<T>(path: string, body?: any): Observable<ApiResponse<T>> {
    return this.request<T>('POST', path, { body });
  }

  put<T>(path: string, body?: any): Observable<ApiResponse<T>> {
    return this.request<T>('PUT', path, { body });
  }

  patch<T>(path: string, body?: any): Observable<ApiResponse<T>> {
    return this.request<T>('PATCH', path, { body });
  }

  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.request<T>('DELETE', path);
  }
}
