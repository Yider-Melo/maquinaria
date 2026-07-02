import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../core/services/auth';
import { Api } from '../core/services/api';

@Component({
  selector: 'app-dashboard', templateUrl: './dashboard.html', styleUrls: ['./dashboard.css'],
  standalone: false
})
export class Dashboard implements OnInit {
  stats: any = {};
  loading = true;

  constructor(public auth: Auth, private api: Api, private router: Router) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/machinery']);
      return;
    }
    this.loadStats();
  }

  private loadStats(): void {
    const calls: Promise<any>[] = [];
    if (this.auth.esTipo('propietario') || this.auth.esTipo('admin')) {
      calls.push(this.api.get<any>('/bookings/my-listings').toPromise().then((r: any) => this.stats.misListados = (r?.data?.data?.length) || 0).catch(() => 0));
    }
    if (this.auth.esTipo('arrendatario') || this.auth.esTipo('admin')) {
      calls.push(this.api.get<any>('/bookings/my-bookings').toPromise().then((r: any) => this.stats.misReservas = (r?.data?.data?.length) || 0).catch(() => 0));
    }
    calls.push(this.api.get<any>('/search').toPromise().then((r: any) => this.stats.totalMaquinaria = (r?.data?.pagination?.total) || 0).catch(() => 0));
    calls.push(this.api.get<any>('/notifications').toPromise().then((r: any) => {
      const notifs = r?.data?.data || [];
      this.stats.noLeidas = notifs.filter((n: any) => !n.leida).length;
    }).catch(() => 0));
    Promise.all(calls).then(() => this.loading = false);
  }
}
