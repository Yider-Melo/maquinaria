import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';
import { RatingForm } from '../form/form';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { formatDate, formatId, estadoLabel } from '../../shared/utils';
import { Rating, Booking, Machinery, PaginatedResponse, ApiResponse } from '../../core/models';

@Component({
  selector: 'app-ratings-list', templateUrl: './list.html', styleUrls: ['./list.css'],
  standalone: false
})
export class RatingsList implements OnInit {
  ratings: Rating[] = []; receivedRatings: Rating[] = []; completedBookings: Booking[] = []; loading = true; error = '';

  constructor(private api: Api, private auth: Auth, private dialog: MatDialog, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loading = true; this.error = '';
    const userId = this.auth.getUser()?.id;
    if (userId) {
      const myBookings$ = this.api.get<PaginatedResponse<Booking>>('/bookings/my-bookings?size=200').pipe(catchError(() => of({ success: true, data: { data: [], total: 0, page: 1, size: 200 } })));
      const bookingCalls: Observable<ApiResponse<PaginatedResponse<Booking>>>[] = [myBookings$];
      if (this.auth.esTipo('propietario')) {
        bookingCalls.push(this.api.get<PaginatedResponse<Booking>>('/bookings/my-listings?size=200').pipe(catchError(() => of({ success: true, data: { data: [], total: 0, page: 1, size: 200 } }))));
      }
      forkJoin([
        this.api.get<Rating[]>('/ratings/my').pipe(catchError(() => of({ success: true, data: [] }))),
        this.api.get<Rating[]>('/ratings/user/' + userId).pipe(catchError(() => of({ success: true, data: [] }))),
        ...bookingCalls
      ]).pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      ).subscribe({
        next: (results) => {
          this.ratings = results[0]?.data || [];
          this.receivedRatings = results[1]?.data || [];
          const ratedBookingIds = new Set([...this.ratings, ...this.receivedRatings].map((r: Rating) => r.reserva_id));
          const asArrendatario: Booking[] = (results[2] as any)?.data?.data || [];
          const asPropietario: Booking[] = results.length > 3 ? (results[3] as any)?.data?.data || [] : [];
          const allCompleted = [...asArrendatario, ...asPropietario].filter((b: Booking) => (b.estado === 'completada' || b.estado === 'pagada') && !ratedBookingIds.has(b.id));
          this.completedBookings = allCompleted;
          this.enrichRatings(this.ratings);
          this.enrichBookingsWithMachinery(this.completedBookings);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'No se pudieron cargar las calificaciones.';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.loading = false;
    }
  }

  private enrichRatings(ratings: Rating[]): void {
    const uniqueIds = [...new Set(ratings.filter(r => r?.maquinaria_id).map(r => r.maquinaria_id))];
    if (uniqueIds.length === 0) return;

    forkJoin(uniqueIds.map(id => this.api.get<Machinery>(`/machinery/${id}`).pipe(catchError(() => of({ success: true, data: null! }))))).subscribe({
      next: (results) => {
        const machinesById = new Map<string, Machinery>();
        uniqueIds.forEach((id, index) => {
          const machine = results[index]?.data;
          if (machine) machinesById.set(id, machine);
        });

        this.ratings = ratings.map(rating => ({
          ...rating,
          maquinaria_titulo: rating?.maquinaria_titulo || machinesById.get(rating.maquinaria_id)?.titulo || `Maquinaria #${rating?.maquinaria_id?.substring(0, 8) || 'sin asignar'}`
        }));
        this.cdr.markForCheck();
      }
    });
  }

  private enrichBookingsWithMachinery(bookings: Booking[]): void {
    const uniqueIds = [...new Set(bookings.filter(b => b?.maquinaria_id).map(b => b.maquinaria_id))];
    if (uniqueIds.length === 0) {
      this.completedBookings = bookings;
      return;
    }

    forkJoin(uniqueIds.map(id => this.api.get<Machinery>(`/machinery/${id}`).pipe(catchError(() => of({ success: true, data: null! }))))).subscribe({
      next: (results) => {
        const machinesById = new Map<string, Machinery>();
        uniqueIds.forEach((id, index) => {
          const machine = results[index]?.data;
          if (machine) machinesById.set(id, machine);
        });

        this.completedBookings = bookings.map(booking => ({
          ...booking,
          maquinaria_titulo: booking?.maquinaria_titulo || machinesById.get(booking.maquinaria_id)?.titulo || `Maquinaria #${booking?.maquinaria_id?.substring(0, 8) || 'sin asignar'}`,
          maquinaria_precio: booking?.precio_total ?? machinesById.get(booking.maquinaria_id)?.precio_por_dia
        }));
        this.cdr.markForCheck();
      }
    });
  }

  formatDate = formatDate;
  formatId = formatId;
  estadoLabel = estadoLabel;

  getBookingDateLabel(booking: Booking): string {
    if (!booking?.fecha_inicio && !booking?.fecha_fin) return 'Sin fecha';
    if (!booking?.fecha_fin) return formatDate(booking.fecha_inicio);
    return `${formatDate(booking.fecha_inicio)} → ${formatDate(booking.fecha_fin)}`;
  }

  getBookingTimeLabel(booking: Booking): string {
    return booking?.fecha_inicio && booking?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }

  editarRating(rating: Rating): void {
    const dialogRef = this.dialog.open(RatingForm, {
      data: {
        reserva_id: rating.reserva_id,
        calificado_id: rating.calificado_id || (rating as any).propietario_id,
        maquinaria_id: rating.maquinaria_id,
        editando: true,
        puntuacion_existente: rating.puntuacion,
        comentario_existente: rating.comentario,
        puntuacion_maquinaria_existente: rating.puntuacion_maquinaria
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.api.put<Rating>(`/ratings/${rating.id}`, result).subscribe(() => this.ngOnInit());
      }
    });
  }

  eliminarRating(id: string): void {
    const dialogRef = this.dialog.open(ConfirmActionDialog, {
      data: { message: '¿Eliminar esta calificación definitivamente?', warn: true, confirmText: 'Eliminar' }
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.api.delete(`/ratings/${id}`).subscribe(() => this.ngOnInit());
    });
  }

  openRatingDialog(booking: Booking): void {
    const userId = this.auth.getUser()?.id;
    const calificadoId = booking.propietario_id === userId ? booking.arrendatario_id : booking.propietario_id;
    const dialogRef = this.dialog.open(RatingForm, {
      data: {
        reserva_id: booking.id,
        calificado_id: calificadoId,
        maquinaria_id: booking.maquinaria_id
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const { reserva_id, calificado_id, maquinaria_id, puntuacion, comentario } = result;
        this.api.post<Rating>('/ratings', { reserva_id, calificado_id, maquinaria_id, puntuacion, comentario }).subscribe(() => {
          this.ngOnInit();
        });
      }
    });
  }
}
