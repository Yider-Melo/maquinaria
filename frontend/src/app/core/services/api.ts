// Servicio centralizado para realizar peticiones HTTP al backend.
// Expone métodos genéricos get, post, put y delete que tipan las respuestas
// con la interfaz ApiResponse y construyen la URL base automáticamente.
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Realiza una petición GET. Los parámetros de consulta se filtran
  // para omitir valores vacíos o nulos.
  get<T>(path: string, params?: Record<string, any>): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') httpParams = httpParams.set(k, v);
      }
    }
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params: httpParams });
  }

  // Realiza una petición POST con un cuerpo opcional.
  post<T>(path: string, body?: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body);
  }

  // Realiza una petición PUT con un cuerpo opcional.
  put<T>(path: string, body?: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body);
  }

  // Realiza una petición DELETE.
  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`);
  }
}
