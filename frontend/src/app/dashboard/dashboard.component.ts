import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../core/services/auth.service';
import { Api } from '../core/services/api.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

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

  constructor(public auth: Auth, private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/machinery']);
      return;
    }
    this.loadStats();
  }

  private loadStats(): void {
    const calls: any[] = [];
    
    if (this.auth.esTipo('propietario') || this.auth.esTipo('admin')) {
      calls.push(
        this.api.get<any>('/bookings/my-listings').pipe(
          catchError(() => of({ data: { data: [] } }))
        )
      );
      calls.push(
        this.api.get<any>('/machinery/owner').pipe(
          catchError(() => of({ data: { data: [] } }))
        )
      );
    }
    
    if (this.auth.esTipo('arrendatario') || this.auth.esTipo('admin')) {
      calls.push(
        this.api.get<any>('/bookings/my-bookings').pipe(
          catchError(() => of({ data: { data: [] } }))
        )
      );
    }
    
    if (this.auth.esTipo('admin')) {
      calls.push(
        this.api.get<any>('/search').pipe(
          catchError(() => of({ data: { pagination: { total: 0 } } }))
        )
      );
    }
    
    if (calls.length === 0) {
      this.loading = false;
      return;
    }

    forkJoin(calls).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (results: any[]) => {
        let resultIndex = 0;
        
        if (this.auth.esTipo('propietario') || this.auth.esTipo('admin')) {
          this.ownerRequests = results[resultIndex]?.data?.data || [];
          this.stats.misListados = this.ownerRequests.filter((b: any) => ['pendiente', 'confirmada'].includes(b.estado)).length;
          this.ownerIncome = this.ownerRequests
            .filter((b: any) => ['confirmada', 'en_curso', 'completada'].includes(b.estado))
            .reduce((sum: number, b: any) => sum + Number(b.precio_total || 0), 0);
          resultIndex++;
          
          this.ownerMachines = results[resultIndex]?.data?.data || [];
          resultIndex++;
        }
        
        if (this.auth.esTipo('arrendatario') || this.auth.esTipo('admin')) {
          this.stats.misReservas = (results[resultIndex]?.data?.data?.length) || 0;
          resultIndex++;
        }
        
        if (this.auth.esTipo('admin')) {
          this.stats.totalMaquinaria = (results[resultIndex]?.data?.pagination?.total) || 0;
        }
        
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.cdr.markForCheck();
      }
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
