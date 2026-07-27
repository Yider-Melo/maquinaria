// Componente de registro de usuario. Recoge los datos del formulario
// y los envía al servicio de autenticación para crear una cuenta nueva.
import { Component, ChangeDetectorRef, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '../../core/services/auth.service';
import { LegalDialog } from '../legal-dialog.component';

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

  constructor(private auth: Auth, private router: Router, private cdr: ChangeDetectorRef, private snackBar: MatSnackBar, private dialog: MatDialog) {}

  openTerminos(): void {
    this.dialog.open(LegalDialog, {
      width: '600px',
      data: {
        title: 'Términos y Condiciones',
        content: `1. Aceptación de los Términos
Al registrarte y utilizar RentaMaq, aceptas cumplir con estos términos y condiciones.

2. Descripción del Servicio
RentaMaq es una plataforma que conecta a propietarios de maquinaria con arrendatarios interesados en alquilar equipos.

3. Responsabilidades del Usuario
- Proporcionar información veraz y actualizada.
- No utilizar la plataforma para actividades ilegales.
- Mantener la confidencialidad de tus credenciales de acceso.
- Respetar los acuerdos de alquiler establecidos.

4. Responsabilidad sobre la Maquinaria
- El arrendatario se compromete a usar la maquinaria de forma responsable.
- El propietario debe garantizar que la maquinaria está en condiciones óptimas.
- Ambos partes acuerdan resolver disputas de buena fe.

5. Comisiones
RentaMaq cobra una comisión por cada transacción realizada a través de la plataforma.

6. Modificaciones
RentaMaq se reserva el derecho de modificar estos términos en cualquier momento.`
      }
    });
  }

  openPoliticas(): void {
    this.dialog.open(LegalDialog, {
      width: '600px',
      data: {
        title: 'Políticas de Privacidad',
        content: `1. Información que Recopilamos
Recopilamos la información que nos proporcionas al registrarte: nombre, email, teléfono y tipo de usuario.

2. Uso de la Información
Utilizamos tus datos para:
- Gestionar tu cuenta y autenticación.
- Facilitar la comunicación entre arrendatarios y propietarios.
- Procesar pagos a través de Mercado Pago.
- Enviar notificaciones relacionadas con tus reservas.

3. Compartición de Datos
No compartimos tus datos personales con terceros sin tu consentimiento explícito, excepto cuando sea necesario para procesar pagos o cumplir con la ley.

4. Seguridad
Implementamos medidas de seguridad para proteger tu información contra accesos no autorizados.

5. Tus Derechos
Puedes solicitar la eliminación de tus datos contactándonos. Tus datos se conservarán mientras tu cuenta esté activa.

6. Contacto
Para cualquier consulta sobre privacidad, contáctanos a través de la plataforma.`
      }
    });
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
