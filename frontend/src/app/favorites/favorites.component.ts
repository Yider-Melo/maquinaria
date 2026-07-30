import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { Api } from '../core/services/api.service';
import { Auth } from '../core/services/auth.service';
import { Machinery } from '../core/models';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.html',
  styleUrls: ['./favorites.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatRippleModule]
})
export class FavoritesComponent implements OnInit {
  items: Machinery[] = []; loading = true;
  page = 1; size = 12; total = 0;
  get totalPages(): number { return Math.ceil(this.total / this.size) || 1; }

  constructor(private api: Api, public auth: Auth, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void { this.load(); }

  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page * this.size < this.total) { this.page++; this.load(); } }

  private load(): void {
    this.loading = true;
    this.api.get<Machinery[]>(`/machinery/favorites/list?page=${this.page}&size=${this.size}`).subscribe({
      next: (res) => {
        const r = res as any;
        this.items = (r?.data || []).map((m: Machinery) => ({ ...m, favorito: true }));
        this.total = r?.pagination?.total || 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  remove(item: Machinery, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.api.delete(`/machinery/${item.id}/favorite`).subscribe({
      next: () => {
        this.items = this.items.filter(i => i.id !== item.id);
        this.total = Math.max(0, this.total - 1);
        this.cdr.markForCheck();
      }
    });
  }
}
