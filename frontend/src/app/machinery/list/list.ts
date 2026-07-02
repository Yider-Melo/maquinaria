import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  standalone: false,
  selector: 'app-machinery-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class MachineryList implements OnInit {
  items: any[] = []; loading = true; total = 0; page = 1; size = 20;
  filters: any = { q: '', tipo: '', ciudad: '', minPrice: null, maxPrice: null };

  constructor(private api: Api, public auth: Auth) {}

  ngOnInit(): void { this.load(); }

  // Carga los resultados desde el backend aplicando filtros y paginación.
  load(): void {
    this.loading = true;
    this.api.get<any>('/search', { ...this.filters, page: this.page, size: this.size }).subscribe(res => {
      this.items = res.data?.data || []; this.total = res.data?.pagination?.total || 0; this.loading = false;
    });
  }

  // Reinicia la paginación y ejecuta una nueva búsqueda.
  search(): void { this.page = 1; this.load(); }
  // Navega a la página anterior.
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  // Navega a la página siguiente si hay más resultados.
  nextPage(): void { if (this.page * this.size < this.total) { this.page++; this.load(); } }
}
