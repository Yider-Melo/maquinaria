// Diálogo que muestra los pagos fallidos (los que no se pudieron completar)
// con sus detalles. Al hacer clic en un ID se abre el detalle completo.
import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../../core/services/api.service';
import { DetailDialog } from '../detail-dialog/detail-dialog';

@Component({
  selector: 'app-pagos-fallidos-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="title">
      <mat-icon>error_outline</mat-icon>
      <span>Pagos Fallidos ({{ total }})</span>
    </h2>
    <mat-dialog-content class="content">
      <div *ngIf="cargando" class="loading"><mat-icon>hourglass_top</mat-icon> Cargando...</div>
      <div *ngIf="error" class="error"><mat-icon>error_outline</mat-icon> {{ error }}</div>
      <div class="table-scroll" *ngIf="!cargando && !error">
        <table class="pagos-table" *ngIf="pagos.length">
          <thead>
            <tr><th>ID</th><th>Reserva</th><th>Monto</th><th>Método</th><th>Referencia</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of pagos">
              <td><a class="id-link" (click)="verDetalle('pago', p.id)" title="Ver detalle del pago">{{ p.id }}</a></td>
              <td><a class="id-link" (click)="verDetalle('reserva', p.reserva_id)" title="Ver detalle de la reserva">{{ p.reserva_id }}</a></td>
              <td>{{ p.monto | number }}</td>
              <td>{{ p.metodo_pago || 'N/A' }}</td>
              <td>{{ p.referencia_pasarela || 'N/A' }}</td>
              <td>{{ p.creado_en | date:'short':'':'es-CO' }}</td>
            </tr>
          </tbody>
        </table>
        <p *ngIf="!pagos.length" class="empty">No hay pagos fallidos</p>
      </div>
      <div class="pagination" *ngIf="total > size">
        <button (click)="prev()" [disabled]="page===1">Anterior</button>
        <span>Página {{ page }} de {{ totalPages }}</span>
        <button (click)="next()" [disabled]="page*size >= total">Siguiente</button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title { display: flex; align-items: center; gap: 8px; }
    .title mat-icon { color: var(--rm-danger, #b71c1c); }
    .content { min-width: 480px; max-width: 640px; }
    .loading, .error { display: flex; align-items: center; gap: 8px; padding: 20px 0; color: var(--rm-muted, #888); }
    .error { color: #c62828; }
    .table-scroll { overflow-x: auto; max-width: 100%; }
    .pagos-table { width: 100%; border-collapse: collapse; }
    .pagos-table th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #ddd; font-weight: 800; font-size: 12px; color: #666; white-space: nowrap; }
    .pagos-table td { padding: 9px 8px; border-bottom: 1px solid #eee; font-size: 13px; white-space: nowrap; }
    .pagos-table tbody tr:nth-child(even) { background: rgba(201, 111, 45, .04); }
    .id-link { font-family: 'Courier New', monospace; font-size: 12px; color: var(--rm-primary, #c96f2d); text-decoration: none; font-weight: 600; cursor: pointer; }
    .id-link:hover { text-decoration: underline; }
    .empty { color: var(--rm-muted, #888); text-align: center; padding: 16px; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; font-size: 13px; color: var(--rm-muted, #888); }
    .pagination button { border: 1px solid #ddd; background: #fff; border-radius: 6px; padding: 4px 12px; cursor: pointer; }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
  `]
})
export class PagosFallidosDialog implements OnInit {
  pagos: any[] = [];
  page = 1;
  size = 8;
  total = 0;
  cargando = true;
  error = '';

  get totalPages(): number { return Math.ceil(this.total / this.size) || 1; }

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private api: Api,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  verDetalle(tipo: 'reserva' | 'pago' | 'maquinaria', id: string): void {
    this.dialog.open(DetailDialog, { data: { tipo, id }, maxWidth: '560px' });
  }

  prev(): void { if (this.page > 1) { this.page--; this.cargar(); } }
  next(): void { if (this.page * this.size < this.total) { this.page++; this.cargar(); } }

  private cargar(): void {
    this.cargando = true;
    this.error = '';
    this.api.get<any>('/admin/payments/failed', { page: this.page, size: this.size }).subscribe({
      next: (res) => {
        const r = res as any;
        this.pagos = r?.data || [];
        this.total = r?.pagination?.total || 0;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los pagos fallidos.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }
}
