// Componente que lista los pagos del usuario. Obtiene primero las
// reservas del usuario y luego consulta los pagos asociados a cada una,
// combinando los resultados en un solo arreglo.
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap, finalize } from 'rxjs/operators';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';
import { formatDate, formatId, estadoLabel } from '../../shared/utils';

@Component({
  standalone: false,
  selector: 'app-payments-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class PaymentsList implements OnInit {
  payments: any[] = []; loading = true; error = '';

  constructor(private api: Api, public auth: Auth, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loading = true; this.error = '';
    const bookingsRequest = this.auth.esTipo('propietario')
      ? this.api.get<any>('/bookings/my-listings')
      : this.api.get<any>('/bookings/my-bookings');

    bookingsRequest.pipe(
      map((res: any) => res.data?.data || []),
      switchMap((bookings: any[]) => {
        if (bookings.length === 0) return of([]);

        const paymentRequests = bookings.map((booking: any) =>
          forkJoin({
            paymentResponse: this.api.get<any>(`/payments/booking/${booking.id}`).pipe(catchError(() => of({ data: [] }))),
            machineryResponse: booking.maquinaria_id
              ? this.api.get<any>(`/machinery/${booking.maquinaria_id}`).pipe(catchError(() => of({ data: null })))
              : of({ data: null })
          }).pipe(
            map(({ paymentResponse, machineryResponse }) => {
              const payments = Array.isArray(paymentResponse?.data) ? paymentResponse.data : [];
              return payments.map((payment: any) => this.attachBookingDetails(payment, booking, machineryResponse?.data));
            })
          )
        );

        return forkJoin(paymentRequests).pipe(map((groups: any[]) => groups.flat()));
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (payments: any[]) => {
        this.payments = payments;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar los pagos.';
        this.payments = [];
        this.cdr.markForCheck();
      }
    });
  }

  private attachBookingDetails(payment: any, booking: any, machine: any): any {
    return {
      ...payment,
      booking,
      maquinaria_titulo: booking?.maquinaria_titulo || machine?.titulo || `Maquinaria #${booking?.maquinaria_id?.substring(0, 8) || 'sin asignar'}`,
      maquinaria_precio: booking?.precio_total ?? machine?.precio_por_dia ?? machine?.precio_por_hora
    };
  }

  formatDate = formatDate;
  formatId = formatId;
  estadoLabel = estadoLabel;

  getBookingDateLabel(booking: any): string {
    if (!booking?.fecha_inicio && !booking?.fecha_fin) return 'Sin fecha';
    if (!booking?.fecha_fin) return formatDate(booking.fecha_inicio);
    return `${formatDate(booking.fecha_inicio)} → ${formatDate(booking.fecha_fin)}`;
  }

  getBookingTimeLabel(booking: any): string {
    if (booking?.modalidad === 'hora') {
      const hours = Number(booking?.cantidad_horas || 1);
      return `Duración: ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return booking?.fecha_inicio && booking?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }
}
