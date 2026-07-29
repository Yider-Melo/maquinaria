import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Api } from '../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { RatingStats, Booking, Machinery, PaymentDashboard } from '../../core/models';

@Component({
  selector: 'app-admin-reports', templateUrl: './reports.html', styleUrls: ['./reports.css'],
  standalone: false
})
export class AdminReports implements OnInit {
  ratingReportadas = 0;
  machinery: Machinery[] = [];
  recentBookings: Booking[] = [];
  payments: any[] = [];
  loading = true;

  constructor(private api: Api, private cdr: ChangeDetectorRef, private dialog: MatDialog) {}

  ngOnInit(): void {
    forkJoin([
      this.api.get<RatingStats>('/admin/ratings/stats').pipe(catchError(() => of({ success: true, data: { resumen: { total: 0, puntuacion_promedio: 0, reportadas: 0 }, reportadas: [] } }))),
      this.api.get<Machinery[]>('/admin/machinery/all?page=1&size=50').pipe(catchError(() => of({ success: true, data: [] }))),
      this.api.get<Booking[]>('/admin/bookings/recent?limit=20').pipe(catchError(() => of({ success: true, data: [] }))),
      this.api.get<PaymentDashboard>('/admin/payments/dashboard').pipe(catchError(() => of({ success: true, data: { resumen: { total_liberado: 0, total_retenido: 0, total_reembolsado: 0, total_transacciones: 0, total_fallidos: 0 }, ultimos_pagos: [] } })))
    ]).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ([ratings, machineryList, bookings, payments]) => {
        this.ratingReportadas = ratings?.data?.resumen?.reportadas || 0;
        this.machinery = machineryList?.data || [];
        this.recentBookings = bookings?.data || [];
        this.payments = payments?.data?.ultimos_pagos || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }

  toggleMachinery(item: Machinery): void {
    const accion = item.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} la maquinaria "${item.titulo}"?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Machinery>(`/admin/machinery/all/${item.id}/status`, { activo: !item.activo }).subscribe({
        next: res => item.activo = res.data.activo,
        error: () => console.error('Error al cambiar estado de la maquinaria')
      });
    });
  }
}
