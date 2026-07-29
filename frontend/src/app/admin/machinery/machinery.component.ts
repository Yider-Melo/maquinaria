import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api.service';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { Machinery, ApiResponse } from '../../core/models';

@Component({
  selector: 'app-admin-machinery',
  template: `
    <div class="page">
      <h1>Máquinas</h1>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Máquina</th>
            <th>Tipo</th>
            <th>Ciudad</th>
            <th>Precio/día</th>
            <th>Puntuación</th>
            <th>Estado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of machinery">
            <td>
              <strong>{{ m.titulo }}</strong>
              <small>{{ m.marca }} {{ m.modelo }}</small>
            </td>
            <td>{{ m.tipo }}</td>
            <td>{{ m.ciudad }}</td>
            <td>${{ m.precio_por_dia | number }}</td>
            <td>
              <span class="rating">
                <mat-icon>star</mat-icon>
                {{ m.puntuacion_promedio ? (m.puntuacion_promedio | number:'1.1-1') : '—' }}
              </span>
            </td>
            <td>
              <span class="status" [class.ok]="m.activo">
                {{ m.activo ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td>
              <button mat-stroked-button (click)="toggleMachinery(m)">
                {{ m.activo ? 'Desactivar' : 'Activar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p *ngIf="!machinery.length && !loading" class="empty">Sin máquinas registradas</p>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page h1 { margin-bottom: 24px; }
    .rating { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; }
    .rating mat-icon { font-size: 18px; width: 18px; height: 18px; color: #f59e0b; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status.ok { background: #e8f5e9; color: #2e7d32; }
    .status:not(.ok) { background: #ffebee; color: #c62828; }
    .admin-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .admin-table th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #ddd; font-weight: 800; font-size: 13px; color: #666; }
    .admin-table td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
    .admin-table td small { display: block; font-size: 12px; color: #999; margin-top: 2px; }
    .admin-table tr:hover { background: rgba(0,0,0,0.03); }
    .admin-table button:hover { background: #c96f2d; color: white; }
    .empty { color: #999; text-align: center; padding: 32px; }
  `],
  standalone: false
})
export class AdminMachinery implements OnInit {
  machinery: Machinery[] = [];
  loading = true;

  constructor(private api: Api, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.api.get<Machinery[]>('/admin/machinery/all?page=1&size=100').pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => { this.machinery = res?.data || []; this.loading = false; }
    });
  }

  toggleMachinery(item: Machinery): void {
    const accion = item.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} la maquinaria "${item.titulo}"?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Machinery>(`/admin/machinery/all/${item.id}/status`, { activo: !item.activo }).subscribe({
        next: res => { item.activo = res.data.activo; },
        error: () => console.error('Error al cambiar estado')
      });
    });
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }
}
