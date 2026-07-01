// Componente de mapa interactivo basado en Leaflet. Permite seleccionar
// una ubicación haciendo clic, y emite las coordenadas seleccionadas
// al componente padre. Soporta la inicialización con coordenadas existentes.
import { Component, OnInit, AfterViewInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import * as L from 'leaflet';

@Component({
  selector: 'app-machinery-map',
  templateUrl: './map.html',
  styleUrls: ['./map.css'],
  standalone: false
})
export class MachineryMap implements AfterViewInit {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Output() locationChange = new EventEmitter<{ lat: number; lng: number }>();
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  // Inicializa el mapa con OpenStreetMap como capa base. Si se recibieron
  // coordenadas de entrada, coloca un marcador. Escucha clics para
  // actualizar el marcador y emitir la nueva ubicación.
  ngAfterViewInit(): void {
    const defaultLat = this.lat || 4.711;
    const defaultLng = this.lng || -74.072;

    this.map = L.map(this.mapContainer.nativeElement).setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    if (this.lat && this.lng) {
      this.marker = L.marker([this.lat, this.lng]).addTo(this.map);
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.marker) this.marker.setLatLng(e.latlng);
      else this.marker = L.marker(e.latlng).addTo(this.map!);
      this.locationChange.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }
}
