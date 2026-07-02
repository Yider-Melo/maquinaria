import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-admin-dashboard', templateUrl: './dashboard.html', styleUrls: ['./dashboard.css'],
  standalone: false
})
export class AdminDashboard implements OnInit {
  stats: any = {};
  topTypes: any[] = [];
  loading = true;

  constructor(private api: Api) {}

  ngOnInit(): void {
    Promise.all([
      this.api.get<any>('/admin/users/stats').toPromise(),
      this.api.get<any>('/admin/machinery/stats').toPromise(),
      this.api.get<any>('/admin/bookings/stats').toPromise(),
      this.api.get<any>('/admin/payments/dashboard').toPromise(),
      this.api.get<any>('/admin/bookings/recent?limit=10').toPromise()
    ]).then(([users, machinery, bookings, payments, recent]) => {
      this.stats = {
        users: users?.data,
        machinery: machinery?.data,
        bookings: bookings?.data,
        payments: payments?.data,
        recentBookings: recent?.data || []
      };
      this.topTypes = (machinery?.data?.por_tipo || []).slice(0, 5);
      this.loading = false;
    }).catch(() => this.loading = false);
  }

  barPercent(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }
}
