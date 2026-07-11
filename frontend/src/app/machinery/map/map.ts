import { Component, AfterViewInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import * as L from 'leaflet';

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
    const partes = [this.direccion, this.ciudad, this.departamento, 'Colombia'].filter(p => p?.trim());
    const q = partes.join(', ');
    if (!q || q === 'Colombia') return;

    this.buscando = true;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=co`;

    fetch(url, { headers: { 'User-Agent': 'RentaMaq/1.0' } })
      .then(r => r.json())
      .then((data: any[]) => {
        this.buscando = false;
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          this.colocarMarcador(lat, lng);
          if (this.map) this.map.setView([lat, lng], 15);
        }
      })
      .catch(() => this.buscando = false);
  }
}
