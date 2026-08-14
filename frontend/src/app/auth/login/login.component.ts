// Componente de inicio de sesión. Presenta un formulario de email y
// contraseña, y al enviarlo llama al servicio de autenticación.
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth } from '../../core/services/auth.service';
import { Api } from '../../core/services/api.service';

@Component({
  standalone: false,
  selector: 'app-login', templateUrl: './login.html', styleUrls: ['./login.css']
})
export class Login {
  email = ''; password = ''; code = ''; error = ''; loading = false; showPassword = false;
  canResend = false; resending = false; requires2fa = false;

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef, private api: Api, private snackBar: MatSnackBar) {}

  // Procesa el envío del formulario: inicia sesión y redirige al inicio,
  // pide el código 2FA si la cuenta lo tiene activado, o muestra un error.
  onSubmit(): void {
    this.error = '';
    this.canResend = false;
    const email = this.email.trim();
    if (!email || !this.password) {
      this.error = 'Ingresa tu correo y contraseña para continuar.';
      return;
    }
    if (this.requires2fa && !this.code.trim()) {
      this.error = 'Ingresa el código de verificación (2FA).';
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.auth.login(email, this.password, this.code.trim() || undefined).subscribe({
      next: (res) => {
        if (res.data?.requires_2fa) {
          this.requires2fa = true;
          this.error = '';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = this.getAuthError(err);
        if (err.status === 403) this.canResend = true;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  resendVerification(): void {
    if (this.resending) return;
    this.resending = true;
    this.cdr.markForCheck();
    this.api.post<any>('/auth/resend-verification', { email: this.email.trim() }).subscribe({
      next: () => {
        this.snackBar.open('Te enviamos un nuevo enlace de verificación a tu correo.', 'Cerrar', { duration: 6000 });
        this.resending = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.snackBar.open(err.error?.error?.message || 'No se pudo reenviar el enlace. Intenta de nuevo.', 'Cerrar', { duration: 6000 });
        this.resending = false;
        this.cdr.markForCheck();
      }
    });
  }

  private getAuthError(err: any): string {
    if (err.status === 0) return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.';
    if (err.status === 401) return 'Correo o contraseña incorrectos.';
    if (err.status === 403) return 'Debes verificar tu correo antes de entrar. Revisa tu bandeja de entrada (o spam) y haz clic en el enlace de confirmación.';
    if (err.status === 429) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    return err.error?.error?.message || err.error?.message || 'No fue posible iniciar sesión.';
  }
}
