import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

// Estado compartido de notificaciones para refrescar en tiempo real la lista
// y el contador de no leídas de la campanita cuando cambian localmente
// (p. ej. al marcar una o todas las notificaciones como leídas).
@Injectable({ providedIn: 'root' })
export class NotificationState {
  private refresh = new Subject<void>();
  refresh$ = this.refresh.asObservable();

  notifyChanged(): void {
    this.refresh.next();
  }
}
