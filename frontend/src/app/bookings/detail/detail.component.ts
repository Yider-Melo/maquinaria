import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/services/api.service';
import { formatDate, formatDateTime, formatId, estadoLabel } from '../../shared/utils';

@Component({
  standalone: true,
  selector: 'app-cancel-detail-dialog',
  template: `
    <h2 mat-dialog-title>Cancelar reserva</h2>
    <mat-dialog-content>
      <p>¿Estás seguro de cancelar esta reserva?</p>
      <p style="color:#d32f2f;font-size:13px;"><mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle;">warning</mat-icon> Si ya realizaste el pago, el reembolso se procesará según la política de cancelación. Esta acción no se puede deshacer.</p>
      <mat-form-field appearance="outline" style="width:100%;margin-top:8px;">
        <mat-label>Motivo de cancelación (opcional)</mat-label>
        <input matInput [(ngModel)]="motivo" placeholder="Ej: Cambié de planes">
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Volver</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="{ motivo: motivo || 'Cancelado por el usuario' }">Sí, cancelar reserva</button>
    </mat-dialog-actions>
  `,
  imports: [MatDialogModule, MatButtonModule, MatInputModule, MatIconModule, FormsModule]
})
export class CancelDetailDialog {
  motivo = '';
  constructor(
    public dialogRef: MatDialogRef<CancelDetailDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}

@Component({
  standalone: false,
  selector: 'app-bookings-detail', templateUrl: './detail.html', styleUrls: ['./detail.css']
})
export class BookingsDetail implements OnInit {
  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  estadoLabel = estadoLabel;
  booking: any = null; loading = true; error = ''; paying = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: Api,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { 
      this.error = 'Reserva no encontrada.'; 
      this.loading = false;
      this.cdr.markForCheck();
      return; 
    }
    this.loadBooking(id);
  }

  private loadBooking(id: string): void {
    this.api.get<any>(`/bookings/${id}`).subscribe({
      next: (res: any) => {
        if (!res?.data) {
          this.error = 'No se pudo cargar la reserva.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.booking = res.data;
        if (this.booking?.maquinaria_id) {
          this.api.get<any>(`/machinery/${this.booking.maquinaria_id}`).subscribe({
            next: (machineRes: any) => {
              const machine = machineRes?.data;
              if (machine) {
                this.booking.maquinaria_titulo = machine?.titulo || `Maquinaria #${this.booking.maquinaria_id?.substring(0, 8)}`;
                this.booking.maquinaria_precio = machine?.precio_por_dia ?? machine?.precio_por_hora;
              }
              this.loading = false;
              this.cdr.markForCheck();
            },
            error: () => {
              this.booking.maquinaria_titulo = `Maquinaria #${this.booking.maquinaria_id?.substring(0, 8) || 'sin asignar'}`;
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
        console.error('Error en API /bookings/:id');
        this.error = 'No se pudo cargar la reserva.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    if (!this.booking) return;
    const dialogRef = this.dialog.open(CancelDetailDialog);
    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result) return;
      this.api.post(`/bookings/${this.booking.id}/cancel`, { motivo: result.motivo }).subscribe({
        next: () => {
          this.snackBar.open('Reserva cancelada correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/bookings']);
        },
        error: (err: any) => this.snackBar.open(err.error?.error?.message || 'Error al cancelar', 'Cerrar', { duration: 4000 })
      });
    });
  }

  pay(): void {
    if (!this.booking || this.paying) return;
    if (this.booking.estado !== 'confirmada') {
      this.snackBar.open('La reserva debe estar confirmada para procesar el pago.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.paying = true;
    this.api.post('/payments/checkout', { reserva_id: this.booking.id, metodo_pago: 'simulado' }).subscribe({
        next: (res: any) => {
          const paymentId = res.data?.pago_id;
          if (paymentId) {
            this.api.post(`/payments/${paymentId}/simulate-approval`, {}).subscribe(() => {
              this.snackBar.open('Pago de prueba aprobado (modo demo)', 'Cerrar', { duration: 5000 });
              this.paying = false;
              this.loadBooking(this.booking.id);
            });
          } else {
            this.snackBar.open('Pago de prueba iniciado. Ref: ' + res.data.referencia + ' (modo demo)', 'Cerrar', { duration: 6000 });
            this.paying = false;
            this.loadBooking(this.booking.id);
          }
        },
        error: (err: any) => {
          this.paying = false;
          const msg = err.error?.error?.message || 'Error al procesar el pago';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }
}
