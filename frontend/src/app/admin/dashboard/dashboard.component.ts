import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Api } from '../../core/services/api.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { UserStats, MachineryStats } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard', templateUrl: './dashboard.html', styleUrls: ['./dashboard.css'],
  standalone: false
})
export class AdminDashboard implements OnInit {
  stats: any = {};
  loading = true;

  constructor(private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    forkJoin([
      this.api.get<MachineryStats>('/admin/machinery/stats').pipe(catchError(() => of({ success: true, data: { resumen: { activas: 0, inactivas: 0, total: 0, propietarios_con_maquinaria: 0, tipos_distintos: 0, precio_promedio_dia: 0, precio_minimo: 0, precio_maximo: 0 }, por_tipo: [] } }))),
      this.api.get<UserStats>('/admin/users/stats').pipe(catchError(() => of({ success: true, data: { total: 0, propietarios: 0, arrendatarios: 0 } })))
    ]).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ([machinery, users]) => {
        this.stats = {
          machinery: machinery?.data,
          users: users?.data
        };
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); }
    });
  }
}
