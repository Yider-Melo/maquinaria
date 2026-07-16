import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../../core/services/api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CanComponentDeactivate } from '../../core/guards/can-deactivate.guard';
import { colombiaData, machineryTypes, capacidadUnidades } from './form-data';

@Component({
  selector: 'app-machinery-form', templateUrl: './form.html', styleUrls: ['./form.css'],
  standalone: false
})
export class MachineryForm implements OnInit, CanComponentDeactivate {
  form: FormGroup;
  isEdit = false; loading = false; error = '';
  photos: { file: File; preview: string }[] = [];
  existingImages: { id: string; url: string; es_portada?: boolean }[] = [];
  isDragging = false;
  colombiaData = colombiaData;
  machineryTypes = machineryTypes;
  capacidadUnidades = capacidadUnidades;
  ciudadesPorDepto: string[] = [];

  constructor(
    private fb: FormBuilder,
    private api: Api,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      descripcion: ['', Validators.maxLength(2000)],
      tipo: ['', Validators.required],
      marca: ['', Validators.maxLength(100)],
      modelo: ['', Validators.maxLength(100)],
      anio: [null, [Validators.min(1900), Validators.max(2100)]],
      capacidad: ['', Validators.maxLength(50)],
      capacidadUnidad: ['toneladas'],
      estado: ['bueno', Validators.required],
      precio_por_dia: [null, [Validators.required, Validators.min(0.01)]],
      precio_por_hora: [null, Validators.min(0.01)],
      ubicacion_lat: [null],
      ubicacion_lng: [null],
      direccion: ['', Validators.maxLength(500)],
      ciudad: ['', Validators.maxLength(100)],
      departamento: ['', Validators.maxLength(100)]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.loading = true;
      this.api.get<any>(`/machinery/${id}`).subscribe({
        next: (res) => {
          const { imagenes, ...rest } = res.data;
          this.form.patchValue(rest);
          this.existingImages = imagenes || [];
          this.loading = false;
        },
        error: () => { this.error = 'No se pudo cargar la maquinaria.'; this.loading = false; }
      });
    }
  }

  canDeactivate(): boolean {
    if (this.form.dirty && !this.loading) {
      return confirm('Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?');
    }
    return true;
  }

  onDepartamentoChange(): void {
    this.form.patchValue({ ciudad: '', ubicacion_lat: null, ubicacion_lng: null });
    const depto = this.colombiaData.find(d => d.departamento === this.form.value.departamento);
    this.ciudadesPorDepto = depto ? depto.ciudades : [];
  }

  onLocationChange(loc: { lat: number; lng: number }): void {
    this.form.patchValue({ ubicacion_lat: loc.lat, ubicacion_lng: loc.lng });
  }

  onPhotoDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    this.addPhotoFiles(event.dataTransfer?.files);
  }

  onPhotoDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onPhotoDragLeave(): void { this.isDragging = false; }

  onPhotoInput(event: Event): void {
    this.addPhotoFiles((event.target as HTMLInputElement).files);
    (event.target as HTMLInputElement).value = '';
  }

  removePhoto(index: number): void {
    this.photos.splice(index, 1);
  }

  removeExistingImage(imageId: string): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.delete(`/machinery/${id}/images/${imageId}`).subscribe({
      next: () => {
        this.existingImages = this.existingImages.filter(i => i.id !== imageId);
        this.snackBar.open('Imagen eliminada', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snackBar.open('No se pudo eliminar la imagen', 'Cerrar', { duration: 3000 })
    });
  }

  private addPhotoFiles(files: FileList | null | undefined): void {
    if (!files) return;
    this.error = '';
    Array.from(files).filter(file => file.type.startsWith('image/')).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'Cada foto debe pesar máximo 5 MB.';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') this.photos.push({ file, preview: reader.result });
      };
      reader.readAsDataURL(file);
    });
  }

  fieldHasError(field: string, error: string): boolean {
    const ctrl = this.form.get(field);
    return ctrl ? ctrl.hasError(error) && (ctrl.dirty || ctrl.touched) : false;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => this.form.get(key)?.markAsTouched());
      this.error = 'Corrige los campos marcados en rojo antes de guardar.';
      return;
    }
    const totalFotos = this.existingImages.length + this.photos.length;
    if (!this.isEdit && totalFotos < 4) {
      this.error = 'Debes subir mínimo 4 fotos del vehículo o maquinaria.';
      return;
    }
    this.loading = true;
    this.form.markAsPristine();
    const formValue = { ...this.form.value };
    if (formValue.capacidad) {
      formValue.capacidad = `${formValue.capacidad} ${formValue.capacidadUnidad || 'toneladas'}`;
    }
    delete formValue.capacidadUnidad;
    const obs = this.isEdit
      ? this.api.put(`/machinery/${this.route.snapshot.paramMap.get('id')}`, formValue)
      : this.api.post('/machinery', formValue);
    obs.subscribe({
      next: (res: any) => this.uploadPhotosAndNavigate(res.data.id),
      error: (err) => {
        if (err.status === 401) {
          this.error = 'Tu sesión expiró. Inicia sesión nuevamente.';
        } else {
          this.error = err.error?.error?.message || err.error?.message || 'No se pudo guardar la maquinaria.';
        }
        this.loading = false;
      }
    });
  }

  private uploadPhotosAndNavigate(machineId: string): void {
    if (this.photos.length === 0) {
      this.router.navigate(['/machinery', machineId]);
      return;
    }
    this.snackBar.open('Maquinaria guardada correctamente', 'Cerrar', { duration: 3000 });
    const uploadRequests = this.photos.map(photo =>
      this.api.post(`/machinery/${machineId}/images`, { url: photo.preview }).pipe(
        catchError(() => of(null))
      )
    );
    forkJoin(uploadRequests).subscribe({
      next: () => this.router.navigate(['/machinery', machineId]),
      error: () => {
        this.snackBar.open('Maquinaria guardada, pero algunas fotos no se subieron', 'Cerrar', { duration: 4000 });
        this.loading = false;
      }
    });
  }
}