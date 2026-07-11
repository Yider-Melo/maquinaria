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
  private geocodeController: AbortController | null = null;
  buscando = false;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement).setView([4.711, -74.072], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    L.control.scale().addTo(this.map);

    if (this.lat && this.lng) {
      this.colocarMarcador(this.lat, this.lng);
    } else if (this.ciudad && this.departamento) {
      this.geocodificar();
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.colocarMarcador(e.latlng.lat, e.latlng.lng);
    });

    setTimeout(() => this.invalidateMapSize(), 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      if (this.ciudad && this.departamento) {
        this.geocodificar();
      }
      this.invalidateMapSize();
    }, 800);
  }

  private timeoutId: any = null;

  private invalidateMapSize(): void {
    if (this.map) {
      this.map.invalidateSize({ pan: false });
    }
  }

  colocarMarcador(lat: number, lng: number): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map!);
      this.marker.on('dragend', () => {
        const position = this.marker?.getLatLng();
        if (position) {
          this.locationChange.emit({ lat: position.lat, lng: position.lng });
        }
      });
    }
    if (this.map) this.map.setView([lat, lng], 15);
    this.locationChange.emit({ lat, lng });
  }

  geocodificar(): void {
    if (!this.ciudad || !this.departamento) return;

    if (this.geocodeController) {
      this.geocodeController.abort();
      this.geocodeController = null;
    }

    const direccion = this.direccion?.trim() || '';
    const q1 = [direccion, this.ciudad, this.departamento, 'Colombia'].filter(p => p).join(', ');
    const q2 = [this.ciudad, this.departamento, 'Colombia'].filter(p => p).join(', ');
    const q3 = [this.departamento, 'Colombia'].filter(p => p).join(', ');

    this.buscando = true;
    this._geocodificar(q1, q2, q3, direccion !== '');
  }

  private _geocodificar(primary: string, fallback1: string, fallback2: string, hasDireccion: boolean): void {
    this.geocodeController = new AbortController();
    const controller = this.geocodeController;
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(primary)}&limit=5&countrycodes=co`;

    fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'RentaMaq/1.0' } })
      .then(r => r.json())
      .then((data: any[]) => {
        clearTimeout(timeout);
        if (controller.signal.aborted) return;
        const result = this.elegirMejorResultado(data);
        if (result) {
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          this.colocarMarcador(lat, lng);
          this.buscando = false;
        } else if (primary !== fallback1) {
          this._geocodificar(fallback1, fallback1, fallback2, hasDireccion);
        } else if (fallback1 !== fallback2) {
          this._geocodificar(fallback2, fallback2, fallback2, hasDireccion);
        } else {
          this.buscando = false;
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) {
          this.buscando = false;
        }
      });
  }

  private elegirMejorResultado(results: any[]): any | null {
    if (!results || results.length === 0) return null;
    const normalize = (value: string | undefined): string =>
      (value || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();

    const targetCiudad = normalize(this.ciudad);
    const targetDepartamento = normalize(this.departamento);

    const scoreCandidate = (candidate: any): number => {
      const address = candidate.address || {};
      const fields = [address.city, address.town, address.village, address.hamlet, address.municipality, address.county, address.suburb, address.state_district, address.district].map(normalize);
      const state = normalize(address.state || address.region || address.state_district || '');
      const hasDept = state && state.includes(targetDepartamento);
      const hasCity = fields.some(value => value && targetCiudad && value.includes(targetCiudad));
      let score = 0;
      if (hasDept) score += 10;
      if (hasCity) score += 20;
      if (candidate.osm_type === 'relation' || candidate.osm_type === 'way') score += 5;
      return score;
    };

    const sorted = [...results].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
    return sorted[0].lat && sorted[0].lon ? sorted[0] : null;
  }
}
