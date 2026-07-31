import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Api } from '../core/services/api.service';
import { SharedModule } from '../shared/shared.module';
import { formatDate, formatId, estadoLabel } from '../shared/utils';
import { Booking, Machinery } from '../core/models';

@Component({
  selector: 'app-machine-bookings-dialog',
  templateUrl: './machine-bookings-dialog.html',
  styleUrls: ['./machine-bookings-dialog.css'],
  standalone: true,
  imports: [SharedModule]
})
export class MachineBookingsDialog implements OnInit {
  bookings: Booking[] = [];
  loading = true;
  error = '';
  page = 1; size = 10; total = 0;
  formatDate = formatDate;
  formatId = formatId;
  estadoLabel = estadoLabel;

  get totalPages(): number { return Math.ceil(this.total / this.size) || 1; }

  constructor(
    public dialogRef: MatDialogRef<MachineBookingsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { machine: Machinery },
    private api: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.api.get<any>(`/bookings/machinery/${this.data.machine.id}?page=${this.page}&size=${this.size}`).subscribe({
      next: (res) => {
        const r = res as any;
        this.total = r?.pagination?.total || 0;
        this.bookings = r?.data || [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.error?.error?.message || 'No se pudieron cargar las reservas.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }
  nextPage(): void { if (this.page * this.size < this.total) { this.page++; this.load(); } }
}
