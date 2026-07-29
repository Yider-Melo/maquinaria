import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api } from '../../core/services/api.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { UserStats, MachineryStats, BookingStats, PaymentDashboard, Booking, ApiResponse } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard', templateUrl: './dashboard.html', styleUrls: ['./dashboard.css'],
  standalone: false
})
export class AdminDashboard implements OnInit {
  stats: any = {};
  topTypes: { tipo: string; cantidad: number }[] = [];
  loading = true;

  constructor(private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    forkJoin([
      this.api.get<UserStats>('/admin/users/stats').pipe(catchError(() => of({ success: true, data: { total: 0, propietarios: 0, arrendatarios: 0 } }))),
      this.api.get<MachineryStats>('/admin/machinery/stats').pipe(catchError(() => of({ success: true, data: { resumen: { activas: 0, inactivas: 0, total: 0, propietarios_con_maquinaria: 0, tipos_distintos: 0, precio_promedio_dia: 0, precio_minimo: 0, precio_maximo: 0 }, por_tipo: [] } }))),
      this.api.get<BookingStats>('/admin/bookings/stats').pipe(catchError(() => of({ success: true, data: { total: 0, pendientes: 0, confirmadas: 0, en_curso: 0, completadas: 0, canceladas: 0, rechazadas: 0, ingresos_totales: 0, promedio_por_reserva: 0 } }))),
      this.api.get<PaymentDashboard>('/admin/payments/dashboard').pipe(catchError(() => of({ success: true, data: { resumen: { total_liberado: 0, total_retenido: 0, total_reembolsado: 0, total_transacciones: 0, total_fallidos: 0 }, ultimos_pagos: [] } }))),
      this.api.get<Booking[]>('/admin/bookings/recent?limit=10').pipe(catchError(() => of({ success: true, data: [] })))
    ]).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ([users, machinery, bookings, payments, recent]) => {
        this.stats = {
          users: users?.data,
          machinery: machinery?.data,
          bookings: bookings?.data,
          payments: payments?.data,
          recentBookings: recent?.data || []
        };
        this.topTypes = (machinery?.data?.por_tipo || []).slice(0, 5);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  barPercent(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }
}
