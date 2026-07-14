// Servicio de autenticación. Gestiona el inicio de sesión, registro,
// cierre de sesión y almacenamiento en localStorage del token y los
// datos del usuario autenticado.
import { Injectable } from '@angular/core';
import { Api } from './api.service';
import { Observable, tap } from 'rxjs';
import { BehaviorSubject } from 'rxjs';

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
  private authState = new BehaviorSubject<boolean>(!!this.getToken());

  constructor(private api: Api) {}

  // Inicia sesión. Almacena el token y el usuario en localStorage si la respuesta es exitosa.
  login(email: string, password: string): Observable<any> {
    return this.api.post<LoginResponse>('/auth/login', { email, password }).pipe(
      tap((res: any) => {
        if (res.success) {
          localStorage.setItem(this.tokenKey, res.data.token);
          localStorage.setItem(this.userKey, JSON.stringify(res.data.usuario));
          this.authState.next(true);
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
    this.authState.next(false);
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
