import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '../services/auth.service';

// Evita que un usuario ya logueado vea las páginas de autenticación
// (login/registro), redirigiéndolo al inicio.
@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}
  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) return true;
    this.router.navigate(['/']);
    return false;
  }
}
