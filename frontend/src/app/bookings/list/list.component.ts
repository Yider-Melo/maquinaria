// Componente que lista las reservas del usuario, tanto las que hizo
// como arrendatario como las que recibió como propietario. Permite
// cancelar, confirmar, rechazar o completar reservas según el estado.
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';
import { forkJoin, of, timeout, Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { formatDate, formatId, estadoLabel } from '../../shared/utils';
import { Booking, Machinery, Payment, PaymentCheckout, PaginatedResponse, ApiResponse } from '../../core/models';

@Component({
  standalone: true,
  selector: 'app-cancel-dialog',
  template: `
    <h2 mat-dialog-title>Cancelar reserva</h2>
    <mat-dialog-content>
      <p>¿Estás seguro de cancelar esta reserva? Si ya realizaste el pago, el reembolso se procesará según la política de cancelación.</p>
      <mat-form-field appearance="outline" style="width:100%;margin-top:12px;">
        <mat-label>Motivo de cancelación (opcional)</mat-label>
        <input matInput [(ngModel)]="motivo" placeholder="Ej: Cambié de planes, encontré mejor precio, etc.">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Volver</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="{ motivo: motivo || 'Cancelado por el usuario' }">Sí, cancelar reserva</button>
    </mat-dialog-actions>
  `,
  imports: [MatDialogModule, MatButtonModule, MatInputModule, FormsModule]
})
export class CancelDialog {
  motivo = '';
  constructor(
    public dialogRef: MatDialogRef<CancelDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}

@Component({
  standalone: false,
  selector: 'app-bookings-list', templateUrl: './list.html', styleUrls: ['./list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingsList implements OnInit {
  asArrendatario: Booking[] = []; asPropietario: Booking[] = []; loading = true;
  error = '';
  tabIndex = 0;
  payingBookingId: string | null = null;

  trackById(_index: number, item: Booking): string { return item?.id || String(_index); }

  constructor(private api: Api, public auth: Auth, private dialog: MatDialog, private snackBar: MatSnackBar, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void { this.loadBookings(true); }

  private loadBookings(showLoading = false): void {
    if (showLoading) this.loading = true;
    this.error = '';

    const calls: Observable<ApiResponse<PaginatedResponse<Booking>>>[] = [
      this.api.get<PaginatedResponse<Booking>>('/bookings/my-bookings').pipe(
        catchError(() => of({ success: true, data: { data: [], total: 0, page: 1, size: 20 } }))
      )
    ];

    if (this.auth.esTipo('propietario') || this.auth.esTipo('admin')) {
      calls.push(
        this.api.get<PaginatedResponse<Booking>>('/bookings/my-listings').pipe(
          catchError(() => of({ success: true, data: { data: [], total: 0, page: 1, size: 20 } }))
        )
      );
    }

    forkJoin(calls).pipe(
      timeout(10000),
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (results) => {
        const r0 = results[0]?.data;
        const asArrendatario: Booking[] = Array.isArray(r0) ? r0 : (r0?.data || []);
        const r1 = results[1]?.data;
        const asPropietario: Booking[] = calls.length > 1 ? (Array.isArray(r1) ? r1 : (r1?.data || [])) : [];
        this.asArrendatario = asArrendatario.map((b) => this.attachMachineDetails(b, null));
        this.asPropietario = asPropietario.map((b) => this.attachMachineDetails(b, null));
        this.cdr.markForCheck();
        this.enrichBookingsWithMachinery(asArrendatario, asPropietario);
      },
      error: () => {
        this.error = 'No se pudieron cargar las reservas.';
        this.cdr.markForCheck();
      }
    });
  }

  private enrichBookingsWithMachinery(arrendatario: Booking[], propietario: Booking[]): void {
    const uniqueIds = [...new Set([...arrendatario, ...propietario]
      .map((booking) => booking?.maquinaria_id)
      .filter((id): id is string => !!id))];

    if (uniqueIds.length === 0) {
      this.asArrendatario = arrendatario.map((booking) => this.attachMachineDetails(booking, null));
      this.asPropietario = propietario.map((booking) => this.attachMachineDetails(booking, null));
      this.cdr.markForCheck();
      return;
    }

    forkJoin(uniqueIds.map((id) => this.api.get<Machinery>(`/machinery/${id}`).pipe(catchError(() => of({ success: true, data: null! }))))).subscribe({
      next: (results) => {
        const machinesById = new Map<string, Machinery>();
        uniqueIds.forEach((id, index) => {
          const machine = results[index]?.data;
          if (machine) machinesById.set(id, machine);
        });

        this.asArrendatario = arrendatario.map((booking) => this.attachMachineDetails(booking, machinesById.get(booking.maquinaria_id) || null));
        this.asPropietario = propietario.map((booking) => this.attachMachineDetails(booking, machinesById.get(booking.maquinaria_id) || null));
        this.cdr.markForCheck();
      },
      error: () => {
        this.asArrendatario = arrendatario.map((booking) => this.attachMachineDetails(booking, null));
        this.asPropietario = propietario.map((booking) => this.attachMachineDetails(booking, null));
        this.cdr.markForCheck();
      }
    });
  }

  private attachMachineDetails(booking: Booking, machine: Machinery | null): Booking {
    const price = booking?.precio_total ?? booking?.precio_unitario ?? machine?.precio_por_dia;
    return {
      ...booking,
      maquinaria_titulo: booking?.maquinaria_titulo || machine?.titulo || `Maquinaria #${booking?.maquinaria_id?.substring(0, 8) || 'sin asignar'}`,
      maquinaria_precio: price,
    };
  }

  formatDate = formatDate;
  formatId = formatId;
  estadoLabel = estadoLabel;

  getBookingDateLabel(booking: Booking): string {
    if (!booking?.fecha_inicio && !booking?.fecha_fin) return 'Sin fecha';
    if (!booking?.fecha_fin) return formatDate(booking.fecha_inicio);
    return `${formatDate(booking.fecha_inicio)} → ${formatDate(booking.fecha_fin)}`;
  }

  getBookingTimeLabel(_booking: Booking): string {
    return _booking?.fecha_inicio && _booking?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }

  openBookingDetail(booking: Booking): void {
    if (!booking?.id) return;
    this.router.navigate(['/bookings', booking.id]);
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }

  cancelBooking(id: string): void {
    const dialogRef = this.dialog.open(CancelDialog);
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.api.post<Booking>(`/bookings/${id}/cancel`, { motivo: (result as any).motivo }).subscribe({
        next: () => {
          this.snackBar.open('Reserva cancelada correctamente', 'Cerrar', { duration: 3000 });
          this.loadBookings();
        },
        error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al cancelar', 'Cerrar', { duration: 4000 })
      });
    });
  }
  confirmBooking(id: string): void {
    this.confirmAction('¿Confirmar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.post<Booking>(`/bookings/${id}/confirm`, {}).subscribe({
        next: () => { this.snackBar.open('Reserva confirmada correctamente', 'Cerrar', { duration: 3000 }); this.loadBookings(); },
        error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al confirmar', 'Cerrar', { duration: 4000 })
      });
    });
  }
  rejectBooking(id: string): void {
    this.confirmAction('¿Rechazar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.post<Booking>(`/bookings/${id}/reject`, {}).subscribe({
        next: () => { this.snackBar.open('Reserva rechazada', 'Cerrar', { duration: 3000 }); this.loadBookings(); },
        error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al rechazar', 'Cerrar', { duration: 4000 })
      });
    });
  }
  completeBooking(id: string): void {
    this.confirmAction('¿Marcar esta reserva como completada?').subscribe(confirmed => {
      if (confirmed) this.api.post<Booking>(`/bookings/${id}/complete`, {}).subscribe({
        next: () => { this.snackBar.open('Reserva completada correctamente', 'Cerrar', { duration: 3000 }); this.loadBookings(); },
        error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al completar la reserva', 'Cerrar', { duration: 4000 })
      });
    });
  }

  payBooking(booking: Booking): void {
    this.payingBookingId = booking.id;
    this.api.post<PaymentCheckout>('/payments/checkout', { reserva_id: booking.id }).pipe(
      finalize(() => this.payingBookingId = null)
    ).subscribe({
      next: (res) => {
        const data = res.data;
        if (data?.wompi?.public_key) {
          this.openWompiCheckout(data, booking);
        } else if (data?.checkout_url) {
          window.location.href = data.checkout_url;
        } else if (data?.pago_id) {
          this.api.post<Payment>(`/payments/${data.pago_id}/simulate-approval`, {}).subscribe({
            next: () => {
              this.snackBar.open('Pago aprobado', 'Cerrar', { duration: 6000 });
              this.loadBookings();
            },
            error: () => {
              this.snackBar.open('Error al aprobar el pago', 'Cerrar', { duration: 6000 });
            }
          });
        }
      },
      error: (err) => {
        this.snackBar.open(err.error?.error?.message || 'No se pudo iniciar el pago.', 'Cerrar', { duration: 4000 });
      }
    });
  }

  private openWompiCheckout(data: any, booking: Booking): void {
    const script = document.createElement('script');
    script.src = 'https://checkout.wompi.co/widget.js';
    script.onload = () => {
      const wompi = (window as any).Wompi;
      if (!wompi) {
        this.snackBar.open('Error al cargar Wompi Checkout', 'Cerrar', { duration: 5000 });
        return;
      }
      wompi.checkout({
        data: {
          reference: data.wompi.reference,
          amount_in_cents: data.wompi.amount_in_cents,
          currency: data.wompi.currency,
          signature: data.wompi.signature,
          customer_email: booking.arrendatario_email || '',
          acceptance_token: data.wompi.acceptance_token,
          redirect_url: window.location.origin + '/bookings/' + booking.id,
        },
        public_key: data.wompi.public_key,
        onSuccess: () => {
          this.snackBar.open('Pago exitoso', 'Cerrar', { duration: 5000 });
          this.loadBookings();
        },
        onError: (err: any) => {
          this.snackBar.open('Error en el pago: ' + (err?.message || 'Desconocido'), 'Cerrar', { duration: 5000 });
        },
        onClose: () => {
          this.loadBookings();
        }
      });
    };
    document.body.appendChild(script);
  }
}
