import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Api } from '../../core/services/api';
import { formatDate, formatDateTime, formatId, estadoLabel } from '../../shared/utils';

@Component({
  standalone: false,
  selector: 'app-payments-detail', templateUrl: './detail.html', styleUrls: ['./detail.css']
})
export class PaymentsDetail implements OnInit {
  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  estadoLabel = estadoLabel;
  payment: any = null; loading = true; error = '';

  constructor(
    private route: ActivatedRoute,
    private api: Api,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Pago no encontrado.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    this.loadPayment(id);
  }

  private loadPayment(id: string): void {
    this.api.get<any>(`/payments/${id}`).subscribe({
      next: (res: any) => {
        if (!res?.data) {
          this.error = 'No se pudo cargar el pago.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.payment = res.data;

        if (this.payment?.reserva_id) {
          forkJoin({
            booking: this.api.get<any>(`/bookings/${this.payment.reserva_id}`).pipe(catchError(() => of({ data: null }))),
            machinery: this.payment.maquinaria_id
              ? this.api.get<any>(`/machinery/${this.payment.maquinaria_id}`).pipe(catchError(() => of({ data: null })))
              : of({ data: null })
          }).subscribe({
            next: ({ booking, machinery }) => {
              const b = booking?.data;
              const m = machinery?.data;
              if (b) {
                this.payment.booking = b;
                this.payment.fecha_inicio = b.fecha_inicio;
                this.payment.fecha_fin = b.fecha_fin;
                this.payment.modalidad = b.modalidad;
                this.payment.propietario_id = b.propietario_id;
                this.payment.arrendatario_id = b.arrendatario_id;
              }
              this.payment.maquinaria_titulo = m?.titulo || `Maquinaria #${(this.payment.maquinaria_id || '').substring(0, 8)}`;
              this.payment.maquinaria_precio = m?.precio_por_dia ?? m?.precio_por_hora;
              this.loading = false;
              this.cdr.markForCheck();
            }
          });
        } else {
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.error = 'No se pudo cargar el pago.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getBookingDateLabel(): string {
    if (!this.payment?.fecha_inicio && !this.payment?.fecha_fin) return 'Sin fecha';
    if (!this.payment?.fecha_fin) return formatDate(this.payment.fecha_inicio);
    return `${formatDate(this.payment.fecha_inicio)} → ${formatDate(this.payment.fecha_fin)}`;
  }

  getBookingTimeLabel(): string {
    if (this.payment?.modalidad === 'hora') {
      const hours = Number(this.payment?.cantidad_horas || 1);
      return `Duración: ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return this.payment?.fecha_inicio && this.payment?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }
}
