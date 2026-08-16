import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Api } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { watchRealtime } from '../../shared/realtime';
import { formatDate, formatDateTime, formatId, estadoLabel } from '../../shared/utils';
import { Payment, Booking, Machinery, ApiResponse } from '../../core/models';

@Component({
  standalone: false,
  selector: 'app-payments-detail', templateUrl: './detail.html', styleUrls: ['./detail.css']
})
export class PaymentsDetail implements OnInit, OnDestroy {
  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  estadoLabel = estadoLabel;
  payment: any = null; loading = true; error = '';
  private realtimeSub: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private api: Api,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private socket: SocketService
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
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        if (t.startsWith('payment.')) return true;
        if (t.startsWith('booking.')) {
          const ref = String(ev?.referencia_id || '');
          return !ref || ref === this.payment?.reserva_id;
        }
        return false;
      },
      () => { if (this.payment?.id) this.loadPayment(this.payment.id); }
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private loadPayment(id: string): void {
    this.api.get<any>(`/payments/${id}`).subscribe({
      next: (res) => {
        if (!res?.data) {
          this.error = 'No se pudo cargar el pago.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.payment = res.data;

        if (this.payment?.reserva_id) {
          forkJoin({
            booking: this.api.get<any>(`/bookings/${this.payment.reserva_id}`).pipe(catchError(() => of({ data: null })))
          }).subscribe({
            next: ({ booking }) => {
              const b = booking?.data;
              if (b) {
                this.payment.fecha_inicio = b.fecha_inicio;
                this.payment.fecha_fin = b.fecha_fin;
                this.payment.modalidad = b.modalidad;
                this.payment.maquinaria_id = this.payment.maquinaria_id || b.maquinaria_id;
              }
              const machineryId = this.payment.maquinaria_id;
              if (machineryId) {
                this.api.get<any>(`/machinery/${machineryId}`).pipe(catchError(() => of({ data: null }))).subscribe({
                  next: (machinery) => {
                    const m = machinery?.data;
                    this.payment.maquinaria_titulo = m?.titulo || `Maquinaria #${machineryId.substring(0, 8)}`;
                    this.payment.maquinaria_precio = m?.precio_por_dia;
                    this.loading = false;
                    this.cdr.markForCheck();
                  }
                });
              } else {
                this.payment.maquinaria_titulo = `Maquinaria #${(this.payment.reserva_id || '').substring(0, 8)}`;
                this.loading = false;
                this.cdr.markForCheck();
              }
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
    return this.payment?.fecha_inicio && this.payment?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }
}
