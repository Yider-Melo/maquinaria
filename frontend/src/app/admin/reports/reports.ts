import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-admin-reports', templateUrl: './reports.html', styleUrls: ['./reports.css'],
  standalone: false
})
export class AdminReports implements OnInit {
  stats: any = {};
  ratingReportadas = 0;

  constructor(private api: Api) {}

  ngOnInit(): void {
    Promise.all([
      this.api.get<any>('/admin/users/stats').toPromise(),
      this.api.get<any>('/admin/ratings/stats').toPromise()
    ]).then(([users, ratings]) => {
      this.stats = users?.data || {};
      this.ratingReportadas = ratings?.data?.resumen?.reportadas || 0;
    }).catch(() => {});
  }
}
