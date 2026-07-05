import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../core/services/api';
import { Auth } from '../core/services/auth';

@Component({ selector: 'app-profile', templateUrl: './profile.html', styleUrls: ['./profile.css'], standalone: false })
export class Profile implements OnInit {
  loading = true; saving = false; passwordSaving = false;
  profile: any = { nombre: '', apellido: '', telefono: '', foto_url: '' };
  password = { currentPassword: '', newPassword: '' };
  ownerMachines: any[] = [];
  renterBookings: any[] = [];
  selectedMachine: any = null;
  machineImages: any[] = [];
  imageUrl = '';
  imageLoading = false;
  error = '';

  constructor(private api: Api, private auth: Auth, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.get<any>('/auth/profile').subscribe({
      next: (res) => {
        this.profile = res.data;
        this.loading = false;
        if (this.canManageMachineryImages) this.loadOwnerMachines();
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

  get availableOwnerMachines(): any[] {
    return this.ownerMachines.filter(machine => machine.disponible !== false);
  }

  get activeRenterBookings(): any[] {
    return this.renterBookings.filter(booking => ['pendiente', 'confirmada', 'en_curso'].includes(booking.estado));
  }

  get completedRenterBookings(): number {
    return this.renterBookings.filter(booking => booking.estado === 'completada').length;
  }

  get pendingRenterPayments(): number {
    return this.renterBookings.filter(booking => booking.estado === 'confirmada').length;
  }

  formatMachineState(state: string): string {
    const labels: Record<string, string> = { nuevo: 'Nuevo', excelente: 'Excelente', bueno: 'Bueno', regular: 'Regular' };
    return labels[state] || state || 'Sin estado';
  }

  formatBookingState(state: string): string {
    const labels: Record<string, string> = { pendiente: 'Pendiente', confirmada: 'Aprobada', en_curso: 'En curso', completada: 'Finalizada', cancelada: 'Cancelada', rechazada: 'Rechazada' };
    return labels[state] || state || 'Sin estado';
  }

  loadRenterBookings(): void {
    this.api.get<any>('/bookings/my-bookings', { size: 50 }).subscribe({
      next: (res) => this.renterBookings = res.data?.data || [],
      error: () => this.error = 'No se pudieron cargar tus reservas.'
    });
  }

  loadOwnerMachines(): void {
    this.api.get<any>('/machinery/owner', { size: 50 }).subscribe({
      next: (res) => {
        this.ownerMachines = res.data?.data || [];
        if (this.ownerMachines.length) this.selectMachine(this.ownerMachines[0]);
      },
      error: () => this.error = 'No se pudieron cargar tus maquinarias.'
    });
  }

  selectMachine(machine: any): void {
    this.selectedMachine = machine;
    this.imageUrl = '';
    this.loadMachineImages();
  }

  loadMachineImages(): void {
    if (!this.selectedMachine) return;
    this.imageLoading = true;
    this.api.get<any[]>(`/machinery/${this.selectedMachine.id}/images`).subscribe({
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
    this.api.post<any>(`/machinery/${this.selectedMachine.id}/images`, { url }).subscribe({
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

  deleteMachineImage(image: any): void {
    if (!this.selectedMachine || !image?.id) return;
    this.imageLoading = true;
    this.api.delete(`/machinery/${this.selectedMachine.id}/images/${image.id}`).subscribe({
      next: () => {
        this.snackBar.open('Foto eliminada.', 'Cerrar', { duration: 2500 });
        this.loadMachineImages();
      },
      error: () => { this.error = 'No se pudo eliminar la foto.'; this.imageLoading = false; }
    });
  }

  saveProfile(): void {
    this.saving = true; this.error = '';
    const payload = { nombre: this.profile.nombre, apellido: this.profile.apellido, telefono: this.profile.telefono, foto_url: this.profile.foto_url };
    this.api.put<any>('/auth/profile', payload).subscribe({
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
    this.api.put('/auth/profile/password', this.password).subscribe({
      next: () => { this.password = { currentPassword: '', newPassword: '' }; this.snackBar.open('Contraseña actualizada.', 'Cerrar', { duration: 3000 }); this.passwordSaving = false; },
      error: (err) => { this.error = err.error?.error?.message || 'No se pudo cambiar la contraseña.'; this.passwordSaving = false; }
    });
  }

  verifyEmail(): void {
    this.api.post<any>('/auth/profile/verify-email', {}).subscribe({
      next: (res) => { this.profile = res.data; this.snackBar.open('Correo verificado en modo demo.', 'Cerrar', { duration: 3000 }); },
      error: () => this.error = 'No se pudo verificar el correo.'
    });
  }
}
