import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api.service';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { Usuario, Machinery } from '../../core/models';

@Component({
  selector: 'app-admin-usuarios-maquinas',
  template: `
<div class="page" *ngIf="!loading; else loadingTmpl">
  <h1>Usuarios y Máquinas</h1>
  <table class="admin-table">
    <thead>
      <tr>
        <th></th>
        <th>Usuario</th>
        <th>Email</th>
        <th>Rol</th>
        <th>Máquinas</th>
        <th>Estado</th>
        <th>Acción</th>
      </tr>
    </thead>
    <tbody>
      <ng-container *ngFor="let u of usuarios">
        <tr class="user-row" [class.expanded]="expandidos.has(u.id)" (click)="toggleExpand(u)">
          <td><mat-icon>{{ expandidos.has(u.id) ? 'expand_less' : 'expand_more' }}</mat-icon></td>
          <td><strong>{{ u.nombre }} {{ u.apellido }}</strong></td>
          <td>{{ u.email }}</td>
          <td><span class="role-badge" [class]="u.tipo_usuario">{{ u.tipo_usuario }}</span></td>
          <td>{{ maquinasPorUsuario[u.id]?.length || 0 }}</td>
          <td><span class="status" [class.ok]="u.activo">{{ u.activo ? 'Activo' : 'Inactivo' }}</span></td>
          <td>
            <button mat-stroked-button (click)="toggleUser($event, u)">{{ u.activo ? 'Desactivar' : 'Activar' }}</button>
          </td>
        </tr>
        <tr *ngIf="expandidos.has(u.id)" class="expand-row">
          <td colspan="7">
            <div class="expand-content">
              <h4 *ngIf="maquinasPorUsuario[u.id]?.length">Máquinas de {{ u.nombre }}</h4>
              <table class="sub-table" *ngIf="maquinasPorUsuario[u.id]?.length">
                <thead>
                  <tr><th>Máquina</th><th>Tipo</th><th>Precio/día</th><th>⭐ Calificación</th><th>Reseñas</th><th>Estado</th><th>Acción</th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of maquinasPorUsuario[u.id]">
                    <td>{{ m.titulo }}</td>
                    <td>{{ m.tipo }}</td>
                    <td>${{ m.precio_por_dia | number }}</td>
                    <td class="rating-cell">
                      <span *ngIf="m.puntuacion_promedio" class="stars">
                        {{ getStars(m.puntuacion_promedio) }}
                      </span>
                      <span *ngIf="!m.puntuacion_promedio" class="no-rating">—</span>
                    </td>
                    <td>{{ m.total_resenas || 0 }}</td>
                    <td><span class="status" [class.ok]="m.activo">{{ m.activo ? 'Activa' : 'Inactiva' }}</span></td>
                    <td><button mat-stroked-button (click)="toggleMachinery($event, m)">{{ m.activo ? 'Desactivar' : 'Activar' }}</button></td>
                  </tr>
                </tbody>
              </table>
              <p *ngIf="!maquinasPorUsuario[u.id]?.length" class="empty-sub">Este usuario no tiene máquinas registradas</p>
            </div>
          </td>
        </tr>
      </ng-container>
    </tbody>
  </table>
</div>
<ng-template #loadingTmpl><app-loading></app-loading></ng-template>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page h1 { margin-bottom: 24px; }
    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #ddd; font-weight: 800; font-size: 13px; color: #666; }
    .user-row { cursor: pointer; }
    .user-row:hover { background: rgba(0,0,0,0.03); }
    .user-row.expanded { background: #f8f4f0; }
    .user-row td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
    .user-row mat-icon { vertical-align: middle; color: #999; }
    .expand-row td { padding: 0; border-bottom: 2px solid #e8d5c0; }
    .expand-content { padding: 16px 24px 16px 48px; background: #fcfaf8; }
    .expand-content h4 { margin: 0 0 8px; font-size: 14px; color: #666; }
    .sub-table { width: 100%; border-collapse: collapse; }
    .sub-table th { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; color: #888; font-weight: 700; }
    .sub-table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
    .sub-table tr:hover { background: rgba(0,0,0,0.02); }
    .sub-table button { font-size: 12px; padding: 2px 8px; line-height: 28px; }
    .sub-table button:hover { background: #c96f2d; color: white; }
    .rating-cell { font-size: 16px; }
    .stars { letter-spacing: 2px; }
    .no-rating { color: #ccc; }
    .role-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize; }
    .role-badge.admin { background: #f3e5f5; color: #7b1fa2; }
    .role-badge.propietario { background: #e3f2fd; color: #1565c0; }
    .role-badge.arrendatario { background: #e8f5e9; color: #2e7d32; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status.ok { background: #e8f5e9; color: #2e7d32; }
    .status:not(.ok) { background: #ffebee; color: #c62828; }
    .admin-table button:hover:not(.user-row button) { background: #c96f2d; color: white; }
    .empty-sub { color: #999; font-size: 13px; padding: 8px 0; }
  `],
  standalone: false
})
export class AdminUsuariosMaquinas implements OnInit {
  usuarios: Usuario[] = [];
  maquinas: Machinery[] = [];
  maquinasPorUsuario: { [key: string]: Machinery[] } = {};
  expandidos: Set<string> = new Set();
  loading = true;

  constructor(private api: Api, private dialog: MatDialog) {}

  ngOnInit(): void {
    forkJoin([
      this.api.get<Usuario[]>('/admin/users?page=1&size=200').pipe(catchError(() => of({ success: true, data: [] } as any))),
      this.api.get<Machinery[]>('/admin/machinery/all?page=1&size=200').pipe(catchError(() => of({ success: true, data: [] } as any)))
    ]).subscribe({
      next: ([usersRes, machineryRes]) => {
        this.usuarios = usersRes?.data || [];
        this.maquinas = machineryRes?.data || [];
        this.maquinasPorUsuario = {};
        for (const m of this.maquinas) {
          const uid = m.propietario_id;
          if (!this.maquinasPorUsuario[uid]) this.maquinasPorUsuario[uid] = [];
          this.maquinasPorUsuario[uid].push(m);
        }
        this.loading = false;
      }
    });
  }

  toggleExpand(u: Usuario): void {
    if (this.expandidos.has(u.id)) this.expandidos.delete(u.id);
    else this.expandidos.add(u.id);
  }

  toggleUser(event: Event, user: Usuario): void {
    event.stopPropagation();
    const accion = user.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} al usuario ${user.nombre} ${user.apellido}?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Usuario>(`/admin/users/${user.id}/status`, { activo: !user.activo }).subscribe({
        next: res => user.activo = res.data.activo
      });
    });
  }

  toggleMachinery(event: Event, item: Machinery): void {
    event.stopPropagation();
    const accion = item.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} la maquinaria "${item.titulo}"?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Machinery>(`/admin/machinery/all/${item.id}/status`, { activo: !item.activo }).subscribe({
        next: res => item.activo = res.data.activo
      });
    });
  }

  getStars(p: number): string {
    const full = Math.round(p);
    return '★'.repeat(full) + '☆'.repeat(5 - full) + ` ${p.toFixed(1)}`;
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }
}
