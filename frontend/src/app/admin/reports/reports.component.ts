import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Api } from '../../core/services/api.service';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';

@Component({
  selector: 'app-admin-reports', templateUrl: './reports.html', styleUrls: ['./reports.css'],
  standalone: false
})
export class AdminReports implements OnInit {
  stats: any = {};
  ratingReportadas = 0;
  users: any[] = [];
  machinery: any[] = [];
  recentBookings: any[] = [];
  payments: any[] = [];
  loading = true;

  constructor(private api: Api, private cdr: ChangeDetectorRef, private dialog: MatDialog) {}

  ngOnInit(): void {
    forkJoin([
      this.api.get<any>('/admin/users/stats').pipe(catchError(() => of({ data: {} }))),
      this.api.get<any>('/admin/ratings/stats').pipe(catchError(() => of({ data: { resumen: { reportadas: 0 } } }))),
      this.api.get<any>('/admin/users?page=1&size=50').pipe(catchError(() => of({ data: { data: [] } }))),
      this.api.get<any>('/admin/machinery/all?page=1&size=50').pipe(catchError(() => of({ data: { data: [] } }))),
      this.api.get<any>('/admin/bookings/recent?limit=20').pipe(catchError(() => of({ data: [] }))),
      this.api.get<any>('/admin/payments/dashboard').pipe(catchError(() => of({ data: { ultimos_pagos: [] } })))
    ]).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ([users, ratings, userList, machineryList, bookings, payments]) => {
        this.stats = users?.data || {};
        this.ratingReportadas = ratings?.data?.resumen?.reportadas || 0;
        this.users = userList?.data?.data || [];
        this.machinery = machineryList?.data?.data || [];
        this.recentBookings = bookings?.data || [];
        this.payments = payments?.data?.ultimos_pagos || [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading reports:', err);
        this.cdr.markForCheck();
      }
    });
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }

  toggleUser(user: any): void {
    const accion = user.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} al usuario ${user.nombre} ${user.apellido}?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<any>(`/admin/users/${user.id}/status`, { activo: !user.activo }).subscribe(res => user.activo = res.data.activo);
    });
  }

  toggleMachinery(item: any): void {
    const accion = item.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} la maquinaria "${item.titulo}"?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<any>(`/admin/machinery/all/${item.id}/status`, { activo: !item.activo }).subscribe(res => item.activo = res.data.activo);
    });
  }
}
