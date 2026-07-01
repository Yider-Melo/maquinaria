// Componente de formulario de maquinaria. Sirve tanto para crear una
// nueva maquinaria como para editar una existente, dependiendo de si
// se recibe un ID en la ruta.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-machinery-form', templateUrl: './form.html', styleUrls: ['./form.css'],
  standalone: false
})
export class MachineryForm implements OnInit {
  isEdit = false; loading = false;
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
      this.api.get<any>(`/machinery/${id}`).subscribe(res => {
        const { imagenes, ...rest } = res.data;
        this.data = rest;
      });
    }
  }

  // Actualiza las coordenadas de ubicación desde el componente de mapa.
  onLocationChange(loc: { lat: number; lng: number }): void {
    this.data.ubicacion_lat = loc.lat;
    this.data.ubicacion_lng = loc.lng;
  }

  // Envía el formulario: crea o actualiza según el modo, y redirige al detalle.
  onSubmit(): void {
    this.loading = true;
    const obs = this.isEdit
      ? this.api.put(`/machinery/${this.route.snapshot.paramMap.get('id')}`, this.data)
      : this.api.post('/machinery', this.data);
    obs.subscribe({ next: (res: any) => this.router.navigate(['/machinery', res.data.id]), error: () => this.loading = false });
  }
}
