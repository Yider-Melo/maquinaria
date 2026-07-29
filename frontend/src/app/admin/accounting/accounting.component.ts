import { Component, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { Api } from '../../core/services/api.service';

@Component({
  selector: 'app-admin-accounting', templateUrl: './accounting.html', styleUrls: ['./accounting.css'],
  standalone: false
})
export class AdminAccounting implements OnInit {
  dashboard: any = null;
  loading = true;

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.api.get<any>('/admin/payments/dashboard').pipe(
      catchError(() => of({ success: true, data: { resumen: { total_liberado: 0, total_retenido: 0, total_reembolsado: 0, total_transacciones: 0, total_fallidos: 0 }, ultimos_pagos: [] } }))
    ).subscribe({
      next: (res) => { this.dashboard = res.data; this.loading = false; }
    });
  }
}
