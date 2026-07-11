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
      this.marker = L.marker([this.lat, this.lng]).addTo(this.map);
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.colocarMarcador(e.latlng.lat, e.latlng.lng);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['direccion'] || changes['ciudad'] || changes['departamento']) {
      this.geocodificar();
    }
  }

  colocarMarcador(lat: number, lng: number): void {
    if (this.marker) this.marker.setLatLng([lat, lng]);
    else this.marker = L.marker([lat, lng]).addTo(this.map!);
    if (this.map) this.map.setView([lat, lng], this.map.getZoom());
    this.locationChange.emit({ lat, lng });
  }

  geocodificar(): void {
    if (!this.ciudad || !this.departamento) return;

    const direccion = this.direccion?.trim() || '';
    const q1 = [direccion, this.ciudad, this.departamento, 'Colombia'].filter(p => p).join(', ');
    const q2 = [this.ciudad, this.departamento, 'Colombia'].filter(p => p).join(', ');

    this.buscando = true;
    this.intentarGeocodificar(q1, q2);
  }

  private intentarGeocodificar(q1: string, q2: string): void {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q1)}&limit=1&countrycodes=co`;

    fetch(url, { headers: { 'User-Agent': 'RentaMaq/1.0' } })
      .then(r => r.json())
      .then((data: any[]) => {
        if (data && data.length > 0 && data[0].addresstype !== 'country') {
          this.buscando = false;
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          this.colocarMarcador(lat, lng);
          if (this.map) this.map.setView([lat, lng], 15);
        } else if (q2 !== q1) {
          this.intentarGeocodificar(q2, q2);
        } else {
          this.buscando = false;
        }
      })
      .catch(() => this.buscando = false);
  }
}
