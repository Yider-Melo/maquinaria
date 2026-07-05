import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';
import { RatingForm } from '../form/rating-form';

@Component({
  selector: 'app-ratings-list', templateUrl: './list.html', styleUrls: ['./list.css'],
  standalone: false
})
export class RatingsList implements OnInit {
  ratings: any[] = []; completedBookings: any[] = []; loading = true; error = '';

  constructor(private api: Api, private auth: Auth, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loading = true; this.error = '';
    const userId = this.auth.getUser()?.id;
    if (userId) {
      Promise.all([
        this.api.get<any>(`/ratings/user/${userId}`).toPromise().then(res => this.ratings = res?.data || []).catch(() => this.ratings = []),
        this.api.get<any>('/bookings/my-bookings').toPromise().then(res => this.completedBookings = (res?.data?.data || []).filter((b: any) => b.estado === 'completada')).catch(() => this.completedBookings = [])
      ]).then(() => this.loading = false).catch(() => { this.error = 'No se pudieron cargar las calificaciones.'; this.loading = false; });
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
