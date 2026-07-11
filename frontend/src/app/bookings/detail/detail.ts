// Componente de detalle de una reserva. Muestra la información completa
// de la reserva y permite iniciar el proceso de pago.
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../../core/services/api';
import { formatDate, formatDateTime, formatId, estadoLabel } from '../../shared/utils';

@Component({
  standalone: false,
  selector: 'app-bookings-detail', templateUrl: './detail.html', styleUrls: ['./detail.css']
})
export class BookingsDetail implements OnInit {
  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  estadoLabel = estadoLabel;
  booking: any = null; loading = true; error = '';

  constructor(
    private route: ActivatedRoute, 
    private api: Api, 
    private snackBar: MatSnackBar,
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
        
        // Si hay maquinaria_id, cargar los detalles de la maquinaria
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
              // Aunque falle cargar la maquinaria, mostrar la reserva igual
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

  pay(): void {
    if (this.booking)
      this.api.post('/payments/checkout', { reserva_id: this.booking.id }).subscribe({
        next: (res: any) => {
          this.snackBar.open(`Pago iniciado. Ref: ${res.data.referencia}`, 'Cerrar', { duration: 5000 });
          this.booking.estado = 'pagada';
        },
        error: () => this.snackBar.open('Error al procesar el pago', 'Cerrar', { duration: 3000 })
      });
  }
}
