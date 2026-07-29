import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
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
import { Api } from '../core/services/api.service';
import { Auth } from '../core/services/auth.service';
import { SharedModule } from '../shared/shared.module';
import { formatDate, formatDateTime, formatId, estadoLabel } from '../shared/utils';
import { Usuario, BankAccount, Machinery, MachineryImage, Booking, ApiResponse, PaginatedResponse } from '../core/models';

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
    SharedModule
  ]
})
export class Profile implements OnInit {
  loading = true; saving = false; passwordSaving = false;
  profile: Usuario = { id: '', email: '', nombre: '', apellido: '', tipo_usuario: 'arrendatario', telefono: '', departamento: '', foto_url: '' };
  departamentos = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];
  password = { currentPassword: '', newPassword: '' };
  ownerMachines: Machinery[] = [];
  renterBookings: Booking[] = [];
  bankAccount: BankAccount = { banco: '', tipo_cuenta: 'ahorros', numero_cuenta: '', titular: '', tipo_documento: 'CC', numero_documento: '' };
  bancos = ['nequi', 'bancolombia', 'davivienda', 'bbva', 'popular', 'occidente', 'bogota', 'av_villas', 'colpatria', 'caja_social'];
  tiposDocumento = ['CC', 'CE', 'NIT'];
  bankLoading = false;
  selectedMachine: any = null;
  machineImages: MachineryImage[] = [];
  imageUrl = '';
  imageLoading = false;
  error = '';

  constructor(private api: Api, private auth: Auth, private snackBar: MatSnackBar, private dialog: MatDialog, private router: Router) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<Usuario>('/auth/profile').subscribe({
      next: (res) => {
        this.profile = res.data;
        this.loading = false;
        if (this.canManageMachineryImages) { this.loadOwnerMachines(); this.loadBankAccount(); }
        if (this.canUseRenterProfile) this.loadRenterBookings();
      },
      error: () => { this.error = 'No se pudo cargar tu perfil.'; this.loading = false; }
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
    return this.renterBookings.filter(booking => ['pendiente', 'confirmada', 'en_curso'].includes(booking.estado));
  }

  get completedRenterBookings(): number {
    return this.renterBookings.filter(booking => booking.estado === 'completada').length;
  }

  get pendingRenterPayments(): number {
    return this.renterBookings.filter(booking => booking.estado === 'confirmada').length;
  }

  formatDate = formatDate;
  formatId = formatId;
  estadoLabel = estadoLabel;

  formatMachineState(state: string): string {
    const labels: Record<string, string> = { nuevo: 'Nuevo', excelente: 'Excelente', bueno: 'Bueno', regular: 'Regular' };
    return labels[state] || state || 'Sin estado';
  }

  loadRenterBookings(): void {
    this.api.get<PaginatedResponse<Booking>>('/bookings/my-bookings', { size: 50 }).subscribe({
      next: (res) => this.renterBookings = res.data?.data || [],
      error: () => this.error = 'No se pudieron cargar tus reservas.'
    });
  }

  loadOwnerMachines(): void {
    this.api.get<PaginatedResponse<Machinery>>('/machinery/owner', { size: 50 }).subscribe({
      next: (res) => {
        this.ownerMachines = res.data?.data || [];
        if (this.ownerMachines.length) this.selectMachine(this.ownerMachines[0]);
      },
      error: () => this.error = 'No se pudieron cargar tus maquinarias.'
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
    if (file.size > 900 * 1024) {
      this.error = 'La imagen no puede superar 900 KB en este modo demo.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') this.saveMachineImage(reader.result);
      input.value = '';
    };
    reader.onerror = () => {
      this.error = 'No se pudo leer la imagen seleccionada.';
      input.value = '';
    };
    reader.readAsDataURL(file);
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
    const payload = { nombre: this.profile.nombre, apellido: this.profile.apellido, telefono: this.profile.telefono, departamento: this.profile.departamento, foto_url: this.profile.foto_url };
    this.api.put<Usuario>('/auth/profile', payload).subscribe({
      next: (res) => {
        const current = this.auth.getUser();
        localStorage.setItem('rentamaq_user', JSON.stringify({ ...current, ...res.data }));
        this.snackBar.open('Perfil actualizado.', 'Cerrar', { duration: 3000 });
        this.saving = false;
      },
      error: (err) => { this.error = err.error?.error?.message || 'No se pudo actualizar el perfil.'; this.saving = false; }
    });
  }

  changePassword(): void {
    this.passwordSaving = true; this.error = '';
    this.api.put<Usuario>('/auth/profile/password', this.password).subscribe({
      next: () => { this.password = { currentPassword: '', newPassword: '' }; this.snackBar.open('Contraseña actualizada.', 'Cerrar', { duration: 3000 }); this.passwordSaving = false; },
      error: (err) => { this.error = err.error?.error?.message || 'No se pudo cambiar la contraseña.'; this.passwordSaving = false; }
    });
  }

  verifyEmail(): void {
    this.api.post<Usuario>('/auth/profile/verify-email', {}).subscribe({
      next: (res) => { this.profile = res.data; this.snackBar.open('Correo verificado en modo demo.', 'Cerrar', { duration: 3000 }); },
      error: () => this.error = 'No se pudo verificar el correo.'
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
