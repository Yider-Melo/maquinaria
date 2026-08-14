import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Api } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { NotificationState } from '../../core/services/notification-state.service';
import { watchNotifications, watchRealtime } from '../../shared/realtime';
import { formatDateTime, formatDateRelative } from '../../shared/utils';
import { Notification, PaginatedResponse } from '../../core/models';

@Component({
  standalone: false,
  selector: 'app-notifications-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class NotificationsList implements OnInit, OnDestroy {
  formatDateTime = formatDateTime;
  formatDateRelative = formatDateRelative;
  notifications: Notification[] = []; loading = true; error = '';
  page = 1; size = 20; total = 0;
  private realtimeSub: Subscription | undefined;

  get totalPages(): number { return Math.ceil(this.total / this.size) || 1; }

  constructor(
    private api: Api,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private socket: SocketService,
    private notificationState: NotificationState
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    // Refresco inmediato: ante una notificación nueva (evento 'notification') y
    // ante cualquier actividad de reserva/pago/maquinaria (evento 'refresh').
    this.realtimeSub = new Subscription();
    this.realtimeSub.add(watchNotifications(this.socket, () => this.loadNotifications()));
    this.realtimeSub.add(watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        return t.startsWith('booking.') || t.startsWith('payment.') || t.startsWith('machinery.');
      },
      () => this.loadNotifications()
    ));
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  prevPage(): void { if (this.page > 1) { this.page--; this.loadNotifications(); } }
  nextPage(): void { if (this.page * this.size < this.total) { this.page++; this.loadNotifications(); } }

  private loadNotifications(showLoading = true): void {
    if (showLoading) { this.loading = true; this.error = ''; }
    this.api.get<Notification[]>(`/notifications?page=${this.page}&size=${this.size}`).subscribe({
      next: (res) => {
        const r = res as any;
        this.notifications = r?.data?.data || [];
        this.total = r?.data?.total || 0;
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
    this.api.put<Notification>(`/notifications/${id}/read`, {}).subscribe(() => {
      const n = this.notifications.find(x => x.id === id);
      if (n) n.leida = true;
      this.notificationState.notifyChanged();
    });
  }

  goToNotification(n: Notification): void {
    this.markAsRead(n.id);
    if (!n.referencia_id || !n.referencia_tipo) return;
    if (n.referencia_tipo === 'reserva') {
      this.router.navigate(['/bookings', n.referencia_id]);
    } else if (n.referencia_tipo === 'calificacion' || n.tipo?.includes('rating')) {
      this.router.navigate(['/ratings', n.referencia_id]);
    } else if (n.referencia_tipo === 'pago' || n.tipo?.includes('payment')) {
      this.router.navigate(['/payments', n.referencia_id]);
    } else if (n.tipo?.includes('machinery')) {
      this.router.navigate(['/machinery', n.referencia_id]);
    }
  }
  markAllAsRead(): void {
    this.api.put<{ success: boolean }>('/notifications/read-all', {}).subscribe(() => {
      this.loadNotifications(false);
      this.notificationState.notifyChanged();
    });
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
