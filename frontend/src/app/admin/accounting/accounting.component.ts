import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { Api } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { MatDialog } from '@angular/material/dialog';
import { watchRealtime } from '../../shared/realtime';
import { DetailDialog } from '../../shared/detail-dialog/detail-dialog';
import { PagosFallidosDialog } from '../../shared/pagos-fallidos-dialog/pagos-fallidos-dialog';
import { estadoLabel, estadoPagoLabel } from '../../shared/utils';

@Component({
  selector: 'app-admin-accounting', templateUrl: './accounting.html', styleUrls: ['./accounting.css'],
  standalone: false
})
export class AdminAccounting implements OnInit, OnDestroy {
  estadoLabel = estadoLabel;
  estadoPagoLabel = estadoPagoLabel;
  dashboard: any = {
    resumen: { total_liberado: 0, total_retenido: 0, total_reembolsado: 0, total_transacciones: 0, total_fallidos: 0 },
    por_mes: [],
    ultimos_pagos: []
  };

  mesPage = 1;
  mesSize = 12;

  mesDetalle: string | null = null;
  pagosMes: any[] = [];
  pagoPage = 1;
  pagoSize = 8;
  pagoTotal = 0;
  pagoMesSearch = '';

  private realtimeSub: Subscription | undefined;

  constructor(private api: Api, private cdr: ChangeDetectorRef, private socket: SocketService, private dialog: MatDialog) {}

  verDetalleEntidad(tipo: 'reserva' | 'pago' | 'maquinaria', id: string): void {
    this.dialog.open(DetailDialog, { data: { tipo, id }, maxWidth: '560px' });
  }

  abrirPagosFallidos(): void {
    this.dialog.open(PagosFallidosDialog, { data: {}, maxWidth: '680px' });
  }

  ngOnInit(): void {
    this.loadDashboard();
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        return t.startsWith('payment.') || t.startsWith('booking.');
      },
      () => this.loadDashboard()
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private loadDashboard(): void {
    this.api.get<any>('/admin/payments/dashboard').pipe(
      catchError(() => of({
        success: true,
        data: {
          resumen: { total_liberado: 0, total_retenido: 0, total_reembolsado: 0, total_transacciones: 0, total_fallidos: 0 },
          por_mes: [],
          ultimos_pagos: []
        }
      }))
    ).subscribe({
      next: (res) => { this.dashboard = res.data; this.cdr.detectChanges(); }
    });
  }

  get mesesPaginados(): any[] {
    const total = this.dashboard.por_mes || [];
    const start = (this.mesPage - 1) * this.mesSize;
    return total.slice(start, start + this.mesSize);
  }

  get mesTotalPages(): number {
    return Math.ceil((this.dashboard.por_mes?.length || 0) / this.mesSize) || 1;
  }

  prevMesPage(): void {
    if (this.mesPage > 1) { this.mesPage--; }
  }

  nextMesPage(): void {
    if (this.mesPage * this.mesSize < (this.dashboard.por_mes?.length || 0)) { this.mesPage++; }
  }

  verDetalle(mes: string): void {
    if (this.mesDetalle === mes) {
      this.mesDetalle = null;
      this.pagosMes = [];
      return;
    }
    this.mesDetalle = mes;
    this.pagoPage = 1;
    this.pagoMesSearch = '';
    this.cargarPagosMes();
  }

  onPagoMesSearch(q: string): void {
    this.pagoMesSearch = q;
    this.pagoPage = 1;
    this.cargarPagosMes();
  }

  clearPagoMesSearch(): void {
    this.pagoMesSearch = '';
    this.pagoPage = 1;
    this.cargarPagosMes();
  }

  private cargarPagosMes(): void {
    if (!this.mesDetalle) return;
    const q = this.pagoMesSearch.trim() ? `&q=${encodeURIComponent(this.pagoMesSearch.trim())}` : '';
    this.api.get<any>(`/admin/payments/by-month?mes=${this.mesDetalle}&page=${this.pagoPage}&size=${this.pagoSize}${q}`).pipe(
      catchError(() => of({ success: true, data: [], pagination: { total: 0 } } as any))
    ).subscribe({
      next: (res) => {
        this.pagosMes = (res as any).data || [];
        this.pagoTotal = (res as any)?.pagination?.total || 0;
        this.cdr.detectChanges();
      }
    });
  }

  get pagoTotalPages(): number {
    return Math.ceil(this.pagoTotal / this.pagoSize) || 1;
  }

  prevPagoPage(): void {
    if (this.pagoPage > 1) { this.pagoPage--; this.cargarPagosMes(); }
  }

  nextPagoPage(): void {
    if (this.pagoPage * this.pagoSize < this.pagoTotal) { this.pagoPage++; this.cargarPagosMes(); }
  }

  mesLabel(mes: string): string {
    if (!mes) return '';
    const [year, month] = mes.split('-');
    const fecha = new Date(Number(year), Number(month) - 1, 1);
    const texto = fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  get gananciaNeta(): number {
    return Number(this.dashboard.ganancia_total || 0);
  }
}
