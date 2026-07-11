// Componente que lista las notificaciones del usuario y permite
// marcarlas como leídas, individualmente o todas a la vez.
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api } from '../../core/services/api';
import { formatDateTime } from '../../shared/utils';

@Component({
  standalone: false,
  selector: 'app-notifications-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class NotificationsList implements OnInit {
  formatDateTime = formatDateTime;
  notifications: any[] = []; loading = true; error = '';

  constructor(private api: Api, private cdr: ChangeDetectorRef) {}

  // Obtiene la lista de notificaciones desde el backend.
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

  // Marca una notificación específica como leída.
  markAsRead(id: string): void {
    this.api.put(`/notifications/${id}/read`, {}).subscribe(() => { const n = this.notifications.find(x => x.id === id); if (n) n.leida = true; });
  }
  // Marca todas las notificaciones como leídas.
  markAllAsRead(): void {
    this.api.put('/notifications/read-all', {}).subscribe(() => this.notifications.forEach(n => n.leida = true));
  }
}
