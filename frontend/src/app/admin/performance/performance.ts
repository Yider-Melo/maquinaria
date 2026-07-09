import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api } from '../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-performance', templateUrl: './performance.html', styleUrls: ['./performance.css'],
  standalone: false
})
export class AdminPerformance implements OnInit {
  machineryStats: any = null;
  bookingStats: any = null;
  ratingStats: any = null;
  loading = true;

  constructor(private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    forkJoin([
      this.api.get<any>('/admin/machinery/stats').pipe(catchError(() => of({ data: null }))),
      this.api.get<any>('/admin/bookings/stats').pipe(catchError(() => of({ data: null }))),
      this.api.get<any>('/admin/ratings/stats').pipe(catchError(() => of({ data: null })))
    ]).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ([machinery, bookings, ratings]) => {
        this.machineryStats = machinery?.data;
        this.bookingStats = bookings?.data;
        this.ratingStats = ratings?.data;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading performance stats:', err);
        this.cdr.markForCheck();
      }
    });
  }

  barPercent(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }
}
