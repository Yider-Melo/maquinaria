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
