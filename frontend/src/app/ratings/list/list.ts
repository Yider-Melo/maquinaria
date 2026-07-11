import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';
import { RatingForm } from '../form/rating-form';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-ratings-list', templateUrl: './list.html', styleUrls: ['./list.css'],
  standalone: false
})
export class RatingsList implements OnInit {
  ratings: any[] = []; completedBookings: any[] = []; loading = true; error = '';

  constructor(private api: Api, private auth: Auth, private dialog: MatDialog, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loading = true; this.error = '';
    const userId = this.auth.getUser()?.id;
    if (userId) {
      forkJoin([
        this.api.get<any>(`/ratings/user/${userId}`).pipe(catchError(() => of({ data: [] }))),
        this.api.get<any>('/bookings/my-bookings').pipe(catchError(() => of({ data: { data: [] } })))
      ]).pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      ).subscribe({
        next: ([ratingsRes, bookingsRes]) => {
          this.ratings = ratingsRes?.data || [];
          this.completedBookings = (bookingsRes?.data?.data || []).filter((b: any) => b.estado === 'completada');
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

  getBookingDateLabel(booking: any): string {
    const start = booking?.fecha_inicio || 'Sin fecha';
    const end = booking?.fecha_fin ? ` al ${booking.fecha_fin}` : '';
    return `${start}${end}`;
  }

  getBookingTimeLabel(booking: any): string {
    if (booking?.modalidad === 'hora') {
      const hours = Number(booking?.cantidad_horas || 1);
      return `Duración: ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    return booking?.fecha_inicio && booking?.fecha_fin ? 'Rango de días' : 'Sin horario';
  }

  openRatingDialog(booking: any): void {
    const dialogRef = this.dialog.open(RatingForm, {
      data: {
        reserva_id: booking.id,
        calificado_id: booking.propietario_id,
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
