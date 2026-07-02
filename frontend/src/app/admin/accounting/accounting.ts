import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api';

@Component({
  selector: 'app-admin-accounting', templateUrl: './accounting.html', styleUrls: ['./accounting.css'],
  standalone: false
})
export class AdminAccounting implements OnInit {
  dashboard: any = null;
  loading = true;

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.api.get<any>('/admin/payments/dashboard').subscribe({
      next: (res) => { this.dashboard = res.data; this.loading = false; },
      error: () => this.loading = false
    });
  }
}
