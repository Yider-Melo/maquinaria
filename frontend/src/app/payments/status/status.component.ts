import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payments-status',
  template: `
    <div class="status-container">
      <mat-icon class="status-icon" [class.success]="isSuccess" [class.failure]="!isSuccess">
        {{ isSuccess ? 'check_circle' : 'cancel' }}
      </mat-icon>
      <h2>{{ isSuccess ? 'Pago exitoso' : 'Pago fallido' }}</h2>
      <p>{{ isSuccess ? 'Tu pago ha sido procesado correctamente.' : 'Hubo un problema al procesar tu pago.' }}</p>
      <a mat-raised-button color="primary" routerLink="/bookings">Volver a mis reservas</a>
    </div>
  `,
  styles: [`
    .status-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center; }
    .status-icon { font-size: 72px; width: 72px; height: 72px; margin-bottom: 16px; }
    .status-icon.success { color: #4caf50; }
    .status-icon.failure { color: #f44336; }
    h2 { margin: 0 0 8px; font-size: 24px; }
    p { color: #666; margin: 0 0 24px; }
  `],
  standalone: false
})
export class PaymentsStatus implements OnInit {
  isSuccess = true;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.isSuccess = this.route.snapshot.url[0]?.path === 'success';
  }
}