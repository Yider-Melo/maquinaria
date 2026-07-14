import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';

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
  standalone: false
})
export class MachineryDetail implements OnInit {
  item: any = null; images: any[] = []; loading = true; error = '';
  selectedImage = this.fallbackImage;
  booking = { fecha_inicio: '', fecha_fin: '', modalidad: 'dia', cantidad_horas: 1 };
  bookingLoading = false; checkingAvailability = false;
  availability: { checked: boolean; disponible: boolean; message: string } = { checked: false, disponible: false, message: '' };
  occupiedDates = new Set<string>();
  todayIndex = -1;

  dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  calendarWeeks: CalendarDay[][] = [];
  currentMonth: Date = new Date();
  calendarTitle = '';

  constructor(
    private route: ActivatedRoute, public router: Router,
    private api: Api, public auth: Auth,
    private dialog: MatDialog, private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Maquinaria no encontrada.';
      this.loading = false;
      return;
    }

    this.api.get<any>(`/machinery/${id}`).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res) => {
        this.item = res.data;
        this.images = res.data?.imagenes || [];
        this.selectedImage = this.images[0]?.url || this.fallbackImage;
        this.buildCalendar();
        this.loadOccupiedDates();
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
    date.setDate(date.getDate() + 2);
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
  get bookingUnits(): number { return this.booking.modalidad === 'hora' ? Number(this.booking.cantidad_horas || 0) : this.bookingDays; }
  get unitPrice(): number { return this.booking.modalidad === 'hora' ? Number(this.item?.precio_por_hora || 0) : Number(this.item?.precio_por_dia || 0); }
  get estimatedTotal(): number { return this.bookingUnits * this.unitPrice; }

  canGoPrevMonth(): boolean {
    const min = new Date();
    return this.currentMonth.getFullYear() > min.getFullYear() ||
      (this.currentMonth.getFullYear() === min.getFullYear() && this.currentMonth.getMonth() > min.getMonth());
  }

  isOwner(): boolean { return this.auth.getUser()?.id === this.item?.propietario_id; }

  prevMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.buildCalendar();
    this.markSelectedDays();
  }

  nextMonth(): void {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.buildCalendar();
    this.markSelectedDays();
  }

  reserve(): void {
    this.error = '';
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/auth/login']); return; }
    if (!this.booking.fecha_inicio || !this.booking.fecha_fin || this.bookingDays <= 0) {
      this.error = 'Selecciona un rango de fechas válido para reservar.';
      return;
    }
    if (!this.validateBookableRange()) return;
    if (this.booking.modalidad === 'hora' && (!this.item.precio_por_hora || this.booking.cantidad_horas <= 0)) {
      this.error = 'Selecciona una cantidad de horas válida para reservar por hora.';
      return;
    }
    if (!this.availability.checked || !this.availability.disponible) {
      this.error = 'Verifica la disponibilidad antes de enviar la reserva.';
      return;
    }
    this.bookingLoading = true;
    this.api.post('/bookings', {
      maquinaria_id: this.item.id,
      fecha_inicio: this.booking.fecha_inicio,
      fecha_fin: this.booking.fecha_fin,
      modalidad: this.booking.modalidad,
      cantidad_unidades: this.booking.cantidad_horas
    }).subscribe({
      next: () => {
        this.bookingLoading = false;
        this.snackBar.open('Solicitud de reserva enviada al propietario.', 'Cerrar', { duration: 3500 });
        this.router.navigate(['/bookings']);
      },
      error: (err) => {
        this.bookingLoading = false;
        this.error = err.error?.error?.message || err.error?.message || 'No se pudo crear la reserva.';
      }
    });
  }

  checkAvailability(): void {
    this.error = '';
    this.availability = { checked: false, disponible: false, message: '' };
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

    this.api.get<any>('/bookings/check-availability', {
      machineryId: this.item.id,
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
      },
      error: () => {
        this.error = 'No se pudo verificar la disponibilidad. Intenta nuevamente.';
      }
    });
  }

  resetAvailability(): void {
    this.availability = { checked: false, disponible: false, message: '' };
    this.markSelectedDays();
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
    const today = new Date().toISOString().slice(0, 10);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    this.calendarTitle = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const allDays: CalendarDay[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      allDays.push({
        date: date.toISOString().slice(0, 10), day: daysInPrevMonth - i,
        occupied: false, selected: false, past: true, isPadding: true,
        isStart: false, isEnd: false, isToday: false
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const iso = date.toISOString().slice(0, 10);
      const isToday = iso === today;
      allDays.push({
        date: iso, day: d,
        occupied: this.occupiedDates.has(iso),
        selected: false,
        past: isToday || iso < this.minDate,
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
          date: date.toISOString().slice(0, 10), day: i,
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
    endDate.setMonth(endDate.getMonth() + 2);
    endDate.setDate(0);
    this.api.get<any>(`/bookings/machinery/${this.item.id}/occupied`, { start, end: endDate.toISOString().slice(0, 10) }).subscribe({
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

  deleteItem(): void {
    const dialogRef = this.dialog.open(ConfirmDialog, { data: { message: '¿Estás seguro de eliminar esta maquinaria? Esta acción no se puede deshacer.' } });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.api.delete(`/machinery/${this.item.id}`).subscribe(() => this.router.navigate(['/machinery']));
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || !this.item) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const url = e.target.result;
      this.api.post(`/machinery/${this.item.id}/images`, { url }).subscribe(() => {
        this.images.push({ url, id: Date.now().toString() });
        this.selectedImage = url;
      });
    };
    reader.readAsDataURL(file);
  }

  removeImage(imageId: string): void {
    this.api.delete(`/machinery/${this.item.id}/images/${imageId}`).subscribe(() => {
      this.images = this.images.filter(i => i.id !== imageId);
    });
  }

  deleteImage(imageId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialog);
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.removeImage(imageId);
    });
  }
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Confirmar</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Aceptar</button>
    </mat-dialog-actions>
  `,
  standalone: false
})
export class ConfirmDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { message: string }) {}
}
