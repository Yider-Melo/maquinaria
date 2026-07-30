import { Component } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

const LABELS: Record<string, string> = {
  '': 'Inicio',
  'machinery': 'Maquinaria',
  'bookings': 'Reservas',
  'payments': 'Pagos',
  'ratings': 'Calificaciones',
  'notifications': 'Notificaciones',
  'profile': 'Perfil',
  'admin': 'Admin',
  'auth': 'Autenticación',
  'login': 'Iniciar sesión',
  'register': 'Registro',
  'new': 'Nueva',
  'edit': 'Editar',
  'detail': 'Detalle',
  'success': 'Pago exitoso',
  'failure': 'Pago fallido',
  'pending': 'Pago pendiente',
  'dashboard': 'Dashboard',
  'accounting': 'Contabilidad',
  'performance': 'Rendimiento',
  'reports': 'Gestión',
  'usuarios-maquinas': 'Usuarios y Máquinas',
};

@Component({
  selector: 'app-breadcrumb',
  template: `
    <nav class="breadcrumb" *ngIf="crumbs.length > 1" aria-label="Navegación secundaria">
      <a *ngFor="let c of crumbs; let last = last" [routerLink]="c.url" class="crumb" [class.active]="last">
        <mat-icon *ngIf="!last" style="font-size:14px;width:14px;height:14px;vertical-align:middle;">chevron_right</mat-icon>
        {{ c.label }}
      </a>
    </nav>
  `,
  styles: [`
    .breadcrumb { display: flex; align-items: center; gap: 4px; padding: 8px 24px; max-width: 1240px; margin: 0 auto; font-size: 13px; flex-wrap: wrap; }
    .crumb { color: var(--rm-muted); text-decoration: none; display: inline-flex; align-items: center; gap: 2px; }
    .crumb:hover { color: var(--rm-primary); }
    .crumb.active { color: var(--rm-ink); font-weight: 600; pointer-events: none; }
  `],
  standalone: false
})
export class BreadcrumbComponent {
  crumbs: { label: string; url: string }[] = [];

  constructor(private router: Router) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.build());
    this.build();
  }

  private build(): void {
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    let accumulated = '';
    this.crumbs = segments.map((s, i) => {
      accumulated += `/${s}`;
      const label = this.resolveLabel(s, accumulated);
      return { label, url: accumulated || '/' };
    });
  }

  private resolveLabel(segment: string, url: string): string {
    if (LABELS[segment]) return LABELS[segment];
    if (segment.length === 36 && segment.includes('-')) return `#${segment.slice(0, 8).toUpperCase()}`;
    return segment;
  }
}
