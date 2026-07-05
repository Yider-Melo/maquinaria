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
  ownerMachines: any[] = [];
  ownerRequests: any[] = [];
  ownerIncome = 0;

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
      calls.push(this.api.get<any>('/bookings/my-listings').toPromise().then((r: any) => {
        this.ownerRequests = r?.data?.data || [];
        this.stats.misListados = this.ownerRequests.length;
        this.ownerIncome = this.ownerRequests.filter((b: any) => ['confirmada', 'en_curso', 'completada'].includes(b.estado)).reduce((sum: number, b: any) => sum + Number(b.precio_total || 0), 0);
      }).catch(() => 0));
      calls.push(this.api.get<any>('/machinery/owner').toPromise().then((r: any) => this.ownerMachines = r?.data?.data || []).catch(() => 0));
    }
    if (this.auth.esTipo('arrendatario') || this.auth.esTipo('admin')) {
      calls.push(this.api.get<any>('/bookings/my-bookings').toPromise().then((r: any) => this.stats.misReservas = (r?.data?.data?.length) || 0).catch(() => 0));
    }
    if (this.auth.esTipo('admin')) {
      calls.push(this.api.get<any>('/search').toPromise().then((r: any) => this.stats.totalMaquinaria = (r?.data?.pagination?.total) || 0).catch(() => 0));
    }
    Promise.all(calls).then(() => {
      this.loading = false;
    });
  }

  get roleTitle(): string {
    if (this.auth.esTipo('admin')) return 'Centro de control administrativo';
    if (this.auth.esTipo('propietario')) return 'Panel de propietario';
    return 'Panel de arrendatario';
  }

  get roleDescription(): string {
    if (this.auth.esTipo('admin')) return 'Supervisa usuarios, maquinaria, reservas, pagos y reportes de operación.';
    if (this.auth.esTipo('propietario')) return 'Gestiona tus equipos publicados, solicitudes de reserva e ingresos pendientes.';
    return 'Encuentra maquinaria, revisa tus reservas activas y controla tus pagos.';
  }

  get pendingOwnerRequests(): number { return this.ownerRequests.filter(b => b.estado === 'pendiente').length; }

  get ownerAvailableMachines(): number { return this.ownerMachines.filter(m => m.disponible !== false).length; }
}
