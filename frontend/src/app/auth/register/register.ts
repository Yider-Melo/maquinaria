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
  data = { email: '', password: '', nombre: '', apellido: '', telefono: '', tipo_usuario: 'arrendatario' };
  error = ''; loading = false;

  constructor(private auth: Auth, private router: Router) {}

  // Envía los datos de registro. En caso de éxito redirige al login.
  onSubmit(): void {
    this.loading = true; this.error = '';
    this.auth.register(this.data).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err) => { this.error = err.error?.error?.message || 'Error al registrarse'; this.loading = false; }
    });
  }
}
