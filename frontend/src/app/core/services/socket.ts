// Servicio de conexión WebSocket mediante Socket.IO.
// Permite recibir notificaciones y alertas de nuevas reservas en tiempo real.
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Auth } from './auth';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

  constructor(private auth: Auth) {}

  // Establece la conexión WebSocket autenticada con el backend.
  connect(): void {
    if (this.socket?.connected) return;
    this.socket = io('http://localhost:3000', {
      auth: { token: this.auth.getToken() }
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
      this.socket!.on('notification', (data: any) => observer.next(data));
    });
  }

  // Observable que emite valores cuando se recibe una nueva reserva.
  onNewBooking(): Observable<any> {
    return new Observable(observer => {
      if (!this.socket) this.connect();
      this.socket!.on('new_booking', (data: any) => observer.next(data));
    });
  }
}
