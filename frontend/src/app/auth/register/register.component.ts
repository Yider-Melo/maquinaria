// Componente de registro de usuario. Recoge los datos del formulario
// y los envía al servicio de autenticación para crear una cuenta nueva.
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth } from '../../core/services/auth.service';

@Component({
  standalone: false,
  selector: 'app-register', templateUrl: './register.html', styleUrls: ['./register.css']
})
export class Register {
  data = { email: '', password: '', confirmPassword: '', nombre: '', apellido: '', telefono: '', tipo_usuario: 'arrendatario' };
  error = ''; loading = false; showPassword = false; showConfirmPassword = false; aceptaTerminos = false;

  passwordRules = [
    { label: 'Mínimo 8 caracteres', valid: false },
    { label: 'Una letra mayúscula', valid: false },
    { label: 'Una letra minúscula', valid: false },
    { label: 'Un número', valid: false }
  ];

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef, private snackBar: MatSnackBar) {}

  openTerminos(): void {
    this.snackBar.open('Al registrarte aceptas: uso responsable de la plataforma, veracidad de datos, y responsabilidad sobre el equipo alquilado.', 'Cerrar', { duration: 8000 });
  }

  openPoliticas(): void {
    this.snackBar.open('Tus datos personales se usarán solo para la gestión de alquileres y no serán compartidos con terceros sin tu consentimiento.', 'Cerrar', { duration: 8000 });
  }

  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  onSubmit(): void {
    this.error = '';
    this.updatePasswordRules();

    if (!this.emailRegex.test(this.data.email)) {
      this.error = 'El email no tiene un formato válido';
      return;
    }
    if (this.data.nombre.trim().length < 2) {
      this.error = 'El nombre debe tener al menos 2 caracteres';
      return;
    }
    if (this.data.apellido.trim().length < 2) {
      this.error = 'El apellido debe tener al menos 2 caracteres';
      return;
    }
    if (!this.aceptaTerminos) {
      this.error = 'Debes aceptar los términos y condiciones para registrarte.';
      return;
    }
    if (this.data.password !== this.data.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    if (!this.isPasswordValid()) {
      this.error = 'La contraseña no cumple las condiciones indicadas.';
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    const { confirmPassword, ...payload } = this.data;
    if (!payload.telefono) (payload as any).telefono = undefined;
    this.auth.register(payload).subscribe({
      next: () => {
        this.snackBar.open('Cuenta creada con éxito. Ahora inicia sesión.', 'Cerrar', { duration: 5000 });
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        if (err.status === 0) {
          this.error = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        } else {
          this.error = err.error?.error?.message || err.error?.message || 'Error al registrarse';
        }
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updatePasswordRules(): void {
    const password = this.data.password || '';
    this.passwordRules = [
      { label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
      { label: 'Una letra mayúscula', valid: /[A-Z]/.test(password) },
      { label: 'Una letra minúscula', valid: /[a-z]/.test(password) },
      { label: 'Un número', valid: /\d/.test(password) }
    ];
  }

  isPasswordValid(): boolean { return this.passwordRules.every(rule => rule.valid); }
}
