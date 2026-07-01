// Servicio de autenticación. Gestiona el inicio de sesión, registro,
// cierre de sesión y almacenamiento en localStorage del token y los
// datos del usuario autenticado.
import { Injectable } from '@angular/core';
import { Api } from './api';
import { Observable, tap } from 'rxjs';

// Interfaz que representa un usuario de la plataforma.
export interface Usuario {
  id: string; email: string; nombre: string; apellido: string;
  tipo_usuario: 'propietario' | 'arrendatario' | 'admin'; foto_url?: string;
}

// Interfaz para la respuesta del endpoint de login.
export interface LoginResponse { token: string; usuario: Usuario; }

@Injectable({ providedIn: 'root' })
export class Auth {
  private tokenKey = 'rentamaq_token';
  private userKey = 'rentamaq_user';

  constructor(private api: Api) {}

  // Inicia sesión. Almacena el token y el usuario en localStorage si la respuesta es exitosa.
  login(email: string, password: string): Observable<any> {
    return this.api.post<LoginResponse>('/auth/login', { email, password }).pipe(
      tap((res: any) => {
        if (res.success) {
          localStorage.setItem(this.tokenKey, res.data.token);
          localStorage.setItem(this.userKey, JSON.stringify(res.data.usuario));
        }
      })
    );
  }

  // Registra un nuevo usuario.
  register(data: any): Observable<any> {
    return this.api.post('/auth/register', data);
  }

  // Cierra la sesión eliminando las credenciales almacenadas.
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Devuelve el token JWT almacenado o null si no hay sesión activa.
  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
  // Devuelve el objeto Usuario almacenado o null.
  getUser(): Usuario | null {
    const raw = localStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) : null;
  }
  // Indica si hay una sesión activa (existe token).
  isLoggedIn(): boolean { return !!this.getToken(); }
}
