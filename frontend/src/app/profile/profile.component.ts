import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { Api } from '../core/services/api.service';
import { Auth } from '../core/services/auth.service';
import { SocketService } from '../core/services/socket.service';
import { watchRealtime } from '../shared/realtime';
import { SharedModule } from '../shared/shared.module';
import { formatDate, formatDateTime, formatId, estadoLabel, PLACEHOLDER_IMAGE } from '../shared/utils';
import { Usuario, BankAccount, Machinery, MachineryImage, Booking, Payment, ApiResponse, PaginatedResponse } from '../core/models';
import { compressImage } from '../shared/image-utils';
import { MachineBookingsDialog } from './machine-bookings-dialog';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    SharedModule,
    MachineBookingsDialog
  ]
})
export class Profile implements OnInit, OnDestroy {
  loading = true; saving = false; passwordSaving = false;
  private realtimeSub: Subscription | undefined;
  get placeholderImage(): string { return PLACEHOLDER_IMAGE; }
  profile: Usuario = { id: '', email: '', nombre: '', apellido: '', tipo_usuario: 'arrendatario', telefono: '', departamento: '', ciudad: '', numero_documento: '', foto_url: '' };
  departamentos = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];
  password = { currentPassword: '', newPassword: '' };
  twoFASetup = false; twoFALoading = false; twoFAQR = ''; twoFASecret = ''; twoFACode = '';
  ownerMachines: Machinery[] = [];
  ownerMachPage = 1; ownerMachSize = 6; ownerMachTotal = 0;
  renterBookings: Booking[] = [];
  renterPayments: Payment[] = [];
  ownerRequests: Booking[] = [];

  get ownerMachTotalPages(): number { return Math.ceil(this.ownerMachTotal / this.ownerMachSize) || 1; }
  bankAccount: BankAccount = { banco: '', tipo_cuenta: 'ahorros', numero_cuenta: '', titular: '', tipo_documento: 'CC', numero_documento: '' };
  bancos = ['nequi', 'bancolombia', 'davivienda', 'bbva', 'popular', 'occidente', 'bogota', 'av_villas', 'colpatria', 'caja_social'];
  tiposDocumento = ['CC', 'CE', 'NIT'];
  bankLoading = false;
  selectedMachine: any = null;
  machineImages: MachineryImage[] = [];
  imageUrl = '';
  imageLoading = false;
  error = '';

  constructor(private api: Api, private auth: Auth, private snackBar: MatSnackBar, private dialog: MatDialog, private router: Router, private cdr: ChangeDetectorRef, private socket: SocketService) {}

  ngOnInit(): void {
    this.load();
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        return t.startsWith('booking.') || t.startsWith('payment.') || t.startsWith('machinery.');
      },
      () => this.refreshSections()
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  private refreshSections(): void {
    if (this.canManageMachineryImages) {
      this.loadOwnerMachines();
      this.loadOwnerRequests();
    }
    if (this.canUseRenterProfile) {
      this.loadRenterBookings();
      this.loadRenterPayments();
    }
  }

  load(): void {
    this.api.get<Usuario>('/auth/profile').subscribe({
      next: (res) => {
        this.profile = res.data;
        this.loading = false;
        this.cdr.detectChanges();
        if (this.canManageMachineryImages) { this.loadOwnerMachines(); this.loadOwnerRequests(); this.loadBankAccount(); }
        if (this.canUseRenterProfile) { this.loadRenterBookings(); this.loadRenterPayments(); }
      },
      error: () => { this.error = 'No se pudo cargar tu perfil.'; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  get canManageMachineryImages(): boolean {
    return this.profile?.tipo_usuario === 'propietario';
  }

  get canUseRenterProfile(): boolean {
    return this.profile?.tipo_usuario === 'arrendatario';
  }

  get availableOwnerMachines(): Machinery[] {
    return this.ownerMachines.filter(machine => machine.disponible !== false);
  }

  get activeRenterBookings(): Booking[] {
    return this.renterBookings.filter(booking => ['pendiente', 'confirmada', 'pagada', 'en_curso'].includes(booking.estado));
  }

  get completedBookings(): Booking[] {
    return this.renterBookings.filter(booking => booking.estado === 'completada');
  }

  get completedCount(): number {
    return this.completedBookings.length;
  }

  get pendingRenterPayments(): number {
    return this.renterBookings.filter(booking => booking.estado === 'confirmada').length;
  }

  get recentPayments(): Payment[] {
    return this.renterPayments.slice(0, 4);
  }

  get totalGastado(): number {
    return this.completedBookings.reduce((sum, b) => sum + Number(b.precio_total || 0), 0);
  }

  get pendingOwnerRequests(): number {
    return this.ownerRequests.filter(b => b.estado === 'pendiente').length;
  }

  get ownerIncome(): number {
    return this.ownerRequests
      .filter(b => ['confirmada', 'en_curso', 'completada'].includes(b.estado))
      .reduce((sum, b) => sum + Number(b.precio_total || 0), 0);
  }

  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  estadoLabel = estadoLabel;

  formatMachineState(state: string): string {
    const labels: Record<string, string> = { nuevo: 'Nuevo', excelente: 'Excelente', bueno: 'Bueno', regular: 'Regular' };
    return labels[state] || state || 'Sin estado';
  }

  loadRenterBookings(): void {
    this.api.get<Booking[]>('/bookings/my-bookings', { size: 50 }).subscribe({
      next: (res) => { this.renterBookings = res.data || []; this.cdr.detectChanges(); },
      error: () => this.error = 'No se pudieron cargar tus reservas.'
    });
  }

  loadRenterPayments(): void {
    this.api.get<Payment[]>('/payments/my-payments', { page: 1, size: 10 }).subscribe({
      next: (res) => { this.renterPayments = res.data || []; this.cdr.detectChanges(); },
      error: () => {}
    });
  }

  loadOwnerRequests(): void {
    this.api.get<Booking[]>('/bookings/my-listings', { page: 1, size: 100 }).subscribe({
      next: (res) => { this.ownerRequests = res.data || []; this.cdr.detectChanges(); },
      error: () => this.error = 'No se pudieron cargar las solicitudes de tus equipos.'
    });
  }

  loadOwnerMachines(): void {
    this.api.get<Machinery[]>(`/machinery/owner?page=${this.ownerMachPage}&size=${this.ownerMachSize}`).subscribe({
      next: (res) => {
        const r = res as any;
        this.ownerMachTotal = r?.pagination?.total || 0;
        this.ownerMachines = r?.data || [];
        this.cdr.detectChanges();
        if (this.ownerMachines.length && !this.selectedMachine) this.selectMachine(this.ownerMachines[0]);
        if (this.ownerMachines.length && this.selectedMachine && !this.ownerMachines.find(m => m.id === this.selectedMachine.id)) {
          this.selectMachine(this.ownerMachines[0]);
        }
      },
      error: () => this.error = 'No se pudieron cargar tus maquinarias.'
    });
  }

  ownerMachPrevPage(): void { if (this.ownerMachPage > 1) { this.ownerMachPage--; this.loadOwnerMachines(); } }
  ownerMachNextPage(): void { if (this.ownerMachPage * this.ownerMachSize < this.ownerMachTotal) { this.ownerMachPage++; this.loadOwnerMachines(); } }

  openMachineBookings(machine: Machinery): void {
    this.dialog.open(MachineBookingsDialog, {
      width: '560px',
      data: { machine }
    });
  }

  selectMachine(machine: Machinery): void {
    this.selectedMachine = machine;
    this.imageUrl = '';
    this.loadMachineImages();
  }

  loadMachineImages(): void {
    if (!this.selectedMachine) return;
    this.imageLoading = true;
    this.api.get<MachineryImage[]>(`/machinery/${this.selectedMachine.id}/images`).subscribe({
      next: (res) => { this.machineImages = res.data || []; this.imageLoading = false; },
      error: () => { this.error = 'No se pudieron cargar las fotos.'; this.imageLoading = false; }
    });
  }

  addImageFromUrl(): void {
    const url = this.imageUrl.trim();
    if (!this.selectedMachine || !url) return;
    this.saveMachineImage(url);
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedMachine) return;
    if (!file.type.startsWith('image/')) {
      this.error = 'Selecciona un archivo de imagen válido.';
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error = 'La imagen no puede superar 10 MB.';
      input.value = '';
      return;
    }

    compressImage(file, 1200, 0.8).then(url => {
      this.saveMachineImage(url);
      input.value = '';
    }).catch(() => {
      this.error = 'No se pudo procesar la imagen seleccionada.';
      input.value = '';
    });
  }

  saveMachineImage(url: string): void {
    this.imageLoading = true;
    this.error = '';
    this.api.post<MachineryImage>(`/machinery/${this.selectedMachine!.id}/images`, { url }).subscribe({
      next: () => {
        this.imageUrl = '';
        this.snackBar.open('Foto agregada a la maquinaria.', 'Cerrar', { duration: 3000 });
        this.loadMachineImages();
      },
      error: (err) => {
        this.error = err.error?.error?.message || 'No se pudo guardar la foto.';
        this.imageLoading = false;
      }
    });
  }

  deleteMachineImage(image: MachineryImage): void {
    if (!this.selectedMachine || !image?.id) return;
    const dialogRef = this.dialog.open(ConfirmDeleteDialog, { data: { message: '¿Eliminar esta foto definitivamente?' } });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.imageLoading = true;
      this.api.delete(`/machinery/${this.selectedMachine.id}/images/${image.id}`).subscribe({
        next: () => {
          this.snackBar.open('Foto eliminada.', 'Cerrar', { duration: 2500 });
          this.loadMachineImages();
        },
        error: () => { this.error = 'No se pudo eliminar la foto.'; this.imageLoading = false; }
      });
    });
  }

  saveProfile(): void {
    this.saving = true; this.error = '';
    const payload = {
      nombre: this.profile.nombre, apellido: this.profile.apellido, telefono: this.profile.telefono || '',
      departamento: this.profile.departamento || '', ciudad: this.profile.ciudad || '',
      numero_documento: this.profile.numero_documento || '', foto_url: this.profile.foto_url || ''
    };
    this.api.patch<Usuario>('/auth/profile', payload).subscribe({
      next: (res) => {
        this.profile = { ...this.profile, ...res.data };
        const current = this.auth.getUser();
        sessionStorage.setItem('rentamaq_user', JSON.stringify({ ...current, ...res.data }));
        this.snackBar.open('Perfil actualizado.', 'Cerrar', { duration: 3000 });
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.error = err.error?.error?.message || 'No se pudo actualizar el perfil.'; this.saving = false; this.cdr.detectChanges(); }
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.error = 'Selecciona una imagen válida.'; input.value = ''; return; }
    if (file.size > 10 * 1024 * 1024) { this.error = 'La imagen no puede superar 10 MB.'; input.value = ''; return; }
    compressImage(file, 400, 0.85).then(url => {
      this.profile.foto_url = url;
      this.cdr.markForCheck();
      input.value = '';
    }).catch(() => { this.error = 'No se pudo procesar la imagen.'; input.value = ''; });
  }

  changePassword(): void {
    this.passwordSaving = true; this.error = '';
    this.api.put<Usuario>('/auth/profile/password', this.password).subscribe({
      next: () => { this.password = { currentPassword: '', newPassword: '' }; this.snackBar.open('Contraseña actualizada.', 'Cerrar', { duration: 3000 }); this.passwordSaving = false; this.cdr.detectChanges(); },
      error: (err) => { this.error = err.error?.error?.message || 'No se pudo cambiar la contraseña.'; this.passwordSaving = false; this.cdr.detectChanges(); }
    });
  }

  setup2FA(): void {
    this.twoFALoading = true; this.error = '';
    this.api.post<any>('/auth/2fa/setup', {}).subscribe({
      next: (res) => {
        this.twoFASetup = true;
        this.twoFAQR = res.data?.qrCode || '';
        this.twoFASecret = res.data?.secret || '';
        this.twoFALoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.error = err.error?.error?.message || 'No se pudo configurar el 2FA.'; this.twoFALoading = false; this.cdr.detectChanges(); }
    });
  }

  confirm2FA(): void {
    this.twoFALoading = true; this.error = '';
    this.api.post<any>('/auth/2fa/verify', { token: this.twoFACode.trim() }).subscribe({
      next: () => {
        this.snackBar.open('2FA activado correctamente.', 'Cerrar', { duration: 3000 });
        this.twoFACode = ''; this.twoFASetup = false;
        if (this.profile) this.profile.verificado_2fa = true;
        this.twoFALoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.error = err.error?.error?.message || 'Código inválido.'; this.twoFALoading = false; this.cdr.detectChanges(); }
    });
  }

  disable2FA(): void {
    this.twoFALoading = true; this.error = '';
    this.api.post<any>('/auth/2fa/disable', { token: this.twoFACode.trim() }).subscribe({
      next: () => {
        this.snackBar.open('2FA desactivado.', 'Cerrar', { duration: 3000 });
        this.twoFACode = '';
        if (this.profile) this.profile.verificado_2fa = false;
        this.twoFALoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => { this.error = err.error?.error?.message || 'No se pudo desactivar el 2FA.'; this.twoFALoading = false; this.cdr.detectChanges(); }
    });
  }

  loadBankAccount(): void {
    this.api.get<BankAccount>('/auth/bank-account').subscribe({
      next: (res) => { if (res.data) this.bankAccount = res.data; },
      error: () => {}
    });
  }

  saveBankAccount(): void {
    this.bankLoading = true; this.error = '';
    this.api.put<BankAccount>('/auth/bank-account', this.bankAccount).subscribe({
      next: (res) => {
        this.bankAccount = res.data;
        this.snackBar.open('Cuenta bancaria guardada.', 'Cerrar', { duration: 3000 });
        this.bankLoading = false;
      },
      error: (err) => { this.error = err.error?.error?.message || 'No se pudo guardar la cuenta.'; this.bankLoading = false; }
    });
  }

  deleteAccount(): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialog, { data: { message: '¿Estás seguro de eliminar tu cuenta? Esta acción es irreversible. Se cerrarán todas tus sesiones y no podrás recuperar tus datos.' } });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.delete('/auth/profile').subscribe({
        next: () => {
          this.snackBar.open('Cuenta eliminada correctamente.', 'Cerrar', { duration: 5000 });
          this.auth.logout();
          this.router.navigate(['/']);
        },
        error: (err) => this.error = err.error?.error?.message || 'No se pudo eliminar la cuenta.'
      });
    });
  }

  deleteBankAccount(): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialog, { data: { message: '¿Eliminar tu cuenta bancaria? Si no hay cuenta configurada, el pago se quedará en RentaMaq.' } });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.delete('/auth/bank-account').subscribe({
        next: () => {
          this.bankAccount = { banco: '', tipo_cuenta: 'ahorros', numero_cuenta: '', titular: '', tipo_documento: 'CC', numero_documento: '' };
          this.snackBar.open('Cuenta bancaria eliminada.', 'Cerrar', { duration: 3000 });
        },
        error: () => this.error = 'No se pudo eliminar la cuenta.'
      });
    });
  }
}

@Component({
  selector: 'app-confirm-delete-dialog',
  template: `
    <h2 mat-dialog-title>Confirmar</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Eliminar</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatButtonModule, MatDialogModule]
})
export class ConfirmDeleteDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { message: string }) {}
}
