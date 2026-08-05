// Componente de verificación de correo. Lee el token del enlace enviado
// por email y lo confirma contra el servicio de autenticación.
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/services/api.service';

@Component({
  standalone: false,
  selector: 'app-verify-email', templateUrl: './verify-email.html', styleUrls: ['./verify-email.css']
})
export class VerifyEmail implements OnInit, OnDestroy {
  state: 'loading' | 'success' | 'error' = 'loading';
  error = '';
  private token = '';
  private failTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.setState('error', 'El enlace de verificación no es válido.');
      return;
    }
    this.verify();
  }

  ngOnDestroy(): void {
    if (this.failTimer) clearTimeout(this.failTimer);
  }

  retry(): void {
    this.error = '';
    this.verify();
  }

  private setState(next: 'loading' | 'success' | 'error', msg = ''): void {
    this.state = next;
    this.error = msg;
    this.cdr.detectChanges();
  }

  private verify(): void {
    this.setState('loading');
    if (this.failTimer) clearTimeout(this.failTimer);
    this.failTimer = setTimeout(() => {
      if (this.state === 'loading') {
        this.setState('error', 'La verificación está tardando más de lo esperado. Revisa tu conexión e inténtalo de nuevo.');
      }
    }, 10000);

    this.api.get<any>(`/auth/verify-email/${encodeURIComponent(this.token)}`).subscribe({
      next: () => {
        if (this.failTimer) clearTimeout(this.failTimer);
        this.setState('success');
      },
      error: (err) => {
        if (this.failTimer) clearTimeout(this.failTimer);
        this.setState('error', err.error?.error?.message || 'No se pudo verificar tu correo. El enlace puede haber expirado o ya fue usado.');
      }
    });
  }

  goLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
