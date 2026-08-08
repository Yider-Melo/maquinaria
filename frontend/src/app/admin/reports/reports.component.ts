import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Api } from '../../core/services/api.service';
import { Observable, forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { UserStats, RatingStats, Booking, Machinery, PaymentDashboard, Usuario } from '../../core/models';

@Component({
  selector: 'app-admin-reports', templateUrl: './reports.html', styleUrls: ['./reports.css'],
  standalone: false
})
export class AdminReports implements OnInit, OnDestroy {
  stats: any = {};
  ratingReportadas = 0;
  users: Usuario[] = [];
  userMap: { [key: string]: string } = {};
  machinery: Machinery[] = [];
  recentBookings: Booking[] = [];
  payments: any[] = [];
  loading = true;

  userPage = 1; userSize = 20; userTotal = 0;
  machPage = 1; machSize = 20; machTotal = 0;

  userSearch = '';
  machSearch = '';
  bookingSearch = '';
  paymentSearch = '';

  private userSearch$ = new Subject<string>();
  private machSearch$ = new Subject<string>();
  private bookingSearch$ = new Subject<string>();
  private paymentSearch$ = new Subject<string>();

  get userTotalPages(): number { return Math.ceil(this.userTotal / this.userSize) || 1; }
  get machTotalPages(): number { return Math.ceil(this.machTotal / this.machSize) || 1; }

  constructor(private api: Api, private cdr: ChangeDetectorRef, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.userSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => { this.userPage = 1; this.loadUsers(); });
    this.machSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => { this.machPage = 1; this.loadMachinery(); });
    this.bookingSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.loadBookings());
    this.paymentSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.loadPayments());
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.userSearch$.complete();
    this.machSearch$.complete();
    this.bookingSearch$.complete();
    this.paymentSearch$.complete();
  }

  onUserSearch(q: string): void { this.userSearch = q; this.userSearch$.next(q); }
  onMachSearch(q: string): void { this.machSearch = q; this.machSearch$.next(q); }
  onBookingSearch(q: string): void { this.bookingSearch = q; this.bookingSearch$.next(q); }
  onPaymentSearch(q: string): void { this.paymentSearch = q; this.paymentSearch$.next(q); }

  clearUserSearch(): void { this.userSearch = ''; this.userSearch$.next(''); }
  clearMachSearch(): void { this.machSearch = ''; this.machSearch$.next(''); }
  clearBookingSearch(): void { this.bookingSearch = ''; this.bookingSearch$.next(''); }
  clearPaymentSearch(): void { this.paymentSearch = ''; this.paymentSearch$.next(''); }

  prevUserPage(): void { if (this.userPage > 1) { this.userPage--; this.loadUsers(); } }
  nextUserPage(): void { if (this.userPage * this.userSize < this.userTotal) { this.userPage++; this.loadUsers(); } }
  prevMachPage(): void { if (this.machPage > 1) { this.machPage--; this.loadMachinery(); } }
  nextMachPage(): void { if (this.machPage * this.machSize < this.machTotal) { this.machPage++; this.loadMachinery(); } }

  private loadAll(): void {
    forkJoin([
      this.api.get<UserStats>('/admin/users/stats').pipe(catchError(() => of({ success: true, data: { total: 0, propietarios: 0, arrendatarios: 0 } }))),
      this.api.get<RatingStats>('/admin/ratings/stats').pipe(catchError(() => of({ success: true, data: { resumen: { total: 0, puntuacion_promedio: 0, reportadas: 0 }, reportadas: [] } }))),
      this.api.get<PaymentDashboard>('/admin/payments/dashboard').pipe(catchError(() => of({ success: true, data: { resumen: { total_liberado: 0, total_retenido: 0, total_reembolsado: 0, total_transacciones: 0, total_fallidos: 0 }, ultimos_pagos: [] } }))),
      this.api.get<Booking[]>('/admin/bookings/recent?limit=100').pipe(catchError(() => of({ success: true, data: [] } as any)))
    ]).pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({
      next: ([users, ratings, payments, bookings]) => {
        this.stats = users?.data || {};
        this.ratingReportadas = ratings?.data?.resumen?.reportadas || 0;
        this.payments = payments?.data?.ultimos_pagos || [];
        if ((bookings as any)?.data) { this.recentBookings = (bookings as any).data; }
        else { this.recentBookings = (bookings as any) || []; }
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
    this.loadUsers();
    this.loadMachinery();
  }

  private loadUsers(): void {
    const q = this.userSearch.trim() ? `&q=${encodeURIComponent(this.userSearch.trim())}` : '';
    this.api.get<Usuario[]>(`/admin/users?page=${this.userPage}&size=${this.userSize}${q}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => {
        const r = res as any;
        this.users = r?.data || [];
        this.userTotal = r?.pagination?.total || 0;
        this.userMap = {};
        for (const u of this.users) { this.userMap[u.id] = `${u.nombre} ${u.apellido}`.trim(); }
        this.cdr.markForCheck();
      }
    });
  }

  private loadMachinery(): void {
    const q = this.machSearch.trim() ? `&q=${encodeURIComponent(this.machSearch.trim())}` : '';
    this.api.get<Machinery[]>(`/admin/machinery/all?page=${this.machPage}&size=${this.machSize}${q}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => {
        const r = res as any;
        this.machinery = r?.data || [];
        this.machTotal = r?.pagination?.total || 0;
        this.cdr.markForCheck();
      }
    });
  }

  private loadBookings(): void {
    const q = this.bookingSearch.trim() ? `&q=${encodeURIComponent(this.bookingSearch.trim())}` : '';
    this.api.get<Booking[]>(`/admin/bookings/recent?limit=100${q}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => {
        if ((res as any)?.data) { this.recentBookings = (res as any).data; }
        else { this.recentBookings = (res as any) || []; }
        this.cdr.markForCheck();
      }
    });
  }

  private loadPayments(): void {
    const q = this.paymentSearch.trim() ? `?q=${encodeURIComponent(this.paymentSearch.trim())}` : '';
    this.api.get<PaymentDashboard>(`/admin/payments/dashboard${q}`).pipe(
      catchError(() => of({ success: true, data: { ultimos_pagos: [] } } as any))
    ).subscribe({
      next: (res) => {
        this.payments = (res as any)?.data?.ultimos_pagos || [];
        this.cdr.markForCheck();
      }
    });
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }

  toggleUser(user: Usuario): void {
    const accion = user.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} al usuario ${user.nombre} ${user.apellido}?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Usuario>(`/admin/users/${user.id}/status`, { activo: !user.activo }).subscribe({
        next: res => user.activo = res.data.activo,
        error: () => console.error('Error al cambiar estado del usuario')
      });
    });
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
