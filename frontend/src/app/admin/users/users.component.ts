import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api.service';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { Usuario } from '../../core/models';

@Component({
  selector: 'app-admin-users',
  template: `
    <div class="page">
      <h1>Usuarios</h1>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users">
            <td><strong>{{ u.nombre }} {{ u.apellido }}</strong></td>
            <td>{{ u.email }}</td>
            <td><span class="role-badge" [class]="u.tipo_usuario">{{ u.tipo_usuario }}</span></td>
            <td>{{ u.telefono || 'N/A' }}</td>
            <td>
              <span class="status" [class.ok]="u.activo">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <button mat-stroked-button (click)="toggleUser(u)">
                {{ u.activo ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!users.length && !loading" class="empty">Sin usuarios registrados</p>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page h1 { margin-bottom: 24px; }
    .role-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize; }
    .role-badge.admin { background: #f3e5f5; color: #7b1fa2; }
    .role-badge.propietario { background: #e3f2fd; color: #1565c0; }
    .role-badge.arrendatario { background: #e8f5e9; color: #2e7d32; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status.ok { background: #e8f5e9; color: #2e7d32; }
    .status:not(.ok) { background: #ffebee; color: #c62828; }
    .admin-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .admin-table th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #ddd; font-weight: 800; font-size: 13px; color: #666; }
    .admin-table td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
    .admin-table tr:hover { background: rgba(0,0,0,0.03); }
    .admin-table button:hover { background: #c96f2d; color: white; }
    .empty { color: #999; text-align: center; padding: 32px; }
  `],
  standalone: false
})
export class AdminUsers implements OnInit {
  users: Usuario[] = [];
  loading = true;

  constructor(private api: Api, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.api.get<Usuario[]>('/admin/users?page=1&size=100').pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => { this.users = res?.data || []; this.loading = false; }
    });
  }

  toggleUser(user: Usuario): void {
    const accion = user.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} al usuario ${user.nombre} ${user.apellido}?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Usuario>(`/admin/users/${user.id}/status`, { activo: !user.activo }).subscribe({
        next: res => { user.activo = res.data.activo; },
        error: () => console.error('Error al cambiar estado')
      });
    });
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }
}
