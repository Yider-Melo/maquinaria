import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Api } from '../../core/services/api';
import { formatDate, formatDateTime, formatId } from '../../shared/utils';

@Component({
  standalone: false,
  selector: 'app-ratings-detail', templateUrl: './detail.html', styleUrls: ['./detail.css']
})
export class RatingsDetail implements OnInit {
  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  rating: any = null; loading = true; error = '';

  constructor(
    private route: ActivatedRoute,
    private api: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Calificación no encontrada.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    this.loadRating(id);
  }

  private loadRating(id: string): void {
    this.api.get<any>(`/ratings/user/${id}`).subscribe({
      next: (res: any) => {
        const data = res?.data;
        if (!data || (Array.isArray(data) && data.length === 0)) {
          this.error = 'No se pudo cargar la calificación.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        const item = Array.isArray(data) ? data.find((r: any) => r.id === id) : data;
        if (!item) {
          this.error = 'Calificación no encontrada.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.rating = item;

        const requests: any[] = [];

        if (this.rating?.maquinaria_id) {
          requests.push(
            this.api.get<any>(`/machinery/${this.rating.maquinaria_id}`).pipe(catchError(() => of({ data: null })))
          );
        } else {
          requests.push(of({ data: null }));
        }

        if (this.rating?.reserva_id) {
          requests.push(
            this.api.get<any>(`/bookings/${this.rating.reserva_id}`).pipe(catchError(() => of({ data: null })))
          );
        } else {
          requests.push(of({ data: null }));
        }

        if (this.rating?.calificador_id) {
          requests.push(
            this.api.get<any>(`/auth/profile`).pipe(catchError(() => of({ data: null })))
          );
        } else {
          requests.push(of({ data: null }));
        }

        if (requests.length === 0) {
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        forkJoin(requests).subscribe({
          next: (results: any[]) => {
            const machineRes = results[0];
            const bookingRes = results[1];
            const machine = machineRes?.data;
            const booking = bookingRes?.data;

            if (machine) {
              this.rating.maquinaria_titulo = machine.titulo;
              this.rating.maquinaria_tipo = machine.tipo;
              this.rating.maquinaria_estado = machine.estado;
              this.rating.maquinaria_precio = machine.precio_por_dia ?? machine.precio_por_hora;
            }
            if (booking) {
              this.rating.booking = booking;
              this.rating.fecha_inicio = booking.fecha_inicio;
              this.rating.fecha_fin = booking.fecha_fin;
              this.rating.modalidad = booking.modalidad;
              this.rating.precio_total = booking.precio_total;
            }

            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.error = 'No se pudo cargar la calificación.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  getBookingDateLabel(): string {
    if (!this.rating?.fecha_inicio && !this.rating?.fecha_fin) return 'Sin fecha';
    if (!this.rating?.fecha_fin) return formatDate(this.rating.fecha_inicio);
    return `${formatDate(this.rating.fecha_inicio)} → ${formatDate(this.rating.fecha_fin)}`;
  }

  getBookingTimeLabel(): string {
    if (this.rating?.modalidad === 'hora') {
      const hours = Number(this.rating?.cantidad_horas || 1);
      return `Duración: ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return this.rating?.fecha_inicio && this.rating?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }
}
