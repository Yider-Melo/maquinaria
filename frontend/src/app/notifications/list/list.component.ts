import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api } from '../../core/services/api.service';
import { formatDateTime, formatDateRelative } from '../../shared/utils';

@Component({
  standalone: false,
  selector: 'app-notifications-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class NotificationsList implements OnInit {
  formatDateTime = formatDateTime;
  formatDateRelative = formatDateRelative;
  notifications: any[] = []; loading = true; error = '';

  constructor(private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loading = true; this.error = '';
    this.api.get<any>('/notifications').subscribe({
      next: (res) => {
        this.notifications = res.data?.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar las notificaciones.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  markAsRead(id: string): void {
    this.api.put(`/notifications/${id}/read`, {}).subscribe(() => { const n = this.notifications.find(x => x.id === id); if (n) n.leida = true; });
  }
  markAllAsRead(): void {
    this.api.put('/notifications/read-all', {}).subscribe(() => this.notifications.forEach(n => n.leida = true));
  }

  getIcon(tipo: string): string {
    if (!tipo) return 'notifications';
    if (tipo.includes('reserva') || tipo.includes('booking')) return 'book_online';
    if (tipo.includes('pago') || tipo.includes('payment')) return 'payments';
    if (tipo.includes('cancel')) return 'cancel';
    if (tipo.includes('complet')) return 'check_circle';
    if (tipo.includes('confirm')) return 'verified';
    if (tipo.includes('rechaz')) return 'block';
    if (tipo.includes('calif') || tipo.includes('rating')) return 'star';
    return 'notifications';
  }

  getIconClase(tipo: string): string {
    if (!tipo) return 'sistema';
    if (tipo.includes('reserva') || tipo.includes('booking')) return 'reserva';
    if (tipo.includes('pago') || tipo.includes('payment')) return 'pago';
    return 'sistema';
  }

  getTipoLabel(tipo: string): string {
    if (!tipo) return 'Sistema';
    if (tipo.includes('reserva') || tipo.includes('booking.created')) return 'Nueva reserva';
    if (tipo.includes('booking.confirmed')) return 'Reserva confirmada';
    if (tipo.includes('booking.started')) return 'Alquiler iniciado';
    if (tipo.includes('booking.cancelled')) return 'Reserva cancelada';
    if (tipo.includes('booking.completed')) return 'Reserva completada';
    if (tipo.includes('booking.rejected')) return 'Reserva rechazada';
    if (tipo.includes('payment.confirmed')) return 'Pago recibido';
    if (tipo.includes('payment.pending')) return 'Pago pendiente';
    if (tipo.includes('payment.failed')) return 'Pago fallido';
    if (tipo.includes('payment.refunded')) return 'Reembolso';
    if (tipo.includes('payment.released')) return 'Fondos liberados';
    if (tipo.includes('rating')) return 'Calificación';
    return tipo;
  }
}
