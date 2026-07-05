// Componente de la barra de navegación superior. Muestra el menú principal,
// el conteo de notificaciones no leídas y las opciones de autenticación.
// Se conecta al WebSocket al iniciar para recibir notificaciones en tiempo real.
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth } from '../../core/services/auth';
import { SocketService } from '../../core/services/socket';
import { Api } from '../../core/services/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header', templateUrl: './header.html', styleUrls: ['./header.css'],
  standalone: false
})
export class Header implements OnInit, OnDestroy {
  unreadCount = 0;
  private subs: Subscription[] = [];

  constructor(
    public auth: Auth,
    private router: Router,
    private socket: SocketService,
    private api: Api,
    private snackBar: MatSnackBar
  ) {}

  // Al iniciar, si el usuario está autenticado, carga el conteo de
  // notificaciones no leídas y se suscribe al WebSocket para incrementarlo.
  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.socket.connect();
      this.subs.push(
        this.socket.onNotification().subscribe((data: any) => {
          this.unreadCount++;
          this.snackBar.open(data?.mensaje || 'Nueva notificación', 'Ver', {
            duration: 4000,
            direction: 'ltr'
          }).onAction().subscribe(() => this.router.navigate(['/notifications']));
        })
      );
    }
  }

  // Al destruir, cancela suscripciones y desconecta el WebSocket.
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.socket.disconnect();
  }

  // Cierra la sesión, desconecta el socket y redirige al login.
  logout(): void {
    this.socket.disconnect();
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
