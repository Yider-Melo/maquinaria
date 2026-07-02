import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { Auth } from '../services/auth';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const user = this.auth.getUser();
    const allowedRoles = route.data?.['roles'] as string[];
    if (user && allowedRoles?.includes(user.tipo_usuario)) return true;
    this.router.navigate(['/']);
    return false;
  }
}
