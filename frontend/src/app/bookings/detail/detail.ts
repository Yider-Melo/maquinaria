// Componente de detalle de una reserva. Muestra la información completa
// de la reserva y permite iniciar el proceso de pago.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Api } from '../../core/services/api';

@Component({
  standalone: false,
  selector: 'app-bookings-detail', templateUrl: './detail.html', styleUrls: ['./detail.css']
})
export class BookingsDetail implements OnInit {
  booking: any = null; loading = true;

  constructor(private route: ActivatedRoute, private api: Api) {}

  // Carga los datos de la reserva usando el ID de la ruta.
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.api.get<any>(`/bookings/${id}`).subscribe(res => { this.booking = res.data; this.loading = false; });
  }

  // Inicia el proceso de pago para la reserva actual.
  pay(): void {
    if (this.booking)
      this.api.post('/payments/checkout', { reserva_id: this.booking.id }).subscribe((res: any) => alert('Pago iniciado. Ref: ' + res.data.referencia));
  }
}
