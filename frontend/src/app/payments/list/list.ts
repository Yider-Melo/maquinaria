// Componente que lista los pagos del usuario. Obtiene primero las
// reservas del usuario y luego consulta los pagos asociados a cada una,
// combinando los resultados en un solo arreglo.
import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-payments-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class PaymentsList implements OnInit {
  payments: any[] = []; loading = true; error = '';

  constructor(private api: Api, public auth: Auth) {}

  ngOnInit(): void {
    this.loading = true; this.error = '';
    const bookingsRequest = this.auth.esTipo('propietario')
      ? this.api.get<any>('/bookings/my-listings')
      : this.api.get<any>('/bookings/my-bookings');

    bookingsRequest.pipe(
      map((res: any) => (res.data?.data || []).map((b: any) => b.id)),
      switchMap((ids: string[]) => {
        if (ids.length === 0) return of([]);
        return forkJoin(ids.map(id =>
          this.api.get<any>(`/payments/booking/${id}`).pipe(
            catchError(() => of(null))
          )
        ));
      })
    ).subscribe({
      next: (results: any[]) => {
        this.payments = results.filter(r => r?.data).flatMap(r => r.data);
        this.loading = false;
      },
      error: () => { this.error = 'No se pudieron cargar los pagos.'; this.loading = false; }
    });
  }
}
