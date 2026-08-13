import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { RatingForm } from '../form/form';
import { forkJoin, of, Observable, Subscription } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { watchRealtime } from '../../shared/realtime';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { formatDate, formatId, estadoLabel } from '../../shared/utils';
import { Rating, Booking, Machinery, PaginatedResponse, ApiResponse } from '../../core/models';

@Component({
  selector: 'app-ratings-list', templateUrl: './list.html', styleUrls: ['./list.css'],
  standalone: false
})
export class RatingsList implements OnInit, OnDestroy {
  ratings: Rating[] = []; receivedRatings: Rating[] = []; completedBookings: Booking[] = []; loading = true; error = '';
  pageMy = 1; size = 10; totalMy = 0;
  pageReceived = 1; totalReceived = 0;
  pendingPage = 1; pendingSize = 10; pendingTotal = 0;
  private realtimeSub: Subscription | undefined;

  get totalPagesMy(): number { return Math.ceil(this.totalMy / this.size) || 1; }
  get totalPagesReceived(): number { return Math.ceil(this.totalReceived / this.size) || 1; }
  get totalPagesPending(): number { return Math.ceil(this.pendingTotal / this.pendingSize) || 1; }

  constructor(private api: Api, private auth: Auth, private dialog: MatDialog, private cdr: ChangeDetectorRef, private socket: SocketService) {}

  ngOnInit(): void {
    this.loadAll();
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        return t.startsWith('booking.') || t.startsWith('machinery.');
      },
      () => this.loadAll()
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  prevPageMy(): void { if (this.pageMy > 1) { this.pageMy--; this.loadRatings(); } }
  nextPageMy(): void { if (this.pageMy * this.size < this.totalMy) { this.pageMy++; this.loadRatings(); } }
  prevPageReceived(): void { if (this.pageReceived > 1) { this.pageReceived--; this.loadReceived(); } }
  nextPageReceived(): void { if (this.pageReceived * this.size < this.totalReceived) { this.pageReceived++; this.loadReceived(); } }
  prevPagePending(): void { if (this.pendingPage > 1) { this.pendingPage--; this.loadAll(); } }
  nextPagePending(): void { if (this.pendingPage * this.pendingSize < this.pendingTotal) { this.pendingPage++; this.loadAll(); } }

  private loadAll(): void {
    this.loading = true; this.error = '';
    forkJoin([this.loadRatings(), this.loadReceived(), this.loadPending()]).pipe(
      finalize(() => { this.loading = false; this.cdr.markForCheck(); })
    ).subscribe();
  }

  private loadRatings(): Observable<any> {
    return this.api.get<Rating[]>(`/ratings/my?page=${this.pageMy}&size=${this.size}`).pipe(
      catchError(() => of({ success: true, data: [], pagination: { total: 0, page: 1, size: 20, totalPages: 1 } } as any)),
      tap((res: any) => {
        this.totalMy = res?.pagination?.total || 0;
        this.ratings = (res?.data || []).map((x: Rating) => ({ ...x }));
        this.enrichRatings(this.ratings);
      })
    );
  }

  private loadReceived(): Observable<any> {
    const userId = this.auth.getUser()?.id;
    if (!userId) return of(null);
    return this.api.get<Rating[]>(`/ratings/user/${userId}?page=${this.pageReceived}&size=${this.size}`).pipe(
      catchError(() => of({ success: true, data: [], pagination: { total: 0, page: 1, size: 20, totalPages: 1 } } as any)),
      tap((res: any) => {
        this.totalReceived = res?.pagination?.total || 0;
        this.receivedRatings = (res?.data || []).map((x: Rating) => ({ ...x }));
      })
    );
  }

  private loadPending(): Observable<any> {
    const userId = this.auth.getUser()?.id;
    if (!userId) return of(null);
    const myBookings$ = this.api.get<Booking[]>(`/bookings/my-bookings?page=${this.pendingPage}&size=${this.pendingSize}`).pipe(
      catchError(() => of({ success: true, data: [], pagination: { total: 0 } } as any))
    );
    const bookingCalls = [myBookings$];
    if (this.auth.esTipo('propietario')) {
      bookingCalls.push(this.api.get<Booking[]>(`/bookings/my-listings?page=${this.pendingPage}&size=${this.pendingSize}`).pipe(
        catchError(() => of({ success: true, data: [], pagination: { total: 0 } } as any))
      ));
    }
    return forkJoin(bookingCalls).pipe(
      tap((results) => {
        const r0 = results[0] as any;
        const r1 = results[1] as any;
        const asArrendatario = r0?.data || [];
        const arrendatarioTotal = r0?.pagination?.total || 0;
        const asPropietario = r1?.data || [];
        const propietarioTotal = r1?.pagination?.total || 0;
        const all = [...asArrendatario, ...asPropietario];
        this.pendingTotal = arrendatarioTotal + propietarioTotal;
        const ratedBookingIds = new Set([...this.ratings, ...this.receivedRatings].map((r: Rating) => r.reserva_id));
        this.completedBookings = all.filter((b: Booking) => (b.estado === 'completada' || b.estado === 'pagada') && !ratedBookingIds.has(b.id));
        this.enrichBookingsWithMachinery(this.completedBookings);
      })
    );
  }

  private enrichRatings(ratings: Rating[]): void {
    const uniqueIds = [...new Set(ratings.filter(r => r?.maquinaria_id).map(r => r.maquinaria_id))];
    if (uniqueIds.length === 0) return;

    forkJoin(uniqueIds.map(id => this.api.get<Machinery>(`/machinery/${id}`).pipe(catchError(() => of({ success: true, data: null! }))))).subscribe({
      next: (results) => {
        setTimeout(() => {
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
        }, 0);
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
        setTimeout(() => {
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
        }, 0);
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
