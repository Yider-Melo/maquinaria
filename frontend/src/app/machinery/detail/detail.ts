// Componente de detalle de maquinaria. Muestra la información completa
// de un equipo, sus imágenes, y permite al propietario editar, eliminar
// o gestionar las imágenes asociadas.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-machinery-detail', templateUrl: './detail.html', styleUrls: ['./detail.css'],
  standalone: false
})
export class MachineryDetail implements OnInit {
  item: any = null; images: any[] = []; loading = true; error = '';
  selectedImage = '';
  booking = { fecha_inicio: '', fecha_fin: '', modalidad: 'dia', cantidad_horas: 1 };
  bookingLoading = false; checkingAvailability = false;
  availability: { checked: boolean; disponible: boolean; message: string } = { checked: false, disponible: false, message: '' };
  calendarDays: { date: string; day: number; occupied: boolean; selected: boolean; past: boolean }[] = [];
  occupiedDates = new Set<string>();

  constructor(
    private route: ActivatedRoute, public router: Router,
    private api: Api, public auth: Auth,
    private dialog: MatDialog, private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error = 'Maquinaria no encontrada.'; this.loading = false; return; }
    this.api.get<any>(`/machinery/${id}`).subscribe({
      next: (res) => {
        this.item = res.data; this.images = res.data?.imagenes || [];
        this.selectedImage = this.images[0]?.url || this.fallbackImage;
        this.buildCalendar();
        this.loadOccupiedDates();
        this.loading = false;
      },
      error: () => { this.error = 'No se pudo cargar la maquinaria. Intenta nuevamente.'; this.loading = false; }
    });
  }

  get fallbackImage(): string { return 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80'; }
  get minDate(): string {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
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

  isOwner(): boolean { return this.auth.getUser()?.id === this.item?.propietario_id; }

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
      cantidad_horas: this.booking.cantidad_horas
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
    if (!this.booking.fecha_inicio || !this.booking.fecha_fin || this.bookingDays <= 0) {
      this.error = 'Selecciona fechas válidas para consultar disponibilidad.';
      return;
    }
    if (!this.validateBookableRange()) return;
    this.checkingAvailability = true;
    this.api.get<any>('/bookings/check-availability', {
      machineryId: this.item.id,
      start: this.booking.fecha_inicio,
      end: this.booking.fecha_fin
    }).subscribe({
      next: (res) => {
        const available = !!res.data?.disponible;
        this.availability = {
          checked: true,
          disponible: available,
          message: available ? 'Disponible para las fechas seleccionadas.' : 'No disponible en ese rango de fechas.'
        };
        this.checkingAvailability = false;
      },
      error: () => {
        this.error = 'No se pudo verificar la disponibilidad.';
        this.checkingAvailability = false;
      }
    });
  }

  resetAvailability(): void {
    this.availability = { checked: false, disponible: false, message: '' };
    this.markSelectedDays();
  }

  selectCalendarDate(day: any): void {
    if (day.occupied || day.past) return;
    if (!this.booking.fecha_inicio || (this.booking.fecha_inicio && this.booking.fecha_fin)) {
      this.booking.fecha_inicio = day.date;
      this.booking.fecha_fin = '';
    } else if (day.date < this.booking.fecha_inicio) {
      if (this.rangeHasOccupiedDay(day.date, this.booking.fecha_inicio)) {
        this.error = 'Ese rango incluye días ocupados. Selecciona fechas disponibles.';
        return;
      }
      this.booking.fecha_fin = this.booking.fecha_inicio;
      this.booking.fecha_inicio = day.date;
    } else {
      if (this.rangeHasOccupiedDay(this.booking.fecha_inicio, day.date)) {
        this.error = 'Ese rango incluye días ocupados. Selecciona fechas disponibles.';
        return;
      }
      this.booking.fecha_fin = day.date;
    }
    this.resetAvailability();
  }

  private validateBookableRange(): boolean {
    if (this.booking.fecha_inicio < this.minDate || this.booking.fecha_fin < this.minDate) {
      this.error = 'No puedes agendar una fecha que ya pasó.';
      return false;
    }
    if (this.rangeHasOccupiedDay(this.booking.fecha_inicio, this.booking.fecha_fin)) {
      this.error = 'La maquinaria ya está ocupada en una o más fechas seleccionadas.';
      return false;
    }
    return true;
  }

  private rangeHasOccupiedDay(start: string, end: string): boolean {
    return Array.from(this.occupiedDates).some(date => date >= start && date <= end);
  }

  private buildCalendar(): void {
    const today = new Date();
    const start = new Date(today);
    this.calendarDays = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = date.toISOString().slice(0, 10);
      return { date: iso, day: date.getDate(), occupied: this.occupiedDates.has(iso), selected: false, past: iso < this.minDate };
    });
  }

  private loadOccupiedDates(): void {
    const start = this.minDate;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 41);
    this.api.get<any>(`/bookings/machinery/${this.item.id}/occupied`, { start, end: endDate.toISOString().slice(0, 10) }).subscribe({
      next: (res) => {
        this.occupiedDates = new Set(res.data?.dates || []);
        this.calendarDays = this.calendarDays.map(day => ({ ...day, occupied: this.occupiedDates.has(day.date) }));
      }
    });
  }

  private markSelectedDays(): void {
    this.calendarDays = this.calendarDays.map(day => ({
      ...day,
      selected: !!this.booking.fecha_inicio && !!this.booking.fecha_fin
        ? day.date >= this.booking.fecha_inicio && day.date <= this.booking.fecha_fin
        : day.date === this.booking.fecha_inicio
    }));
  }

  deleteItem(): void {
    const dialogRef = this.dialog.open(ConfirmDialog);
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
    <mat-dialog-content>¿Estás seguro de realizar esta acción?</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Aceptar</button>
    </mat-dialog-actions>
  `,
  standalone: false
})
export class ConfirmDialog {}
