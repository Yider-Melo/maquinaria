import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Auth } from '../core/services/auth.service';
import { Api } from '../core/services/api.service';
import { SocketService } from '../core/services/socket.service';
import { watchRealtime } from '../shared/realtime';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Booking, Machinery, UnreadCount, PaginatedResponse } from '../core/models';

@Component({
  selector: 'app-dashboard', templateUrl: './dashboard.html', styleUrls: ['./dashboard.css'],
  standalone: false
})
export class Dashboard implements OnInit, OnDestroy {
  stats: any = {};
  loading = true;
  ownerMachines: Machinery[] = [];
  ownerRequests: Booking[] = [];
  ownerIncome = 0;
  private realtimeSub: Subscription | undefined;

  constructor(public auth: Auth, private api: Api, private router: Router, private cdr: ChangeDetectorRef, private socket: SocketService) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/machinery']);
      return;
    }
    if (this.auth.esTipo('admin')) {
      this.router.navigate(['/admin']);
      return;
    }
    this.loadStats();
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        return t.startsWith('booking.') || t.startsWith('payment.') || t.startsWith('machinery.');
      },
      () => this.loadStats()
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private loadStats(): void {
    const calls: import('rxjs').Observable<any>[] = [];
    
    if (this.auth.esTipo('propietario')) {
      calls.push(
        this.api.get<PaginatedResponse<Booking>>('/bookings/my-listings').pipe(
          catchError(() => of({ success: true, data: { data: [], total: 0, page: 1, size: 20 } }))
        )
      );
      calls.push(
        this.api.get<PaginatedResponse<Machinery>>('/machinery/owner').pipe(
          catchError(() => of({ success: true, data: { data: [], total: 0, page: 1, size: 20 } }))
        )
      );
    }
    
    if (this.auth.esTipo('arrendatario')) {
      calls.push(
        this.api.get<PaginatedResponse<Booking>>('/bookings/my-bookings').pipe(
          catchError(() => of({ success: true, data: { data: [], total: 0, page: 1, size: 20 } }))
        )
      );
    }

    if (this.auth.isLoggedIn()) {
      calls.push(
        this.api.get<UnreadCount>('/notifications/unread-count').pipe(
          catchError(() => of({ success: true, data: { no_leidas: 0 } }))
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
        
        if (this.auth.esTipo('propietario')) {
          let r = results[resultIndex]?.data;
          this.ownerRequests = Array.isArray(r) ? r : (r?.data || []);
          this.stats.misListados = this.ownerRequests.filter(b => ['pendiente', 'confirmada'].includes(b.estado)).length;
          this.ownerIncome = this.ownerRequests
            .filter(b => ['confirmada', 'en_curso', 'completada'].includes(b.estado))
            .reduce((sum, b) => sum + Number(b.precio_total || 0), 0);
          resultIndex++;
          
          r = results[resultIndex]?.data;
          this.ownerMachines = Array.isArray(r) ? r : (r?.data || []);
          resultIndex++;
        }
        
        if (this.auth.esTipo('arrendatario')) {
          const r = results[resultIndex]?.data;
          this.stats.misReservas = Array.isArray(r) ? r.length : (r?.data?.length || 0);
          resultIndex++;
        }
        
        const lastIdx = results.length - 1;
        if (this.auth.isLoggedIn()) {
          this.stats.noLeidas = results[lastIdx]?.data?.no_leidas || 0;
        }
        
        this.cdr.markForCheck();
      },
      error: () => {
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
