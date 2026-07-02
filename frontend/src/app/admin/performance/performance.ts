import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-admin-performance', templateUrl: './performance.html', styleUrls: ['./performance.css'],
  standalone: false
})
export class AdminPerformance implements OnInit {
  machineryStats: any = null;
  bookingStats: any = null;
  ratingStats: any = null;
  loading = true;

  constructor(private api: Api) {}

  ngOnInit(): void {
    Promise.all([
      this.api.get<any>('/admin/machinery/stats').toPromise(),
      this.api.get<any>('/admin/bookings/stats').toPromise(),
      this.api.get<any>('/admin/ratings/stats').toPromise()
    ]).then(([machinery, bookings, ratings]) => {
      this.machineryStats = machinery?.data;
      this.bookingStats = bookings?.data;
      this.ratingStats = ratings?.data;
      this.loading = false;
    }).catch(() => this.loading = false);
  }

  barPercent(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }
}
