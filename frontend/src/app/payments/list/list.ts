// Componente que lista los pagos del usuario. Obtiene primero las
// reservas del usuario y luego consulta los pagos asociados a cada una,
// combinando los resultados en un solo arreglo.
import { Component, OnInit } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Api } from '../../core/services/api';

@Component({
  standalone: false,
  selector: 'app-payments-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class PaymentsList implements OnInit {
  payments: any[] = []; loading = true;

  constructor(private api: Api) {}

  // Obtiene los IDs de las reservas del usuario y luego consulta
  // los pagos de cada una en paralelo, filtrando respuestas nulas.
  ngOnInit(): void {
    this.api.get<any>('/bookings/my-bookings').pipe(
      map((res: any) => (res.data?.data || []).map((b: any) => b.id)),
      map((ids: string[]) => {
        if (ids.length === 0) return of([]);
        return forkJoin(ids.map(id =>
          this.api.get<any>(`/payments/booking/${id}`).pipe(
            catchError(() => of(null))
          )
        ));
      })
    ).subscribe((obs: any) => {
      if (obs instanceof Array) {
        this.payments = [];
        this.loading = false;
        return;
      }
      obs.subscribe((results: any[]) => {
        this.payments = results.filter(r => r?.data).flatMap(r => r.data);
        this.loading = false;
      });
    });
  }
}
