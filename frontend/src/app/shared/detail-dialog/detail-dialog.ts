// Diálogo que muestra el detalle completo de una reserva, pago o maquinaria
// sin salir de la página. Se abre al hacer clic en un ID dentro del panel admin.
import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../../core/services/api.service';
import { formatDate, formatDateTime, estadoLabel } from '../utils';

interface DetalleCampo {
  label: string;
  value: string;
}

export type DetailTipo = 'reserva' | 'pago' | 'maquinaria';

@Component({
  selector: 'app-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="title">
      <mat-icon>{{ icono }}</mat-icon>
      <span>{{ data.titulo || (data.tipo === 'reserva' ? 'Detalle de la reserva' : data.tipo === 'pago' ? 'Detalle del pago' : 'Detalle de la maquinaria') }}</span>
    </h2>
    <mat-dialog-content class="content">
      <p class="id-label">{{ data.id }}</p>
      <div *ngIf="cargando" class="loading"><mat-icon>hourglass_top</mat-icon> Cargando detalles...</div>
      <div *ngIf="error" class="error"><mat-icon>error_outline</mat-icon> {{ error }}</div>
      <dl *ngIf="!cargando && !error" class="details">
        <ng-container *ngFor="let c of campos">
          <dt>{{ c.label }}</dt>
          <dd>{{ c.value }}</dd>
        </ng-container>
      </dl>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .title { display: flex; align-items: center; gap: 8px; }
    .title mat-icon { color: var(--rm-primary, #c96f2d); }
    .content { min-width: 380px; max-width: 520px; }
    .id-label { font-family: 'Courier New', monospace; font-size: 12px; color: #999; word-break: break-all; margin: 0 0 12px; }
    .loading, .error { display: flex; align-items: center; gap: 8px; padding: 20px 0; color: var(--rm-muted, #888); }
    .error { color: #c62828; }
    .details { display: grid; grid-template-columns: 130px 1fr; gap: 6px 12px; margin: 0; }
    .details dt { font-weight: 700; font-size: 13px; color: var(--rm-muted, #888); }
    .details dd { margin: 0; font-size: 13px; word-break: break-all; }
  `]
})
export class DetailDialog implements OnInit {
  cargando = true;
  error = '';
  campos: DetalleCampo[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { tipo: DetailTipo; id: string; titulo?: string },
    private api: Api,
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<DetailDialog>
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  get icono(): string {
    if (this.data.tipo === 'pago') return 'payments';
    if (this.data.tipo === 'reserva') return 'event_note';
    return 'build_circle';
  }

  private cargar(): void {
    this.cargando = true;
    this.error = '';
    const path = this.data.tipo === 'reserva'
      ? `/bookings/${this.data.id}`
      : this.data.tipo === 'pago'
        ? `/payments/${this.data.id}`
        : `/machinery/${this.data.id}`;

    this.api.get<any>(path).subscribe({
      next: (res) => {
        const d = res?.data;
        if (!d) {
          this.error = 'No se encontraron los detalles.';
          this.cargando = false;
          this.cdr.detectChanges();
          return;
        }
        this.campos = this.data.tipo === 'reserva'
          ? this.camposReserva(d)
          : this.data.tipo === 'pago'
            ? this.camposPago(d)
            : this.camposMaquinaria(d);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar los detalles.';
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private moneda(v: any): string {
    return '$' + (Number(v) || 0).toLocaleString('es-CO');
  }

  // La reserva no guarda modalidad ni cantidad en la base de datos: se calculan
  // a partir del rango de fechas y el precio (la plataforma alquila por día).
  private modalidadLabel(m?: string): string {
    if (!m) return 'Por día';
    if (m === 'dia') return 'Por día';
    if (m === 'hora') return 'Por hora';
    if (m === 'mes') return 'Por mes';
    if (m === 'semana') return 'Por semana';
    return m;
  }

  private diasReserva(inicio?: string, fin?: string): number {
    if (!inicio || !fin) return 0;
    const start = new Date(inicio).getTime();
    const end = new Date(fin).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 0;
    return Math.round((end - start) / 86400000) + 1;
  }

  private camposReserva(b: any): DetalleCampo[] {
    const dias = this.diasReserva(b.fecha_inicio, b.fecha_fin);
    const cantidad = dias > 0
      ? `${dias} día${dias === 1 ? '' : 's'}`
      : (b.cantidad_unidades != null ? String(b.cantidad_unidades) : '—');
    const c: DetalleCampo[] = [
      { label: 'ID', value: b.id || '—' },
      { label: 'Estado', value: estadoLabel(b.estado) },
      { label: 'Fecha inicio', value: formatDate(b.fecha_inicio) },
      { label: 'Fecha fin', value: formatDate(b.fecha_fin) },
      { label: 'Modalidad', value: this.modalidadLabel(b.modalidad) },
      { label: 'Cantidad', value: cantidad },
      { label: 'Precio unitario', value: this.moneda(b.precio_unitario ?? b.precio_total) },
      { label: 'Precio total', value: this.moneda(b.precio_total) },
      { label: 'Maquinaria ID', value: b.maquinaria_id || '—' },
      { label: 'Propietario', value: (b.propietario_nombre ? b.propietario_nombre + ' · ' : '') + (b.propietario_id || '—') },
      { label: 'Arrendatario', value: (b.arrendatario_nombre ? b.arrendatario_nombre + ' · ' : '') + (b.arrendatario_id || '—') }
    ];
    if (b.arrendatario_email) c.push({ label: 'Email arrendatario', value: b.arrendatario_email });
    if (b.motivo_cancelacion) c.push({ label: 'Motivo de cancelación', value: b.motivo_cancelacion });
    if (b.creado_en) c.push({ label: 'Creado', value: formatDateTime(b.creado_en) });
    return c;
  }

  private camposPago(p: any): DetalleCampo[] {
    const c: DetalleCampo[] = [
      { label: 'ID', value: p.id || '—' },
      { label: 'Estado', value: estadoLabel(p.estado) },
      { label: 'Monto', value: this.moneda(p.monto) },
      { label: 'Método de pago', value: p.metodo_pago || '—' },
      { label: 'Referencia pasarela', value: p.referencia_pasarela || '—' },
      { label: 'Reserva ID', value: p.reserva_id || '—' },
      { label: 'Pagador ID', value: p.usuario_id || '—' },
      { label: 'Propietario ID', value: p.propietario_id || '—' }
    ];
    if (p.fecha_pago) c.push({ label: 'Fecha de pago', value: formatDateTime(p.fecha_pago) });
    if (p.creado_en) c.push({ label: 'Creado', value: formatDateTime(p.creado_en) });
    return c;
  }

  private camposMaquinaria(m: any): DetalleCampo[] {
    const c: DetalleCampo[] = [
      { label: 'ID', value: m.id || '—' },
      { label: 'Título', value: m.titulo || '—' },
      { label: 'Tipo', value: m.tipo || '—' },
      { label: 'Marca', value: m.marca || '—' },
      { label: 'Modelo', value: m.modelo || '—' },
      { label: 'Año', value: m.anio ? String(m.anio) : '—' },
      { label: 'Capacidad', value: m.capacidad ? String(m.capacidad) : '—' },
      { label: 'Estado', value: m.estado || '—' },
      { label: 'Precio / día', value: this.moneda(m.precio_por_dia) },
      { label: 'Ciudad', value: m.ciudad || '—' },
      { label: 'Departamento', value: m.departamento || '—' },
      { label: 'Disponible', value: m.disponible ? 'Sí' : 'No' }
    ];
    if (m.puntuacion_promedio != null) c.push({ label: 'Calificación', value: `${m.puntuacion_promedio} (${m.total_resenas ?? 0} reseñas)` });
    if (m.creado_en) c.push({ label: 'Creado', value: formatDateTime(m.creado_en) });
    return c;
  }
}
