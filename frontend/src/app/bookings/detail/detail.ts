// Componente de detalle de una reserva. Muestra la información completa
// de la reserva y permite iniciar el proceso de pago.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../../core/services/api';

@Component({
  standalone: false,
  selector: 'app-bookings-detail', templateUrl: './detail.html', styleUrls: ['./detail.css']
})
export class BookingsDetail implements OnInit {
  booking: any = null; loading = true;

  constructor(private route: ActivatedRoute, private api: Api, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.api.get<any>(`/bookings/${id}`).subscribe(res => { this.booking = res.data; this.loading = false; });
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
