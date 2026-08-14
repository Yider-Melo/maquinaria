import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { watchRealtime } from '../../shared/realtime';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { Machinery, MachineryImage, Rating, Booking, OccupiedDates, CheckAvailability, ApiResponse, PaginatedResponse, Usuario } from '../../core/models';

interface CalendarDay {
  date: string;
  day: number;
  occupied: boolean;
  selected: boolean;
  past: boolean;
  isPadding: boolean;
  isStart: boolean;
  isEnd: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-machinery-detail', templateUrl: './detail.html', styleUrls: ['./detail.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MachineryDetail implements OnInit, OnDestroy {
  item: any = null; images: MachineryImage[] = []; loading = true; error = '';
  private realtimeSub: Subscription | undefined;
  selectedImage = this.fallbackImage;
  ratings: Rating[] = []; ratingAverage = 0; ratingCount = 0;
  propietarioNombre = '';
  booking = { fecha_inicio: '', fecha_fin: '', modalidad: 'dia' };
  bookingLoading = false; checkingAvailability = false;
  availability: { checked: boolean; disponible: boolean; message: string } = { checked: false, disponible: false, message: '' };
  occupiedDates = new Set<string>();
  todayIndex = -1;

  dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  calendarWeeks: CalendarDay[][] = [];
  currentMonth: Date = new Date();
  calendarTitle = '';

  trackById(_index: number, item: Machinery | Rating): string { return item?.id || String(_index); }

  prevImage(): void {
    if (this.images.length < 2) return;
    const idx = this.images.findIndex(i => i.url === this.selectedImage);
    const prev = (idx - 1 + this.images.length) % this.images.length;
    this.selectedImage = this.images[prev].url;
  }

  nextImage(): void {
    if (this.images.length < 2) return;
    const idx = this.images.findIndex(i => i.url === this.selectedImage);
    const next = (idx + 1) % this.images.length;
    this.selectedImage = this.images[next].url;
  }

  private loadRatings(): void {
    if (!this.item?.id) return;
    this.api.get<Rating[]>(`/ratings/machinery/${this.item.id}`, { size: 100 }).subscribe({
      next: (res) => {
        this.ratings = res.data || [];
        this.ratingAverage = this.item?.puntuacion_promedio || 0;
        this.ratingCount = this.item?.total_resenas || 0;
        this.cdr.detectChanges();
      }
    });
  }

  ratingsPage = 1;
  ratingsPerPage = 4;
  ratingFilter: number | null = null;

  get filteredRatings(): Rating[] {
    return this.ratingFilter === null
      ? this.ratings
      : this.ratings.filter(r => Math.round(r.puntuacion) === this.ratingFilter);
  }

  get visibleRatings(): Rating[] {
    const list = this.filteredRatings;
    const start = (this.ratingsPage - 1) * this.ratingsPerPage;
    return list.slice(start, start + this.ratingsPerPage);
  }

  get ratingsTotalPages(): number { return Math.max(1, Math.ceil(this.filteredRatings.length / this.ratingsPerPage)); }

  prevRatingsPage(): void { if (this.ratingsPage > 1) { this.ratingsPage--; } }
  nextRatingsPage(): void { if (this.ratingsPage < this.ratingsTotalPages) { this.ratingsPage++; } }

  toggleRatingFilter(level: number | null): void {
    if (level === null) {
      this.ratingFilter = null;
    } else {
      this.ratingFilter = this.ratingFilter === level ? null : level;
    }
    this.ratingsPage = 1;
  }

  get roundedAverage(): number { return Math.round(this.ratingAverage); }

  get ratingLevels(): number[] { return [5, 4, 3, 2, 1]; }

  ratingCountFor(level: number): number {
    return this.ratings.filter(r => Math.round(r.puntuacion) === level).length;
  }

  ratingPct(level: number): number {
    if (this.ratings.length === 0) return 0;
    return Math.round((this.ratingCountFor(level) / this.ratings.length) * 100);
  }

  initials(name?: string): string {
    if (!name) return 'U';
    return name.split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() || '').join('');
  }

  trackByRating(_: number, r: Rating): string { return r.id; }

  constructor(
    private route: ActivatedRoute, public router: Router,
    private api: Api, public auth: Auth,
    private dialog: MatDialog, private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef, private socket: SocketService
  ) {}

  ngOnInit(): void {
    this.loadDetail();
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        if (t.startsWith('booking.')) return true;
        return t.startsWith('machinery.');
      },
      () => this.refreshDetail()
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private refreshDetail(): void {
    if (!this.item?.id) return;
    this.api.get<Machinery>(`/machinery/${this.item.id}`).subscribe({
      next: (res) => {
        if (!res.data) return;
        this.item = res.data;
        this.images = res.data.imagenes || [];
        if (this.images[0]?.url) this.selectedImage = this.images[0].url;
        this.loadOccupiedDates();
        this.loadRatings();
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  private loadDetail(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Maquinaria no encontrada.';
      this.loading = false;
      return;
    }

    this.api.get<Machinery>(`/machinery/${id}`).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.item = res.data;
        this.images = res.data?.imagenes || [];
        this.selectedImage = this.images[0]?.url || this.fallbackImage;
        if (this.item?.propietario_id) {
          this.api.get<Usuario>(`/auth/users/${this.item.propietario_id}`).subscribe({
            next: (userRes) => {
              const user = userRes?.data;
              if (user) this.propietarioNombre = `${user.nombre || ''} ${user.apellido || ''}`.trim();
            },
            error: () => {}
          });
        }
        this.buildCalendar();
        this.loadOccupiedDates();
        this.loadRatings();
        if (this.auth.isLoggedIn()) this.checkFavorite();
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar la maquinaria. Intenta nuevamente.';
        this.cdr.detectChanges();
      }
    });
  }

  get fallbackImage(): string { return 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80'; }
  get minDate(): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
  get bookingDays(): number {
    if (!this.booking.fecha_inicio || !this.booking.fecha_fin) return 0;
    const start = new Date(this.booking.fecha_inicio);
    const end = new Date(this.booking.fecha_fin);
    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }
  get unitPrice(): number { return Number(this.item?.precio_por_dia || 0); }
  get estimatedTotal(): number { return this.bookingDays * this.unitPrice; }
  get ivaAmount(): number { return Math.round(this.estimatedTotal * 0.19); }
  get appFee(): number { return 5000; }
  get estimatedTotalWithIVA(): number { return Math.round(this.estimatedTotal * 1.19); }
  get grandTotal(): number { return this.estimatedTotalWithIVA + this.appFee; }

  // Convierte una fecha a 'YYYY-MM-DD' usando la fecha LOCAL del navegador.
  // Evita el corrimiento de un día que produce toISOString() (UTC) en algunas zonas.
  private toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  canGoPrevMonth(): boolean {
    const min = new Date();
    return this.currentMonth.getFullYear() > min.getFullYear() ||
      (this.currentMonth.getFullYear() === min.getFullYear() && this.currentMonth.getMonth() > min.getMonth());
  }

  isOwner(): boolean { return this.auth.getUser()?.id === this.item?.propietario_id; }

  private checkFavorite(): void {
    this.api.get<{ favorito: boolean }>(`/machinery/${this.item.id}/favorite`).subscribe({
      next: (res) => { this.item.favorito = res.data?.favorito; this.cdr.markForCheck(); }
    });
  }

  toggleFavorite(event: Event): void {
    event.stopPropagation();
    const method = this.item.favorito ? 'delete' : 'post';
    this.api[method](`/machinery/${this.item.id}/favorite`).subscribe({
      next: () => { this.item.favorito = !this.item.favorito; this.cdr.markForCheck(); }
    });
  }

  prevMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.buildCalendar();
    this.markSelectedDays();
    this.loadOccupiedDates();
  }

  nextMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.buildCalendar();
    this.markSelectedDays();
    this.loadOccupiedDates();
  }

  reserve(): void {
    this.error = '';
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    if (!this.booking.fecha_inicio || !this.booking.fecha_fin || this.bookingDays <= 0) {
      this.error = 'Selecciona un rango de fechas válido para reservar.';
      return;
    }
    if (!this.validateBookableRange()) return;
    const fechaVal = new Date(this.booking.fecha_inicio + 'T12:00:00');
    const minVal = new Date(this.minDate + 'T12:00:00');
    minVal.setDate(minVal.getDate() + 1);
    if (fechaVal <= minVal) {
      this.error = 'La fecha de inicio debe ser al menos 1 día después de hoy.';
      return;
    }
    if (!this.availability.checked || !this.availability.disponible) {
      this.error = 'Verifica la disponibilidad antes de enviar la reserva.';
      return;
    }
    const modalidadLabel = `${this.bookingDays} día(s)`;
    const dialogRef = this.dialog.open(ConfirmActionDialog, {
      data: {
        message: `¿Confirmas la reserva por ${modalidadLabel}? Total a pagar: $${this.grandTotal.toLocaleString('es-CO')} (incluye IVA y cuota de servicio)`,
        confirmText: 'Reservar'
      }
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.bookingLoading = true;
      this.checkAvailability(true);
    });
  }

  private reserveAfterRecheck(): void {
    if (!this.availability.disponible) {
      this.bookingLoading = false;
      this.error = 'La disponibilidad cambió. Verifica nuevamente las fechas.';
      this.cdr.detectChanges();
      return;
    }
    this.api.post<Booking>('/bookings', {
        maquinaria_id: this.item!.id,
        fecha_inicio: this.booking.fecha_inicio,
        fecha_fin: this.booking.fecha_fin,
        modalidad: this.booking.modalidad,
        cantidad_unidades: this.bookingDays
      }).subscribe({
        next: () => {
          this.bookingLoading = false;
          this.snackBar.open('Solicitud de reserva enviada al propietario.', 'Cerrar', { duration: 3500 });
          this.router.navigate(['/bookings']);
        },
        error: (err) => {
          this.bookingLoading = false;
          this.error = err.error?.error?.message || err.error?.message || 'No se pudo crear la reserva.';
          this.cdr.detectChanges();
        }
      });
  }

  checkAvailability(afterConfirm = false): void {
    this.error = '';
    if (!afterConfirm) {
      this.availability = { checked: false, disponible: false, message: '' };
    }
    if (!this.booking.fecha_inicio || !this.booking.fecha_fin) {
      this.error = 'Selecciona una fecha de inicio y fin para consultar disponibilidad.';
      return;
    }
    if (this.booking.fecha_inicio < this.minDate || this.booking.fecha_fin < this.minDate) {
      this.error = 'No puedes agendar una fecha que ya pasó.';
      return;
    }
    if (this.booking.fecha_fin < this.booking.fecha_inicio) {
      this.error = 'La fecha final no puede ser anterior a la fecha inicial.';
      return;
    }
    this.checkingAvailability = true;

    this.api.get<CheckAvailability>('/bookings/check-availability', {
      machineryId: this.item!.id,
      start: this.booking.fecha_inicio,
      end: this.booking.fecha_fin
    }).pipe(
      finalize(() => {
        this.checkingAvailability = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        const available = !!res.data?.disponible;
        this.availability = {
          checked: true,
          disponible: available,
          message: available
            ? 'Disponible para las fechas seleccionadas.'
            : 'No disponible. Hay conflictos con otras reservas en este rango.'
        };
        this.error = '';
        if (afterConfirm) {
          this.reserveAfterRecheck();
        }
      },
      error: () => {
        this.error = 'No se pudo verificar la disponibilidad. Intenta nuevamente.';
        if (afterConfirm) {
          this.bookingLoading = false;
        }
      }
    });
  }

  onDateInputChange(): void {
    this.availability = { checked: false, disponible: false, message: '' };
    this.markSelectedDays();
    if (this.booking.fecha_inicio && this.booking.fecha_fin) {
      this.checkAvailability();
    }
  }

  selectCalendarDate(day: CalendarDay): void {
    if (day.occupied || day.past || day.isPadding) return;
    if (!this.booking.fecha_inicio || (this.booking.fecha_inicio && this.booking.fecha_fin)) {
      this.booking.fecha_inicio = day.date;
      this.booking.fecha_fin = '';
    } else if (day.date < this.booking.fecha_inicio) {
      this.booking.fecha_fin = this.booking.fecha_inicio;
      this.booking.fecha_inicio = day.date;
    } else {
      this.booking.fecha_fin = day.date;
    }
    this.markSelectedDays();
    this.availability = { checked: false, disponible: false, message: '' };
    this.error = '';
    if (this.booking.fecha_inicio && this.booking.fecha_fin) {
      this.checkAvailability();
    }
  }

  private validateBookableRange(): boolean {
    if (this.booking.fecha_inicio < this.minDate || this.booking.fecha_fin < this.minDate) {
      this.error = 'No puedes agendar una fecha que ya pasó.';
      return false;
    }
    if (this.booking.fecha_fin < this.booking.fecha_inicio) {
      this.error = 'La fecha final no puede ser anterior a la fecha inicial.';
      return false;
    }
    return true;
  }

  private buildCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const now = new Date();
    const today = this.toDateString(now);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.calendarTitle = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const allDays: CalendarDay[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      allDays.push({
        date: this.toDateString(date), day: daysInPrevMonth - i,
        occupied: false, selected: false, past: true, isPadding: true,
        isStart: false, isEnd: false, isToday: false
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const iso = this.toDateString(date);
      const isToday = iso === today;
      const isBeforeMin = new Date(iso) < new Date(this.minDate);
      allDays.push({
        date: iso, day: d,
        occupied: this.occupiedDates.has(iso),
        selected: false,
        past: isToday || isBeforeMin,
        isPadding: false,
        isStart: false,
        isEnd: false,
        isToday
      });
      if (isToday) this.todayIndex = allDays.length - 1;
    }

    const remaining = 7 - (allDays.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i);
        allDays.push({
          date: this.toDateString(date), day: i,
          occupied: false, selected: false, past: false, isPadding: true,
          isStart: false, isEnd: false, isToday: false
        });
      }
    }

    this.calendarWeeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      this.calendarWeeks.push(allDays.slice(i, i + 7));
    }
  }

  private loadOccupiedDates(): void {
    const start = this.minDate;
    const endDate = new Date(this.currentMonth);
    endDate.setMonth(endDate.getMonth() + 13);
    endDate.setDate(0);
    this.api.get<OccupiedDates>(`/bookings/machinery/${this.item!.id}/occupied`, { start, end: this.toDateString(endDate) }).subscribe({
      next: (res) => {
        this.occupiedDates = new Set(res.data?.dates || []);
        this.buildCalendar();
        this.markSelectedDays();
        this.cdr.detectChanges();
      }
    });
  }

  private markSelectedDays(): void {
    for (const week of this.calendarWeeks) {
      for (const day of week) {
        if (day.isPadding) {
          day.selected = false; day.isStart = false; day.isEnd = false;
          continue;
        }
        const inRange = !!this.booking.fecha_inicio && !!this.booking.fecha_fin
          ? day.date >= this.booking.fecha_inicio && day.date <= this.booking.fecha_fin
          : day.date === this.booking.fecha_inicio;
        day.selected = inRange && !day.occupied;
        day.isStart = day.date === this.booking.fecha_inicio;
        day.isEnd = day.date === this.booking.fecha_fin;
      }
    }
  }

  toggleDisponible(): void {
    if (!this.item) return;
    const nuevoEstado = !this.item.disponible;
    this.api.patch<Machinery>(`/machinery/${this.item!.id}`, { disponible: nuevoEstado }).subscribe({
      next: () => {
        this.item.disponible = nuevoEstado;
        this.snackBar.open(nuevoEstado ? 'Maquinaria disponible para reservas' : 'Maquinaria marcada como no disponible', 'Cerrar', { duration: 3000 });
        this.cdr.detectChanges();
      },
      error: () => this.snackBar.open('No se pudo actualizar la disponibilidad', 'Cerrar', { duration: 3000 })
    });
  }

  deleteItem(): void {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: '¿Estás seguro de eliminar esta maquinaria? Esta acción no se puede deshacer.', warn: true, confirmText: 'Eliminar' } });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.api.delete(`/machinery/${this.item!.id}`).subscribe(() => this.router.navigate(['/machinery']));
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.item) return;
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const url = e.target?.result as string;
      this.api.post<MachineryImage>(`/machinery/${this.item!.id}/images`, { url }).subscribe(() => {
        this.images.push({ url, id: Date.now().toString() });
        this.selectedImage = url;
      });
    };
    reader.readAsDataURL(file);
  }

  removeImage(imageId: string): void {
    this.api.delete(`/machinery/${this.item!.id}/images/${imageId}`).subscribe(() => {
      this.images = this.images.filter(i => i.id !== imageId);
    });
  }

  deleteImage(imageId: string): void {
    const dialogRef = this.dialog.open(ConfirmActionDialog, {
      data: { message: '¿Eliminar esta imagen definitivamente?', warn: true, confirmText: 'Eliminar' }
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.removeImage(imageId);
    });
  }
}
