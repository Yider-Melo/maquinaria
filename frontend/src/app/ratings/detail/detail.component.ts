import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Api } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { watchRealtime } from '../../shared/realtime';
import { formatDate, formatDateTime, formatId } from '../../shared/utils';
import { Rating } from '../../core/models';

@Component({
  standalone: false,
  selector: 'app-ratings-detail', templateUrl: './detail.html', styleUrls: ['./detail.css']
})
export class RatingsDetail implements OnInit, OnDestroy {
  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  rating: any = null; loading = true; error = '';
  private realtimeSub: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private api: Api,
    private cdr: ChangeDetectorRef,
    private socket: SocketService
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
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        return t.startsWith('machinery.') || t.startsWith('booking.');
      },
      () => { if (this.rating?.id) this.loadRating(this.rating.id); }
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private loadRating(id: string): void {
    this.api.get<Rating>(`/ratings/${id}`).subscribe({
      next: (res) => {
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
    return this.rating?.fecha_inicio && this.rating?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }
}
