// Componente de detalle de maquinaria. Muestra la información completa
// de un equipo, sus imágenes, y permite al propietario editar, eliminar
// o gestionar las imágenes asociadas.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-machinery-detail', templateUrl: './detail.html', styleUrls: ['./detail.css'],
  standalone: false
})
export class MachineryDetail implements OnInit {
  item: any = null; images: any[] = []; loading = true;

  constructor(
    private route: ActivatedRoute, public router: Router,
    private api: Api, public auth: Auth
  ) {}

  // Al iniciar, obtiene el ID de la ruta y carga los datos de la maquinaria.
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.api.get<any>(`/machinery/${id}`).subscribe(res => {
      this.item = res.data; this.images = res.data?.imagenes || []; this.loading = false;
    });
  }

  // Verifica si el usuario autenticado es el propietario de la maquinaria.
  isOwner(): boolean { return this.auth.getUser()?.id === this.item?.propietario_id; }

  // Elimina la maquinaria tras confirmación y redirige al listado.
  deleteItem(): void {
    if (confirm('¿Eliminar esta maquinaria?'))
      this.api.delete(`/machinery/${this.item.id}`).subscribe(() => this.router.navigate(['/machinery']));
  }

  // Lee un archivo de imagen seleccionado, lo convierte a base64 y lo sube al servidor.
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || !this.item) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const url = e.target.result;
      this.api.post(`/machinery/${this.item.id}/images`, { url }).subscribe(() => {
        this.images.push({ url, id: Date.now().toString() });
      });
    };
    reader.readAsDataURL(file);
  }

  // Elimina una imagen por su ID del servidor y la quita del arreglo local.
  removeImage(imageId: string): void {
    this.api.delete(`/machinery/${this.item.id}/images/${imageId}`).subscribe(() => {
      this.images = this.images.filter(i => i.id !== imageId);
    });
  }

  // Solicita confirmación antes de eliminar una imagen.
  deleteImage(imageId: string): void {
    if (confirm('¿Eliminar esta imagen?')) this.removeImage(imageId);
  }
}
