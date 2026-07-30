import { Component, OnInit, ChangeDetectorRef, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/services/api.service';
import { Auth, Usuario } from '../../core/services/auth.service';
import { RatingForm } from '../../ratings/form/form';
import { formatDate, formatDateTime, formatId, estadoLabel } from '../../shared/utils';
import { Booking, Machinery, Payment, PaymentCheckout, Rating, ApiResponse } from '../../core/models';

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
    public router: Router,
    private api: Api,
    private auth: Auth,
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
    this.api.get<Booking>(`/bookings/${id}`).subscribe({
      next: (res: ApiResponse<Booking>) => {
        if (!res?.data) {
          this.error = 'No se pudo cargar la reserva.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.booking = res.data;
        if (this.booking?.maquinaria_id) {
          this.api.get<Machinery>(`/machinery/${this.booking.maquinaria_id}`).subscribe({
            next: (machineRes) => {
              const machine = machineRes?.data;
              if (machine && this.booking) {
                this.booking.maquinaria_titulo = machine?.titulo || `Maquinaria #${this.booking.maquinaria_id?.substring(0, 8)}`;
                this.booking.maquinaria_precio = machine?.precio_por_dia;
              }
              this.loading = false;
              this.cdr.markForCheck();
            },
            error: () => {
              if (this.booking) {
                this.booking.maquinaria_titulo = `Maquinaria #${this.booking.maquinaria_id?.substring(0, 8) || 'sin asignar'}`;
              }
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
        this.error = 'No se pudo cargar la reserva.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    if (!this.booking) return;
    const dialogRef = this.dialog.open(CancelDetailDialog);
    dialogRef.afterClosed().subscribe((result: { motivo: string } | false) => {
      if (!result || !this.booking) return;
      this.api.post<Booking>(`/bookings/${this.booking.id}/cancel`, { motivo: result.motivo }).subscribe({
        next: () => {
          this.snackBar.open('Reserva cancelada correctamente', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/bookings']);
        },
        error: (err: any) => this.snackBar.open(err.error?.error?.message || 'Error al cancelar', 'Cerrar', { duration: 4000 })
      });
    });
  }

  openRatingDialog(): void {
    if (!this.booking) return;
    const userId = this.auth.getUser()?.id;
    const calificadoId = this.booking.propietario_id === userId ? this.booking.arrendatario_id : this.booking.propietario_id;
    const dialogRef = this.dialog.open(RatingForm, {
      data: {
        reserva_id: this.booking.id,
        calificado_id: calificadoId,
        maquinaria_id: this.booking.maquinaria_id
      }
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && this.booking) {
        const { reserva_id, calificado_id, maquinaria_id, puntuacion, comentario } = result;
        this.api.post<Rating>(`/ratings`, { reserva_id, calificado_id, maquinaria_id, puntuacion, comentario }).subscribe({
          next: () => {
            this.snackBar.open('Calificación guardada correctamente', 'Cerrar', { duration: 3000 });
            this.loadBooking(this.booking.id);
          },
          error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al guardar calificación', 'Cerrar', { duration: 4000 })
        });
      }
    });
  }

  canConfirm(): boolean {
    return this.booking?.estado === 'pendiente' && this.booking?.propietario_id === this.auth.getUser()?.id;
  }

  confirm(): void {
    if (!this.booking) return;
    this.api.post<Booking>(`/bookings/${this.booking.id}/confirm`, {}).subscribe({
      next: () => {
        this.snackBar.open('Reserva confirmada correctamente', 'Cerrar', { duration: 3000 });
        this.loadBooking(this.booking.id);
      },
      error: (err) => this.snackBar.open(err.error?.error?.message || 'Error al confirmar', 'Cerrar', { duration: 4000 })
    });
  }

  pay(): void {
    if (!this.booking || this.paying) return;
    if (this.booking.estado !== 'confirmada') {
      this.snackBar.open('La reserva debe estar confirmada para procesar el pago.', 'Cerrar', { duration: 4000 });
      return;
    }
    this.paying = true;
    this.api.post<PaymentCheckout>('/payments/checkout', { reserva_id: this.booking.id }).subscribe({
        next: (res) => {
          this.paying = false;
          const data = res.data;
          if (data?.wompi?.public_key) {
            this.openWompiCheckout(data);
          } else if (data?.checkout_url) {
            window.location.href = data.checkout_url;
          } else if (data?.pago_id) {
            this.api.post<Payment>(`/payments/${data.pago_id}/simulate-approval`, {}).subscribe(() => {
              this.snackBar.open('Pago aprobado', 'Cerrar', { duration: 5000 });
              this.loadBooking(this.booking.id!);
            });
          }
        },
        error: (err) => {
          this.paying = false;
          const msg = err.error?.error?.message || 'Error al procesar el pago';
          this.snackBar.open(msg, 'Cerrar', { duration: 5000 });
        }
      });
  }

  private openWompiCheckout(data: any): void {
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
          customer_email: this.booking.arrendatario_email || '',
          acceptance_token: data.wompi.acceptance_token,
          redirect_url: window.location.origin + '/bookings/' + this.booking.id,
        },
        public_key: data.wompi.public_key,
        onSuccess: () => {
          this.snackBar.open('Pago exitoso', 'Cerrar', { duration: 5000 });
          this.loadBooking(this.booking.id!);
        },
        onError: (err: any) => {
          this.snackBar.open('Error en el pago: ' + (err?.message || 'Desconocido'), 'Cerrar', { duration: 5000 });
        },
        onClose: () => {
          this.loadBooking(this.booking.id!);
        }
      });
    };
    document.body.appendChild(script);
  }
}
