// Componente que lista las reservas del usuario, tanto las que hizo
// como arrendatario como las que recibió como propietario. Permite
// cancelar, confirmar, rechazar o completar reservas según el estado.
import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-bookings-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class BookingsList implements OnInit {
  asArrendatario: any[] = []; asPropietario: any[] = []; loading = true;

  constructor(private api: Api, public auth: Auth, private dialog: MatDialog, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.api.get<any>('/bookings/my-bookings').subscribe(res => {
      this.asArrendatario = res.data?.data || []; this.loading = false;
    });
    this.api.get<any>('/bookings/my-listings').subscribe(res => {
      this.asPropietario = res.data?.data || [];
    });
  }

  private confirmAction(msg: string): import('rxjs').Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }

  cancelBooking(id: string): void {
    this.confirmAction('¿Cancelar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.put(`/bookings/${id}/cancel`, { motivo: 'Cancelado por el usuario' }).subscribe(() => this.ngOnInit());
    });
  }
  confirmBooking(id: string): void { this.api.put(`/bookings/${id}/confirm`, {}).subscribe(() => this.ngOnInit()); }
  rejectBooking(id: string): void {
    this.confirmAction('¿Rechazar esta reserva?').subscribe(confirmed => {
      if (confirmed) this.api.put(`/bookings/${id}/reject`, {}).subscribe(() => this.ngOnInit());
    });
  }
  completeBooking(id: string): void { this.api.put(`/bookings/${id}/complete`, {}).subscribe(() => this.ngOnInit()); }
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
