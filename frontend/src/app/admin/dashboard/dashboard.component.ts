import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Api } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { watchRealtime } from '../../shared/realtime';
import { DetailDialog } from '../../shared/detail-dialog/detail-dialog';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { UserStats, MachineryStats, BookingStats, Booking, ApiResponse } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard', templateUrl: './dashboard.html', styleUrls: ['./dashboard.css'],
  standalone: false
})
export class AdminDashboard implements OnInit, OnDestroy {
  stats: any = {};
  topTypes: { tipo: string; cantidad: number }[] = [];
  loading = true;
  private realtimeSub: Subscription | undefined;

  constructor(private api: Api, private cdr: ChangeDetectorRef, private socket: SocketService, private dialog: MatDialog, private router: Router) {}

  irAReservas(estado: string): void {
    this.router.navigate(['/admin/reports'], { queryParams: { tab: 'reservas', estado } });
  }

  irAMaquinaria(tipo: string): void {
    this.router.navigate(['/admin/usuarios-maquinas'], { queryParams: { q: tipo } });
  }

  verDetalleEntidad(tipo: 'reserva' | 'pago' | 'maquinaria', id: string): void {
    this.dialog.open(DetailDialog, { data: { tipo, id }, maxWidth: '560px' });
  }

  ngOnInit(): void {
    this.loadStats();
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        return t.startsWith('booking.') || t.startsWith('payment.') || t.startsWith('machinery.');
      },
      () => this.loadStats()
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private loadStats(): void {
    this.loading = true;
    forkJoin([
      this.api.get<UserStats>('/admin/users/stats').pipe(catchError(() => of({ success: true, data: { total: 0, propietarios: 0, arrendatarios: 0 } }))),
      this.api.get<MachineryStats>('/admin/machinery/stats').pipe(catchError(() => of({ success: true, data: { resumen: { activas: 0, inactivas: 0, total: 0, propietarios_con_maquinaria: 0, tipos_distintos: 0, precio_promedio_dia: 0, precio_minimo: 0, precio_maximo: 0 }, por_tipo: [] } }))),
      this.api.get<BookingStats>('/admin/bookings/stats').pipe(catchError(() => of({ success: true, data: { total: 0, pendientes: 0, confirmadas: 0, pagadas: 0, en_curso: 0, completadas: 0, canceladas: 0, rechazadas: 0, ingresos_totales: 0, promedio_por_reserva: 0 } }))),
      this.api.get<Booking[]>('/admin/bookings/recent?limit=10').pipe(catchError(() => of({ success: true, data: [] })))
    ]).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ([users, machinery, bookings, recent]) => {
        this.stats = {
          users: users?.data,
          machinery: machinery?.data,
          bookings: bookings?.data,
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
