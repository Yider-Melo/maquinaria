// Componente de formulario de maquinaria. Sirve tanto para crear una
// nueva maquinaria como para editar una existente, dependiendo de si
// se recibe un ID en la ruta.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-machinery-form', templateUrl: './form.html', styleUrls: ['./form.css'],
  standalone: false
})
export class MachineryForm implements OnInit {
  isEdit = false; loading = false; error = '';
  photos: { file: File; preview: string }[] = [];
  isDragging = false;
  data: any = {
    titulo:'', descripcion:'', tipo:'', marca:'', modelo:'', anio:null,
    capacidad:'', estado:'bueno', precio_por_dia:null, precio_por_hora:null,
    ubicacion_lat:null, ubicacion_lng:null, direccion:'', ciudad:'', departamento:''
  };

  constructor(private api: Api, private route: ActivatedRoute, private router: Router) {}

  // Al iniciar, si hay un ID en la ruta, carga los datos existentes para edición.
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.loading = true;
      this.api.get<any>(`/machinery/${id}`).subscribe({
        next: (res) => { const { imagenes, ...rest } = res.data; this.data = rest; this.loading = false; },
        error: () => { this.error = 'No se pudo cargar la maquinaria.'; this.loading = false; }
      });
    }
  }

  // Actualiza las coordenadas de ubicación desde el componente de mapa.
  onLocationChange(loc: { lat: number; lng: number }): void {
    this.data.ubicacion_lat = loc.lat;
    this.data.ubicacion_lng = loc.lng;
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

  private addPhotoFiles(files: FileList | null | undefined): void {
    if (!files) return;
    this.error = '';
    Array.from(files).filter(file => file.type.startsWith('image/')).forEach(file => {
      if (file.size > 900 * 1024) {
        this.error = 'Cada foto debe pesar máximo 900 KB en este modo demo.';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') this.photos.push({ file, preview: reader.result });
      };
      reader.readAsDataURL(file);
    });
  }

  // Envía el formulario: crea o actualiza según el modo, y redirige al detalle.
  onSubmit(): void {
    if (!this.isEdit && this.photos.length < 4) {
      this.error = 'Debes subir mínimo 4 fotos del vehículo o maquinaria.';
      return;
    }
    this.loading = true;
    const obs = this.isEdit
      ? this.api.put(`/machinery/${this.route.snapshot.paramMap.get('id')}`, this.data)
      : this.api.post('/machinery', this.data);
    obs.subscribe({
      next: (res: any) => this.uploadPhotosAndNavigate(res.data.id),
      error: () => { this.error = 'No se pudo guardar la maquinaria.'; this.loading = false; }
    });
  }

  private uploadPhotosAndNavigate(machineId: string): void {
    if (this.photos.length === 0) {
      this.router.navigate(['/machinery', machineId]);
      return;
    }
    const uploadRequests = this.photos.map(photo => 
      this.api.post(`/machinery/${machineId}/images`, { url: photo.preview }).pipe(
        catchError(() => of(null))
      )
    );
    forkJoin(uploadRequests).subscribe({
      next: () => this.router.navigate(['/machinery', machineId]),
      error: () => { 
        this.error = 'La maquinaria se guardó, pero no se pudieron subir todas las fotos.'; 
        this.loading = false; 
      }
    });
  }
}
