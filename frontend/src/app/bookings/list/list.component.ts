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
import { forkJoin, of, timeout } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { formatDate, formatId, estadoLabel } from '../../shared/utils';

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
  asArrendatario: any[] = []; asPropietario: any[] = []; loading = true;
  error = '';
  tabIndex = 0;
  payingBookingId: string | null = null;

  trackById(_index: number, item: any): string { return item?.id || _index; }

  constructor(private api: Api, public auth: Auth, private dialog: MatDialog, private snackBar: MatSnackBar, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void { this.loadBookings(true); }

  private loadBookings(showLoading = false): void {
    if (showLoading) this.loading = true;
    this.error = '';

    const calls: any[] = [
      this.api.get<any>('/bookings/my-bookings').pipe(
        catchError((err) => {
          console.error('Error loading my-bookings:', err);
          return of({ data: { data: [] } });
        })
      )
    ];

    if (this.auth.esTipo('propietario') || this.auth.esTipo('admin')) {
      calls.push(
        this.api.get<any>('/bookings/my-listings').pipe(
          catchError((err) => {
            console.error('Error loading my-listings:', err);
            return of({ data: { data: [] } });
          })
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
      next: (results: any[]) => {
        const r0 = results[0]?.data;
        const asArrendatario = Array.isArray(r0) ? r0 : (r0?.data || []);
        const r1 = results[1]?.data;
        const asPropietario = calls.length > 1 ? (Array.isArray(r1) ? r1 : (r1?.data || [])) : [];
        this.asArrendatario = asArrendatario.map((b: any) => this.attachMachineDetails(b, null));
        this.asPropietario = asPropietario.map((b: any) => this.attachMachineDetails(b, null));
        this.cdr.markForCheck();
        this.enrichBookingsWithMachinery(asArrendatario, asPropietario);
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.error = 'No se pudieron cargar las reservas.';
        this.cdr.markForCheck();
      }
    });
  }

  private enrichBookingsWithMachinery(arrendatario: any[], propietario: any[]): void {
    const uniqueIds = [...new Set([...arrendatario, ...propietario]
      .map((booking: any) => booking?.maquinaria_id)
      .filter((id: string | undefined): id is string => !!id))];

    if (uniqueIds.length === 0) {
        console.log('No machinery IDs, showing raw bookings:', arrendatario.length, propietario.length);
      this.asArrendatario = arrendatario.map((booking: any) => this.attachMachineDetails(booking, null));
      this.asPropietario = propietario.map((booking: any) => this.attachMachineDetails(booking, null));
      this.cdr.markForCheck();
      return;
    }

    console.log('Fetching machinery for bookings:', uniqueIds.length, 'machines');
    forkJoin(uniqueIds.map((id: string) => this.api.get<any>(`/machinery/${id}`).pipe(catchError(() => of({ data: null }))))).subscribe({
      next: (results: any[]) => {
        console.log('Machinery data received:', results.length);
        const machinesById = new Map<string, any>();
        uniqueIds.forEach((id: string, index: number) => {
          const machine = results[index]?.data;
          if (machine) machinesById.set(id, machine);
        });

        this.asArrendatario = arrendatario.map((booking: any) => this.attachMachineDetails(booking, machinesById.get(booking.maquinaria_id)));
        this.asPropietario = propietario.map((booking: any) => this.attachMachineDetails(booking, machinesById.get(booking.maquinaria_id)));
        console.log('asArrendatario length:', this.asArrendatario.length);
        this.cdr.markForCheck();
      },
      error: () => {
        console.log('Error fetching machinery, showing raw bookings');
        this.asArrendatario = arrendatario.map((booking: any) => this.attachMachineDetails(booking, null));
        this.asPropietario = propietario.map((booking: any) => this.attachMachineDetails(booking, null));
        this.cdr.markForCheck();
      }
    });
  }

  private attachMachineDetails(booking: any, machine: any): any {
    const price = booking?.precio_total ?? booking?.precio_unitario ?? machine?.precio_por_dia ?? machine?.precio_por_hora;
    return {
      ...booking,
      maquinaria_titulo: booking?.maquinaria_titulo || machine?.titulo || `Maquinaria #${booking?.maquinaria_id?.substring(0, 8) || 'sin asignar'}`,
      maquinaria_precio: price,
      modalidad_label: booking?.modalidad === 'hora' ? 'Por hora' : 'Por día'
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

  openBookingDetail(booking: any): void {
    if (!booking?.id) return;
    this.router.navigate(['/bookings', booking.id]);
  }

  private confirmAction(msg: string): import('rxjs').Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }

  cancelBooking(id: string): void {
    const dialogRef = this.dialog.open(CancelDialog);
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.api.post(`/bookings/${id}/cancel`, { motivo: result.motivo }).subscribe({
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
      if (confirmed) this.api.post(`/bookings/${id}/confirm`, {}).subscribe({
        next: () => { this.snackBar.open('Reserva confirmada correctamente', 'Cerrar', { duration: 3000 }); this.loadBookings(); },
        error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al confirmar', 'Cerrar', { duration: 4000 })
      });
    });
  }
  rejectBooking(id: string): void {
    this.confirmAction('¿Rechazar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.post(`/bookings/${id}/reject`, {}).subscribe({
        next: () => { this.snackBar.open('Reserva rechazada', 'Cerrar', { duration: 3000 }); this.loadBookings(); },
        error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al rechazar', 'Cerrar', { duration: 4000 })
      });
    });
  }
  cobrarBooking(booking: any): void {
    this.confirmAction('¿Liberar fondos de esta reserva? (Demo - simulación de cobro)').subscribe(confirmed => {
      if (!confirmed) return;
      this.payingBookingId = booking.id;
      this.api.get<any>(`/payments/booking/${booking.id}`).pipe(
        finalize(() => this.payingBookingId = null)
      ).subscribe({
        next: (res) => {
          const payments = res.data || [];
          const pending = payments.find((p: any) => p.estado === 'retenido');
          if (!pending) { this.snackBar.open('No hay pagos retenidos para liberar', 'Cerrar', { duration: 4000 }); return; }
          this.api.post(`/payments/${pending.id}/release`, {}).subscribe(() => {
            this.snackBar.open('Fondos liberados (demo). El pago se ha acreditado al propietario.', 'Cerrar', { duration: 5000 });
            this.loadBookings();
          });
        },
        error: (err: any) => this.snackBar.open(err.error?.error?.message || 'No se pudo procesar el cobro', 'Cerrar', { duration: 4000 })
      });
    });
  }

  completeBooking(id: string): void {
    this.confirmAction('¿Marcar esta reserva como completada?').subscribe(confirmed => {
      if (confirmed) this.api.post(`/bookings/${id}/complete`, {}).subscribe({
        next: () => { this.snackBar.open('Reserva completada correctamente', 'Cerrar', { duration: 3000 }); this.loadBookings(); },
        error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al completar la reserva', 'Cerrar', { duration: 4000 })
      });
    });
  }

  payBooking(booking: any): void {
    this.confirmAction('¿Procesar pago de esta reserva? (Demo - no se realizará un cobro real)').subscribe(confirmed => {
      if (!confirmed) return;
      this.payingBookingId = booking.id;
      this.api.post<any>('/payments/checkout', { reserva_id: booking.id, metodo_pago: 'simulado' }).pipe(
        finalize(() => this.payingBookingId = null)
      ).subscribe({
        next: (res) => {
          const paymentId = res.data?.pago_id;
          if (!paymentId) {
            console.error('payBooking: no paymentId in response', res);
            this.snackBar.open('Error: no se obtuvo ID de pago', 'Cerrar', { duration: 4000 });
            return;
          }
          this.api.post(`/payments/${paymentId}/simulate-approval`, {}).subscribe({
            next: () => {
              this.snackBar.open('✅ Pago de prueba aprobado.', 'Cerrar', { duration: 6000 });
              this.loadBookings();
            },
            error: (err2) => {
              console.error('simulate-approval failed', err2);
              this.snackBar.open('Error al aprobar el pago: ' + (err2.error?.error?.message || err2.message), 'Cerrar', { duration: 6000 });
            }
          });
        },
        error: (err) => {
          console.error('checkout failed', err);
          this.snackBar.open(err.error?.error?.message || 'No se pudo iniciar el pago.', 'Cerrar', { duration: 4000 });
        }
      });
    });
  }
}
