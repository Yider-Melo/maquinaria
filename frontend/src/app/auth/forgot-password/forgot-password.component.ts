// Componente de recuperación de contraseña. Solicita el email y envía
// la solicitud para que el sistema mande el enlace de restablecimiento.
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../../core/services/api.service';

@Component({
  standalone: false,
  selector: 'app-forgot-password', templateUrl: './forgot-password.html', styleUrls: ['./forgot-password.css']
})
export class ForgotPassword {
  email = ''; error = ''; loading = false; sent = false;

  constructor(private api: Api, private router: Router, private cdr: ChangeDetectorRef, private snackBar: MatSnackBar) {}

  onSubmit(): void {
    this.error = '';
    const email = this.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error = 'El email no tiene un formato válido';
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.api.post<any>('/auth/forgot-password', { email }).subscribe({
      next: () => {
        this.sent = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.error?.error?.message || 'No se pudo enviar el enlace. Intenta de nuevo.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  goLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
