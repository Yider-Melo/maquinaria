// Componente de inicio de sesión. Presenta un formulario de email y
// contraseña, y al enviarlo llama al servicio de autenticación.
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-login', templateUrl: './login.html', styleUrls: ['./login.css']
})
export class Login {
  email = ''; password = ''; error = ''; loading = false;

  constructor(private auth: Auth, private router: Router) {}

  // Procesa el envío del formulario: inicia sesión y redirige al inicio
  // o muestra un mensaje de error en caso de fallo.
  onSubmit(): void {
    this.loading = true; this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => { this.error = err.error?.error?.message || 'Error al iniciar sesión'; this.loading = false; }
    });
  }
}
