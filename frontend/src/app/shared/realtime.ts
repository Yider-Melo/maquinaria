// Helper para recargar componentes en tiempo real cuando llega un evento
// de refresco por WebSocket. Agrupa ráfagas de eventos (debounce) para
// evitar recargar el backend varias veces en poco tiempo.
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { SocketService } from '../core/services/socket.service';

export function watchRealtime(
  socket: SocketService,
  match: (ev: any) => boolean,
  reload: () => void
): Subscription {
  const trigger = new Subject<void>();
  const reloadSub = trigger.pipe(debounceTime(300)).subscribe(reload);
  const eventSub = socket
    .onRefresh()
    .pipe(filter(match))
    .subscribe(() => trigger.next());
  return new Subscription(() => {
    reloadSub.unsubscribe();
    eventSub.unsubscribe();
  });
}

// Recarga un componente cuando llega una notificación nueva (p. ej. lista de notificaciones).
export function watchNotifications(
  socket: SocketService,
  reload: () => void
): Subscription {
  const trigger = new Subject<void>();
  const reloadSub = trigger.pipe(debounceTime(300)).subscribe(reload);
  const eventSub = socket.onNotification().subscribe(() => trigger.next());
  return new Subscription(() => {
    reloadSub.unsubscribe();
    eventSub.unsubscribe();
  });
}
