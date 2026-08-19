import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Api } from '../../core/services/api.service';
import { Auth } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { watchRealtime } from '../../shared/realtime';
import { formatDate, formatId, formatDateTime, estadoLabel } from '../../shared/utils';
import { Payment, Booking, Machinery, ApiResponse } from '../../core/models';

@Component({
  standalone: false,
  selector: 'app-payments-list', templateUrl: './list.html', styleUrls: ['./list.css']
})
export class PaymentsList implements OnInit, OnDestroy {
  payments: any[] = []; loading = true; error = '';
  searchQuery = ''; estadoFilter = '';
  page = 1; size = 10; total = 0;
  private realtimeSub: Subscription | undefined;
  private searchSubject = new Subject<string>();

  get totalPages(): number { return Math.ceil(this.total / this.size) || 1; }

  get filteredPayments(): any[] {
    return this.payments.filter(p => {
      if (this.estadoFilter && p.estado !== this.estadoFilter) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        if (p.id?.toLowerCase().includes(q)) return true;
        if (p.referencia_pasarela?.toLowerCase().includes(q)) return true;
        if (p.maquinaria_titulo?.toLowerCase().includes(q)) return true;
        if (p.reserva_id?.toLowerCase().includes(q)) return true;
        return false;
      }
      return true;
    });
  }

  constructor(private api: Api, public auth: Auth, private cdr: ChangeDetectorRef, private socket: SocketService) {}

  ngOnInit(): void {
    this.loadPayments();
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.page = 1;
      this.loadPayments();
    });
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => String(ev?.tipo || '').startsWith('payment.'),
      () => this.loadPayments()
    );
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
    this.searchSubject.complete();
  }

  onSearch(q: string): void {
    this.searchQuery = q;
    this.searchSubject.next(q);
  }

  onEstadoChange(estado: string): void {
    this.estadoFilter = estado;
    this.page = 1;
    this.loadPayments();
  }

  prevPage(): void { if (this.page > 1) { this.page--; this.loadPayments(); } }
  nextPage(): void { if (this.page * this.size < this.total) { this.page++; this.loadPayments(); } }

  private loadPayments(): void {
    this.loading = true; this.error = '';
    const searchTerm = this.searchQuery.trim();
    const filterActive = !!searchTerm || !!this.estadoFilter;
    const size = filterActive ? 100 : this.size;
    this.size = size;
    const q = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : '';
    const e = this.estadoFilter ? `&estado=${encodeURIComponent(this.estadoFilter)}` : '';
    this.requestPayments(this.page, size, q, e, () => {
      if (searchTerm) this.requestPayments(1, 100, '', e, null);
    });
  }

  private requestPayments(page: number, size: number, q: string, e: string, onEmpty: (() => void) | null): void {
    this.api.get<Payment[]>(`/payments/my-payments?page=${page}&size=${size}${q}${e}`).subscribe({
      next: (res) => {
        const r = res as any;
        const pagos: Payment[] = r?.data || [];
        this.total = r?.pagination?.total || 0;
        if (pagos.length === 0) {
          this.payments = [];
          this.loading = false;
          this.cdr.markForCheck();
          if (onEmpty) onEmpty();
          return;
        }
        this.enrichPayments(pagos);
      },
      error: () => {
        this.error = 'No se pudieron cargar los pagos.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private enrichPayments(pagos: Payment[]): void {
    const bookingIds = [...new Set(pagos.map(p => p.reserva_id))];

    forkJoin({
      bookings: forkJoin(bookingIds.map(id =>
        this.api.get<Booking>(`/bookings/${id}`).pipe(catchError(() => of({ success: true, data: null! })))
      )),
    }).subscribe({
      next: ({ bookings }) => {
        const bookingsById = new Map<string, Booking>();
        bookingIds.forEach((id, i) => {
          const b = bookings[i]?.data;
          if (b) bookingsById.set(id, b);
        });

        const machineryIds2 = [...new Set(pagos.map(p => bookingsById.get(p.reserva_id)?.maquinaria_id).filter(Boolean))] as string[];
        forkJoin(machineryIds2.map(id =>
          this.api.get<Machinery>(`/machinery/${id}`).pipe(catchError(() => of({ success: true, data: null! })))
        )).subscribe({
          next: (machines) => {
            const machinesById = new Map<string, Machinery>();
            machineryIds2.forEach((id, i) => {
              const m = machines[i]?.data;
              if (m) machinesById.set(id, m);
            });

            this.payments = pagos.map(p => {
              const booking = bookingsById.get(p.reserva_id);
              const machine = booking ? machinesById.get(booking.maquinaria_id) : null;
              return {
                ...p,
                maquinaria_titulo: booking?.maquinaria_titulo || machine?.titulo || `Maquinaria #${p.reserva_id?.substring(0, 8) || ''}`,
                maquinaria_precio: p.monto
              };
            });
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.payments = pagos;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  formatDate = formatDate;
  formatDateTime = formatDateTime;
  formatId = formatId;
  estadoLabel = estadoLabel;

  getBookingDateLabel(booking: Booking): string {
    if (!booking?.fecha_inicio && !booking?.fecha_fin) return 'Sin fecha';
    if (!booking?.fecha_fin) return formatDate(booking.fecha_inicio);
    return `${formatDate(booking.fecha_inicio)} → ${formatDate(booking.fecha_fin)}`;
  }
}
