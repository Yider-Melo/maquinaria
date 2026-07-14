// Componente de registro de usuario. Recoge los datos del formulario
// y los envía al servicio de autenticación para crear una cuenta nueva.
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth.service';

@Component({
  standalone: false,
  selector: 'app-register', templateUrl: './register.html', styleUrls: ['./register.css']
})
export class Register {
  data = { email: '', password: '', confirmPassword: '', nombre: '', apellido: '', telefono: '', tipo_usuario: 'arrendatario' };
  error = ''; loading = false; showPassword = false; showConfirmPassword = false;

  passwordRules = [
    { label: 'Mínimo 8 caracteres', valid: false },
    { label: 'Una letra mayúscula', valid: false },
    { label: 'Una letra minúscula', valid: false },
    { label: 'Un número', valid: false }
  ];

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef) {}

  onSubmit(): void {
    this.error = '';
    this.updatePasswordRules();
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
    this.auth.register(payload).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err) => {
        this.error = err.error?.error?.message || err.error?.message || 'Error al registrarse';
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
