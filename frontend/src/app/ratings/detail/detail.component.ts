import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Api } from '../../core/services/api.service';
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
    this.api.get<any>(`/ratings/${id}`).subscribe({
      next: (res: any) => {
        this.rating = res?.data;
        if (!this.rating) {
          this.error = 'No se pudo cargar la calificación.';
        }
        this.loading = false;
        this.cdr.markForCheck();
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
