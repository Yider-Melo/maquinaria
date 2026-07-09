// Componente de inicio de sesión. Presenta un formulario de email y
// contraseña, y al enviarlo llama al servicio de autenticación.
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-login', templateUrl: './login.html', styleUrls: ['./login.css']
})
export class Login {
  email = ''; password = ''; error = ''; loading = false; showPassword = false;

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef) {}

  // Procesa el envío del formulario: inicia sesión y redirige al inicio
  // o muestra un mensaje de error en caso de fallo.
  onSubmit(): void {
    this.error = '';
    const email = this.email.trim();
    if (!email || !this.password) {
      this.error = 'Ingresa tu correo y contraseña para continuar.';
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.auth.login(email, this.password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error = this.getAuthError(err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private getAuthError(err: any): string {
    if (err.status === 0) return 'No se pudo conectar con el servidor. Verifica que Docker esté corriendo.';
    if (err.status === 401) return 'Correo o contraseña incorrectos.';
    if (err.status === 429) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    return err.error?.error?.message || err.error?.message || 'No fue posible iniciar sesión.';
  }
}
