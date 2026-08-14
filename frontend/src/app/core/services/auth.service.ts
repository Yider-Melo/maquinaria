import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Api } from './api.service';
import { Observable, tap, map, catchError, of, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario, LoginResponse, ApiResponse } from '../models';

export type { Usuario, LoginResponse };

@Injectable({ providedIn: 'root' })
export class Auth {
  private tokenKey = 'rentamaq_token';
  private refreshTokenKey = 'rentamaq_refresh_token';
  private userKey = 'rentamaq_user';
  private authState = new BehaviorSubject<boolean>(!!this.getToken());

  constructor(private api: Api, private http: HttpClient) {}

  login(email: string, password: string, code?: string): Observable<ApiResponse<LoginResponse>> {
    return this.api.post<LoginResponse>('/auth/login', { email, password, code }).pipe(
      tap((res: ApiResponse<LoginResponse>) => {
        if (res.success && res.data?.token) {
          localStorage.setItem(this.tokenKey, res.data.token);
          if (res.data.refresh_token) localStorage.setItem(this.refreshTokenKey, res.data.refresh_token);
          localStorage.setItem(this.userKey, JSON.stringify(res.data.usuario));
          this.authState.next(true);
        }
      })
    );
  }

  register(data: Record<string, any>): Observable<ApiResponse<Usuario>> {
    return this.api.post<Usuario>('/auth/register', data).pipe(
      tap((res: ApiResponse<Usuario>) => {
        if (!res.success) {
          throw new Error(res.error?.message || 'Error al registrarse');
        }
      })
    );
  }

  // Cierra la sesión eliminando las credenciales almacenadas.
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.authState.next(false);
  }

  getRefreshToken(): string | null { return localStorage.getItem(this.refreshTokenKey); }

  // Renueva el access token usando el refresh token (con rotación). Devuelve
  // true si se obtuvo un nuevo token, false si no hay sesión o falló.
  refreshAccessToken(): Observable<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return of(false);
    return this.http.post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/auth/refresh`, { refresh_token: refreshToken }).pipe(
      tap((res) => {
        if (res?.data?.token) {
          localStorage.setItem(this.tokenKey, res.data.token);
          if (res.data.refresh_token) localStorage.setItem(this.refreshTokenKey, res.data.refresh_token);
          this.authState.next(true);
        }
      }),
      map((res) => !!res?.data?.token),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  // Devuelve el token JWT almacenado o null si no hay sesión activa.
  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
  getUser(): Usuario | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }
  // Indica si hay una sesión activa (existe token).
  isLoggedIn(): boolean { return !!this.getToken(); }
  get authState$(): Observable<boolean> { return this.authState.asObservable(); }
  // Devuelve el tipo de usuario o null.
  get tipoUsuario(): string | null { return this.getUser()?.tipo_usuario || null; }
  // Verifica si el usuario es de un tipo específico.
  esTipo(tipo: string): boolean { return this.tipoUsuario === tipo; }
}
