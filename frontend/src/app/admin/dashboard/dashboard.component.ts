import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api } from '../../core/services/api.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard', templateUrl: './dashboard.html', styleUrls: ['./dashboard.css'],
  standalone: false
})
export class AdminDashboard implements OnInit {
  stats: any = {};
  topTypes: any[] = [];
  loading = true;

  constructor(private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    forkJoin([
      this.api.get<any>('/admin/users/stats').pipe(catchError(() => of({ data: {} }))),
      this.api.get<any>('/admin/machinery/stats').pipe(catchError(() => of({ data: {} }))),
      this.api.get<any>('/admin/bookings/stats').pipe(catchError(() => of({ data: {} }))),
      this.api.get<any>('/admin/payments/dashboard').pipe(catchError(() => of({ data: {} }))),
      this.api.get<any>('/admin/bookings/recent?limit=10').pipe(catchError(() => of({ data: [] })))
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
      error: (err) => {
        console.error('Error loading admin dashboard:', err);
        this.cdr.markForCheck();
      }
    });
  }

  barPercent(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }
}
