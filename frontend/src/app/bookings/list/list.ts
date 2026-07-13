// Componente que lista las reservas del usuario, tanto las que hizo
// como arrendatario como las que recibió como propietario. Permite
// cancelar, confirmar, rechazar o completar reservas según el estado.
import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';
import { forkJoin, of, timeout } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { formatDate, formatId, estadoLabel } from '../../shared/utils';

@Component({
  standalone: false,
  selector: 'app-bookings-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class BookingsList implements OnInit {
  asArrendatario: any[] = []; asPropietario: any[] = []; loading = true;
  error = '';
  tabIndex = 0;
  payingBookingId: string | null = null;

  constructor(private api: Api, public auth: Auth, private dialog: MatDialog, private snackBar: MatSnackBar, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void { this.loadBookings(true); }

  private loadBookings(showLoading = false): void {
    if (showLoading) this.loading = true;
    this.error = '';
    this.asArrendatario = [];
    this.asPropietario = [];
    this.tabIndex = this.auth.esTipo('propietario') ? 1 : 0;

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
        const asArrendatario = results[0]?.data?.data || [];
        const asPropietario = calls.length > 1 ? results[1]?.data?.data || [] : [];
        this.enrichBookingsWithMachinery(asArrendatario, asPropietario);
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.error = 'No se pudieron cargar las reservas.';
      }
    });
  }

  private enrichBookingsWithMachinery(arrendatario: any[], propietario: any[]): void {
    const uniqueIds = [...new Set([...arrendatario, ...propietario]
      .map((booking: any) => booking?.maquinaria_id)
      .filter((id: string | undefined): id is string => !!id))];

    if (uniqueIds.length === 0) {
      this.asArrendatario = arrendatario.map((booking: any) => this.attachMachineDetails(booking, null));
      this.asPropietario = propietario.map((booking: any) => this.attachMachineDetails(booking, null));
      this.cdr.markForCheck();
      return;
    }

    forkJoin(uniqueIds.map((id: string) => this.api.get<any>(`/machinery/${id}`).pipe(catchError(() => of({ data: null }))))).subscribe({
      next: (results: any[]) => {
        const machinesById = new Map<string, any>();
        uniqueIds.forEach((id: string, index: number) => {
          const machine = results[index]?.data;
          if (machine) machinesById.set(id, machine);
        });

        this.asArrendatario = arrendatario.map((booking: any) => this.attachMachineDetails(booking, machinesById.get(booking.maquinaria_id)));
        this.asPropietario = propietario.map((booking: any) => this.attachMachineDetails(booking, machinesById.get(booking.maquinaria_id)));
        this.cdr.markForCheck();
      },
      error: () => {
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
    this.confirmAction('¿Estás seguro de cancelar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.put(`/bookings/${id}/cancel`, { motivo: 'Cancelado por el usuario' }).subscribe(() => this.loadBookings());
    });
  }
  confirmBooking(id: string): void {
    this.confirmAction('¿Confirmar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.put(`/bookings/${id}/confirm`, {}).subscribe(() => this.loadBookings());
    });
  }
  rejectBooking(id: string): void {
    this.confirmAction('¿Rechazar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.put(`/bookings/${id}/reject`, {}).subscribe(() => this.loadBookings());
    });
  }
  completeBooking(id: string): void {
    this.confirmAction('¿Marcar esta reserva como completada?').subscribe(confirmed => {
      if (confirmed) this.api.put(`/bookings/${id}/complete`, {}).subscribe(() => this.loadBookings());
    });
  }

  payBooking(booking: any): void {
    this.confirmAction('¿Procesar pago de esta reserva?').subscribe(confirmed => {
      if (!confirmed) return;
      this.payingBookingId = booking.id;
      this.api.post<any>('/payments/checkout', { reserva_id: booking.id, metodo_pago: 'simulado' }).pipe(
        finalize(() => this.payingBookingId = null)
      ).subscribe({
        next: (res) => {
          const paymentId = res.data?.pago_id;
          if (!paymentId) return;
          this.api.post(`/payments/${paymentId}/simulate-approval`, {}).subscribe(() => {
            this.snackBar.open('Pago simulado aprobado. Fondos retenidos hasta completar la reserva.', 'Cerrar', { duration: 4000 });
          });
        },
        error: (err) => this.snackBar.open(err.error?.error?.message || 'No se pudo iniciar el pago.', 'Cerrar', { duration: 4000 })
      });
    });
  }
}

@Component({
  selector: 'app-confirm-action-dialog',
  template: `
    <h2 mat-dialog-title>Confirmar</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Aceptar</button>
    </mat-dialog-actions>
  `,
  standalone: false
})
export class ConfirmActionDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { message: string }) {}
}
