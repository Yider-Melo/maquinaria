// Componente de restablecimiento de contraseña. Lee el token del enlace
// del correo y permite definir una contraseña nueva.
import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/services/api.service';

@Component({
  standalone: false,
  selector: 'app-reset-password', templateUrl: './reset-password.html', styleUrls: ['./reset-password.css']
})
export class ResetPassword implements OnInit, OnDestroy {
  token = '';
  password = ''; confirmPassword = '';
  state: 'loading' | 'form' | 'success' | 'error' = 'loading';
  error = ''; loading = false; showPassword = false; confirmTouched = false;
  private failTimer: ReturnType<typeof setTimeout> | null = null;

  passwordRules = [
    { label: 'Mínimo 8 caracteres', valid: false },
    { label: 'Una letra mayúscula', valid: false },
    { label: 'Una letra minúscula', valid: false },
    { label: 'Un número', valid: false }
  ];

  constructor(private route: ActivatedRoute, private api: Api, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.state = 'error';
      this.error = 'El enlace de restablecimiento no es válido.';
      return;
    }
    this.state = 'form';
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.failTimer) clearTimeout(this.failTimer);
  }

  updatePasswordRules(): void {
    const password = this.password || '';
    this.passwordRules = [
      { label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
      { label: 'Una letra mayúscula', valid: /[A-Z]/.test(password) },
      { label: 'Una letra minúscula', valid: /[a-z]/.test(password) },
      { label: 'Un número', valid: /\d/.test(password) }
    ];
  }

  isPasswordValid(): boolean { return this.passwordRules.every(rule => rule.valid); }

  get passwordsMatch(): boolean {
    return !this.confirmPassword || this.password === this.confirmPassword;
  }

  onSubmit(): void {
    this.error = '';
    this.updatePasswordRules();
    if (!this.isPasswordValid()) {
      this.error = 'La contraseña no cumple las condiciones indicadas.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    if (this.failTimer) clearTimeout(this.failTimer);
    this.failTimer = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.error = 'La solicitud está tardando más de lo esperado. Revisa tu conexión e inténtalo de nuevo.';
        this.cdr.detectChanges();
      }
    }, 15000);

    this.api.post<any>('/auth/reset-password', { token: this.token, password: this.password }).subscribe({
      next: () => {
        if (this.failTimer) clearTimeout(this.failTimer);
        this.loading = false;
        this.state = 'success';
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (this.failTimer) clearTimeout(this.failTimer);
        this.loading = false;
        this.state = 'error';
        this.error = err.error?.error?.message || 'No se pudo restablecer la contraseña. El enlace puede haber expirado o ya fue usado.';
        this.cdr.detectChanges();
      }
    });
  }

  goLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
