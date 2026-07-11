import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-machinery-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class MachineryList implements OnInit {
  items: any[] = []; loading = true; total = 0; totalPages = 0; page = 1; size = 20; error = '';
  suggestions: string[] = [];
  filters: any = { q: '', tipo: '', ciudad: '', departamento: '', minPrice: null, maxPrice: null, sort: 'price_asc' };
  machineryTypes = ['Excavadora', 'Retroexcavadora', 'Bulldozer', 'Grúa', 'Montacargas', 'Volqueta', 'Compactadora', 'Motoniveladora'];
  cities = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Cartagena', 'Pereira', 'Cúcuta', 'Ibagué', 'Villavicencio', 'Santa Marta', 'Manizales', 'Pasto', 'Neiva', 'Armenia', 'Sincelejo', 'Popayán', 'Montería', 'Tunja', 'Riohacha'];
  departamentos = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];
  sortOptions = [
    { value: 'price_asc', label: 'Menor precio primero' },
    { value: 'price_desc', label: 'Mayor precio primero' },
    { value: 'rating', label: 'Mejor calificación' }
  ];
  ciudadesPorDepto: string[] = [];
  colombiaData: any[] = [];

  constructor(private api: Api, public auth: Auth, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any[]>('/assets/colombia.json').subscribe(data => {
      this.colombiaData = data;
    });
    this.load();
  }

  onDepartamentoChange(): void {
    this.filters.ciudad = '';
    const depto = this.colombiaData.find(d => d.departamento === this.filters.departamento);
    this.ciudadesPorDepto = depto ? depto.ciudades : [];
    this.search();
  }

  load(): void {
    this.loading = true; this.error = '';
    const params: any = { ...this.cleanFilters(), page: this.page, size: this.size };
    if (this.auth.esTipo('propietario') && this.auth.getUser()?.id) {
      params.propietario_id = this.auth.getUser()!.id;
    }
    this.api.get<any>('/search', params).subscribe({
      next: (res) => {
        this.items = res.data?.data || [];
        this.total = res.data?.pagination?.total || 0;
        this.totalPages = res.data?.pagination?.totalPages || 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo cargar la maquinaria. Intenta ajustar los filtros o revisar el backend.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  search(): void { this.page = 1; this.load(); }
  clearFilters(): void { this.filters = { q: '', tipo: '', ciudad: '', departamento: '', minPrice: null, maxPrice: null, sort: 'price_asc' }; this.search(); }
  loadSuggestions(): void {
    const q = this.filters.q?.trim();
    if (!q || q.length < 2) { this.suggestions = []; return; }
    this.api.get<string[]>('/search/suggestions', { q }).subscribe({ 
      next: (res) => {
        this.suggestions = res.data || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.suggestions = [];
        this.cdr.markForCheck();
      }
    });
  }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page * this.size < this.total) { this.page++; this.load(); } }

  private cleanFilters(): Record<string, any> {
    return Object.fromEntries(Object.entries(this.filters).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  }
}
