import { Component, AfterViewInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import * as L from 'leaflet';

const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = iconDefault;

@Component({
  selector: 'app-machinery-map',
  templateUrl: './map.html',
  styleUrls: ['./map.css'],
  standalone: false
})
export class MachineryMap implements AfterViewInit, OnChanges {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Input() direccion = '';
  @Input() ciudad = '';
  @Input() departamento = '';
  @Output() locationChange = new EventEmitter<{ lat: number; lng: number }>();
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  buscando = false;

  ngAfterViewInit(): void {
    const defaultLat = this.lat || 4.711;
    const defaultLng = this.lng || -74.072;

    this.map = L.map(this.mapContainer.nativeElement).setView([defaultLat, defaultLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    if (this.lat && this.lng) {
      this.colocarMarcador(this.lat, this.lng, true);
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.colocarMarcador(e.latlng.lat, e.latlng.lng);
      this.mostrarDireccion(e.latlng.lat, e.latlng.lng);
    });
  }

  private ultimoCambio = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    const ahora = Date.now();
    if (ahora - this.ultimoCambio < 500) return;
    if ((changes['direccion'] || changes['ciudad'] || changes['departamento']) && this.ciudad && this.departamento) {
      this.ultimoCambio = ahora;
      this.geocodificar();
    }
  }

  colocarMarcador(lat: number, lng: number, mantenerZoom = false): void {
    if (this.marker) this.marker.setLatLng([lat, lng]);
    else this.marker = L.marker([lat, lng]).addTo(this.map!);
    if (this.map) this.map.setView([lat, lng], mantenerZoom ? this.map.getZoom() : 15);
    this.locationChange.emit({ lat, lng });
  }

  mostrarDireccion(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`;
    fetch(url, { headers: { 'User-Agent': 'RentaMaq/1.0' } })
      .then(r => r.json())
      .then(data => {
        if (data?.display_name && this.marker) {
          this.marker.bindPopup(data.display_name).openPopup();
        }
      })
      .catch(() => {});
  }

  geocodificar(): void {
    if (!this.ciudad || !this.departamento) return;

    const direccion = this.direccion?.trim() || '';
    const q1 = [direccion, this.ciudad, this.departamento, 'Colombia'].filter(p => p).join(', ');
    const q2 = [this.ciudad, this.departamento, 'Colombia'].filter(p => p).join(', ');

    this.buscando = true;
    this._geocodificar(q1, q2);
  }

  private _geocodificar(q1: string, q2: string): void {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q1)}&limit=1&countrycodes=co`;

    fetch(url, { headers: { 'User-Agent': 'RentaMaq/1.0' } })
      .then(r => r.json())
      .then((data: any[]) => {
        this.buscando = false;
        if (data && data.length > 0 && data[0].addresstype !== 'country') {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          this.colocarMarcador(lat, lng);
          this.mostrarDireccion(lat, lng);
        } else if (q2 !== q1) {
          this._geocodificar(q2, q2);
        }
      })
      .catch(() => this.buscando = false);
  }
}
