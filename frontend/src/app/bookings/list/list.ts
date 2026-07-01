// Componente que lista las reservas del usuario, tanto las que hizo
// como arrendatario como las que recibió como propietario. Permite
// cancelar, confirmar, rechazar o completar reservas según el estado.
import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-bookings-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class BookingsList implements OnInit {
  asArrendatario: any[] = []; asPropietario: any[] = []; loading = true;

  constructor(private api: Api, public auth: Auth) {}

  // Carga las reservas del usuario como arrendatario y como propietario.
  ngOnInit(): void {
    this.api.get<any>('/bookings/my-bookings').subscribe(res => {
      this.asArrendatario = res.data?.data || []; this.loading = false;
    });
    this.api.get<any>('/bookings/my-listings').subscribe(res => {
      this.asPropietario = res.data?.data || [];
    });
  }

  // Solicita confirmación y cancela una reserva.
  cancelBooking(id: string): void {
    if (confirm('¿Cancelar?')) this.api.put(`/bookings/${id}/cancel`, { motivo: 'Cancelado por el usuario' }).subscribe(() => this.ngOnInit());
  }
  // Confirma una reserva (propietario).
  confirmBooking(id: string): void { this.api.put(`/bookings/${id}/confirm`, {}).subscribe(() => this.ngOnInit()); }
  // Rechaza una reserva (propietario).
  rejectBooking(id: string): void { this.api.put(`/bookings/${id}/reject`, {}).subscribe(() => this.ngOnInit()); }
  // Marca una reserva como completada.
  completeBooking(id: string): void { this.api.put(`/bookings/${id}/complete`, {}).subscribe(() => this.ngOnInit()); }
}
