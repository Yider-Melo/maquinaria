import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';
import { formatDate, formatId, formatDateTime, estadoLabel } from '../../shared/utils';

@Component({
  standalone: false,
  selector: 'app-payments-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class PaymentsList implements OnInit {
  payments: any[] = []; loading = true; error = '';

  constructor(private api: Api, public auth: Auth, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loading = true; this.error = '';
    this.api.get<any>('/payments/my-payments').subscribe({
      next: (res) => {
        const pagos = res?.data || [];
        if (pagos.length === 0) {
          this.payments = [];
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.enrichPayments(pagos);
      },
      error: () => {
        this.error = 'No se pudieron cargar los pagos.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private enrichPayments(pagos: any[]): void {
    const bookingIds = [...new Set(pagos.map(p => p.reserva_id))];
    const machineryIds = [...new Set(pagos.filter(p => p.reserva_id).map(p => p.reserva_id))];

    forkJoin({
      bookings: forkJoin(bookingIds.map(id =>
        this.api.get<any>(`/bookings/${id}`).pipe(catchError(() => of({ data: null })))
      )),
    }).subscribe({
      next: ({ bookings }) => {
        const bookingsById = new Map<string, any>();
        bookingIds.forEach((id, i) => {
          const b = bookings[i]?.data;
          if (b) bookingsById.set(id, b);
        });

        const machineryIds2 = [...new Set(pagos.map(p => bookingsById.get(p.reserva_id)?.maquinaria_id).filter(Boolean))];
        forkJoin(machineryIds2.map(id =>
          this.api.get<any>(`/machinery/${id}`).pipe(catchError(() => of({ data: null })))
        )).subscribe({
          next: (machines) => {
            const machinesById = new Map<string, any>();
            machineryIds2.forEach((id, i) => {
              const m = machines[i]?.data;
              if (m) machinesById.set(id, m);
            });

            this.payments = pagos.map(p => {
              const booking = bookingsById.get(p.reserva_id);
              const machine = booking ? machinesById.get(booking.maquinaria_id) : null;
              return {
                ...p,
                booking,
                maquinaria_titulo: booking?.maquinaria_titulo || machine?.titulo || `Maquinaria #${p.reserva_id?.substring(0, 8) || ''}`,
                maquinaria_precio: p.monto
              };
            });
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.payments = pagos.map(p => ({ ...p, booking: null }));
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  estadoLabel = estadoLabel;

  getBookingDateLabel(booking: any): string {
    if (!booking?.fecha_inicio && !booking?.fecha_fin) return 'Sin fecha';
    if (!booking?.fecha_fin) return formatDate(booking.fecha_inicio);
    return `${formatDate(booking.fecha_inicio)} → ${formatDate(booking.fecha_fin)}`;
  }
}
