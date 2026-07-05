import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api';

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

  constructor(private api: Api) {}

  ngOnInit(): void {
    Promise.all([
      this.api.get<any>('/admin/users/stats').toPromise(),
      this.api.get<any>('/admin/ratings/stats').toPromise(),
      this.api.get<any>('/admin/users?page=1&size=50').toPromise(),
      this.api.get<any>('/admin/machinery/all?page=1&size=50').toPromise(),
      this.api.get<any>('/admin/bookings/recent?limit=20').toPromise(),
      this.api.get<any>('/admin/payments/dashboard').toPromise()
    ]).then(([users, ratings, userList, machineryList, bookings, payments]) => {
      this.stats = users?.data || {};
      this.ratingReportadas = ratings?.data?.resumen?.reportadas || 0;
      this.users = userList?.data?.data || [];
      this.machinery = machineryList?.data?.data || [];
      this.recentBookings = bookings?.data || [];
      this.payments = payments?.data?.ultimos_pagos || [];
      this.loading = false;
    }).catch(() => this.loading = false);
  }

  toggleUser(user: any): void {
    this.api.put<any>(`/admin/users/${user.id}/status`, { activo: !user.activo }).subscribe(res => user.activo = res.data.activo);
  }

  toggleMachinery(item: any): void {
    this.api.put<any>(`/admin/machinery/all/${item.id}/status`, { activo: !item.activo }).subscribe(res => item.activo = res.data.activo);
  }
}
