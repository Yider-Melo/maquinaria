// Servicio de conexión WebSocket mediante Socket.IO.
// Permite recibir notificaciones y alertas de nuevas reservas en tiempo real.
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Auth } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  constructor(private auth: Auth) {}

  // Establece la conexión WebSocket autenticada con el backend.
  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io(environment.socketUrl, {
      auth: { token: this.auth.getToken() }
      ,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.debug('SocketService: connected to notification gateway');
    });
    this.socket.on('connect_error', (err) => {
      console.error('SocketService: connect error', err);
    });
  }

  // Cierra la conexión WebSocket.
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  // Observable que emite valores cuando se recibe una notificación.
  onNotification(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) this.connect();
      const handler = (data: any) => observer.next(data);
      this.socket!.on('notification', handler);
      return () => {
        this.socket?.off('notification', handler);
      };
    });
  }

  // Observable que emite valores cuando se recibe un evento de refresco en vivo.
  // El backend lo usa para avisar que cambió una reserva, pago o maquinaria,
  // de modo que las vistas se recarguen solas sin esperar a navegar.
  onRefresh(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) this.connect();
      const handler = (data: any) => observer.next(data);
      this.socket!.on('refresh', handler);
      return () => {
        this.socket?.off('refresh', handler);
      };
    });
  }

  // Observable que emite valores cuando se recibe notificaciones de booking
  onNewBooking(): Observable<any> {
    return this.onNotification();
  }
}
