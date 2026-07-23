import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';
import { RatingForm } from '../form/form';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { formatDate, formatId, estadoLabel } from '../../shared/utils';

@Component({
  selector: 'app-ratings-list', templateUrl: './list.html', styleUrls: ['./list.css'],
  standalone: false
})
export class RatingsList implements OnInit {
  ratings: any[] = []; receivedRatings: any[] = []; completedBookings: any[] = []; loading = true; error = '';

  constructor(private api: Api, private auth: Auth, private dialog: MatDialog, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loading = true; this.error = '';
    const userId = this.auth.getUser()?.id;
    if (userId) {
      const bookingCalls: any[] = [this.api.get<any>('/bookings/my-bookings?size=200').pipe(catchError(() => of({ data: { data: [] } })))];
      if (this.auth.esTipo('propietario')) {
        bookingCalls.push(this.api.get<any>('/bookings/my-listings?size=200').pipe(catchError(() => of({ data: { data: [] } }))));
      }
      forkJoin([
        this.api.get<any>('/ratings/my').pipe(catchError(() => of({ data: [] }))),
        this.api.get<any>('/ratings/user/' + userId).pipe(catchError(() => of({ data: [] }))),
        ...bookingCalls
      ]).pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      ).subscribe({
        next: (results: any[]) => {
          this.ratings = results[0]?.data || [];
          this.receivedRatings = results[1]?.data || [];
          const ratedBookingIds = new Set([...this.ratings, ...this.receivedRatings].map((r: any) => r.reserva_id));
          const asArrendatario = results[2]?.data?.data || [];
          const asPropietario = results.length > 3 ? results[3]?.data?.data || [] : [];
          const allCompleted = [...asArrendatario, ...asPropietario].filter((b: any) => (b.estado === 'completada' || b.estado === 'pagada') && !ratedBookingIds.has(b.id));
          this.completedBookings = allCompleted;
          this.enrichRatings(this.ratings);
          this.enrichBookingsWithMachinery(this.completedBookings);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'No se pudieron cargar las calificaciones.';
          console.error('Error loading ratings:', err);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.loading = false;
    }
  }

  private enrichRatings(ratings: any[]): void {
    const uniqueIds = [...new Set(ratings.filter((rating: any) => rating?.maquinaria_id).map((rating: any) => rating.maquinaria_id))];
    if (uniqueIds.length === 0) return;

    forkJoin(uniqueIds.map((id: string) => this.api.get<any>(`/machinery/${id}`).pipe(catchError(() => of({ data: null }))))).subscribe({
      next: (results: any[]) => {
        const machinesById = new Map<string, any>();
        uniqueIds.forEach((id: string, index: number) => {
          const machine = results[index]?.data;
          if (machine) machinesById.set(id, machine);
        });

        this.ratings = ratings.map((rating: any) => ({
          ...rating,
          maquinaria_titulo: rating?.maquinaria_titulo || machinesById.get(rating.maquinaria_id)?.titulo || `Maquinaria #${rating?.maquinaria_id?.substring(0, 8) || 'sin asignar'}`
        }));
        this.cdr.markForCheck();
      }
    });
  }

  private enrichBookingsWithMachinery(bookings: any[]): void {
    const uniqueIds = [...new Set(bookings.filter((booking: any) => booking?.maquinaria_id).map((booking: any) => booking.maquinaria_id))];
    if (uniqueIds.length === 0) {
      this.completedBookings = bookings;
      return;
    }

    forkJoin(uniqueIds.map((id: string) => this.api.get<any>(`/machinery/${id}`).pipe(catchError(() => of({ data: null }))))).subscribe({
      next: (results: any[]) => {
        const machinesById = new Map<string, any>();
        uniqueIds.forEach((id: string, index: number) => {
          const machine = results[index]?.data;
          if (machine) machinesById.set(id, machine);
        });

        this.completedBookings = bookings.map((booking: any) => ({
          ...booking,
          maquinaria_titulo: booking?.maquinaria_titulo || machinesById.get(booking.maquinaria_id)?.titulo || `Maquinaria #${booking?.maquinaria_id?.substring(0, 8) || 'sin asignar'}`,
          maquinaria_precio: booking?.precio_total ?? machinesById.get(booking.maquinaria_id)?.precio_por_dia ?? machinesById.get(booking.maquinaria_id)?.precio_por_hora
        }));
        this.cdr.markForCheck();
      }
    });
  }

  formatDate = formatDate;
  formatId = formatId;
  estadoLabel = estadoLabel;

  getBookingDateLabel(booking: any): string {
    if (!booking?.fecha_inicio && !booking?.fecha_fin) return 'Sin fecha';
    if (!booking?.fecha_fin) return formatDate(booking.fecha_inicio);
    return `${formatDate(booking.fecha_inicio)} → ${formatDate(booking.fecha_fin)}`;
  }

  getBookingTimeLabel(booking: any): string {
    if (booking?.modalidad === 'hora') {
      const hours = Number(booking?.cantidad_horas || 1);
      return `Duración: ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return booking?.fecha_inicio && booking?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }

  editarRating(rating: any): void {
    const dialogRef = this.dialog.open(RatingForm, {
      data: {
        reserva_id: rating.reserva_id,
        calificado_id: rating.calificado_id || rating.propietario_id,
        maquinaria_id: rating.maquinaria_id,
        editando: true,
        puntuacion_existente: rating.puntuacion,
        comentario_existente: rating.comentario,
        puntuacion_maquinaria_existente: rating.puntuacion_maquinaria
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.api.put(`/ratings/${rating.id}`, result).subscribe(() => this.ngOnInit());
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

  openRatingDialog(booking: any): void {
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
        this.api.post('/ratings', result).subscribe(() => {
          this.ngOnInit();
        });
      }
    });
  }
}
