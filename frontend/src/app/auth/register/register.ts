// Componente de registro de usuario. Recoge los datos del formulario
// y los envía al servicio de autenticación para crear una cuenta nueva.
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-register', templateUrl: './register.html', styleUrls: ['./register.css']
})
export class Register {
  data = { email: '', password: '', confirmPassword: '', nombre: '', apellido: '', telefono: '', tipo_usuario: 'arrendatario' };
  error = ''; loading = false;

  constructor(private auth: Auth, private router: Router) {}

  onSubmit(): void {
    this.error = '';
    if (this.data.password !== this.data.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    if (this.data.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    this.loading = true;
    const { confirmPassword, ...payload } = this.data;
    this.auth.register(payload).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err) => { this.error = err.error?.error?.message || 'Error al registrarse'; this.loading = false; }
    });
  }
}
