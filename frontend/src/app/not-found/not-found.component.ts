import { Component } from '@angular/core';

@Component({
  selector: 'app-not-found',
  template: `
    <div class="not-found">
      <mat-icon class="icon">search_off</mat-icon>
      <h1>404</h1>
      <p>La página que buscas no existe.</p>
      <a mat-raised-button color="primary" routerLink="/">Volver al inicio</a>
    </div>
  `,
  styles: [`
    .not-found { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; text-align: center; }
    .icon { font-size: 80px; width: 80px; height: 80px; color: #888; margin-bottom: 16px; }
    h1 { font-size: 72px; margin: 0; color: #333; }
    p { font-size: 18px; color: #666; margin: 8px 0 24px; }
  `],
  standalone: false
})
export class NotFoundComponent {}