// Componente que lista las reservas del usuario, tanto las que hizo
// como arrendatario como las que recibió como propietario. Permite
// cancelar, confirmar, rechazar o completar reservas según el estado.
import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';
import { forkJoin, of, timeout } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-bookings-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class BookingsList implements OnInit {
  asArrendatario: any[] = []; asPropietario: any[] = []; loading = true;
  error = '';
  tabIndex = 0;

  constructor(private api: Api, public auth: Auth, private dialog: MatDialog, private snackBar: MatSnackBar, private cdr: ChangeDetectorRef) {}

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
        this.asArrendatario = results[0]?.data?.data || [];
        if (calls.length > 1) {
          this.asPropietario = results[1]?.data?.data || [];
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.error = 'No se pudieron cargar las reservas.';
      }
    });
  }

  private confirmAction(msg: string): import('rxjs').Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }

  cancelBooking(id: string): void {
    this.confirmAction('¿Cancelar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.put(`/bookings/${id}/cancel`, { motivo: 'Cancelado por el usuario' }).subscribe(() => this.loadBookings());
    });
  }
  confirmBooking(id: string): void { this.api.put(`/bookings/${id}/confirm`, {}).subscribe(() => this.loadBookings()); }
  rejectBooking(id: string): void {
    this.confirmAction('¿Rechazar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.put(`/bookings/${id}/reject`, {}).subscribe(() => this.loadBookings());
    });
  }
  completeBooking(id: string): void { this.api.put(`/bookings/${id}/complete`, {}).subscribe(() => this.loadBookings()); }

  payBooking(booking: any): void {
    this.api.post<any>('/payments/checkout', { reserva_id: booking.id, metodo_pago: 'simulado' }).subscribe({
      next: (res) => {
        const paymentId = res.data?.pago_id;
        if (!paymentId) return;
        this.api.post(`/payments/${paymentId}/simulate-approval`, {}).subscribe(() => {
          this.snackBar.open('Pago simulado aprobado. Fondos retenidos hasta completar la reserva.', 'Cerrar', { duration: 4000 });
        });
      },
      error: (err) => this.snackBar.open(err.error?.error?.message || 'No se pudo iniciar el pago.', 'Cerrar', { duration: 4000 })
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
