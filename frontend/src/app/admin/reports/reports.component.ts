import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { Observable, forkJoin, of, Subject, Subscription } from 'rxjs';
import { catchError, finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { watchRealtime } from '../../shared/realtime';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { DetailDialog } from '../../shared/detail-dialog/detail-dialog';
import { UserStats, RatingStats, Booking, Machinery, PaymentDashboard, Usuario, MachineryStats } from '../../core/models';
import { estadoPagoLabel } from '../../shared/utils';

@Component({
  selector: 'app-admin-reports', templateUrl: './reports.html', styleUrls: ['./reports.css'],
  standalone: false
})
export class AdminReports implements OnInit, OnDestroy {
  estadoPagoLabel = estadoPagoLabel;
  stats: any = {};
  machineryStats: any = {};
  ratingReportadas = 0;
  reportedRatings: any[] = [];
  ratingAccion: string | null = null;
  bookingStats: any = {};
  selectedTab = 0;
  bookingEstadoFilter = '';
  userRolFilter = '';
  private allTipos: { tipo: string; cantidad: number }[] = [];
  tipoPage = 1;
  tiposPorPagina = 6;

  get topTypes(): { tipo: string; cantidad: number }[] {
    const start = (this.tipoPage - 1) * this.tiposPorPagina;
    return this.allTipos.slice(start, start + this.tiposPorPagina);
  }

  get tipoTotalPages(): number { return Math.ceil(this.allTipos.length / this.tiposPorPagina) || 1; }

  prevTipoPage(): void { if (this.tipoPage > 1) this.tipoPage--; }
  nextTipoPage(): void { if (this.tipoPage * this.tiposPorPagina < this.allTipos.length) this.tipoPage++; }
  users: Usuario[] = [];
  userMap: { [key: string]: string } = {};
  machinery: Machinery[] = [];
  recentBookings: Booking[] = [];
  payments: any[] = [];
  loading = true;

  userPage = 1; userSize = 20; userTotal = 0;
  machPage = 1; machSize = 20; machTotal = 0;
  bookingPage = 1; bookingSize = 20; bookingTotal = 0;
  payPage = 1; paySize = 20; payTotal = 0;

  userSearch = '';
  machSearch = '';
  bookingSearch = '';
  paymentSearch = '';
  idsExpandidos = new Set<string>();

  private userSearch$ = new Subject<string>();
  private machSearch$ = new Subject<string>();
  private bookingSearch$ = new Subject<string>();
  private paymentSearch$ = new Subject<string>();
  private realtimeSub: Subscription | undefined;

  get userTotalPages(): number { return Math.ceil(this.userTotal / this.userSize) || 1; }
  get machTotalPages(): number { return Math.ceil(this.machTotal / this.machSize) || 1; }
  get bookingTotalPages(): number { return Math.ceil(this.bookingTotal / this.bookingSize) || 1; }
  get payTotalPages(): number { return Math.ceil(this.payTotal / this.paySize) || 1; }

  get reservasVisibles(): Booking[] {
    if (!this.bookingEstadoFilter) return this.recentBookings;
    return this.recentBookings.filter(b => b.estado === this.bookingEstadoFilter);
  }

  get usuariosVisibles(): Usuario[] {
    if (!this.userRolFilter) return this.users;
    return this.users.filter(u => u.tipo_usuario === this.userRolFilter);
  }

  filtrarReservasPorEstado(estado: string): void {
    this.bookingEstadoFilter = estado;
    this.bookingPage = 1;
    this.loadBookings();
  }

  filtrarUsuariosPorRol(rol: string): void {
    this.userRolFilter = rol;
  }

  verTodosUsuarios(): void {
    this.userRolFilter = '';
    this.clearUserSearch();
  }

  verTodasReservas(): void {
    this.bookingEstadoFilter = '';
    this.clearBookingSearch();
  }

  verTodaMaquinaria(): void {
    this.clearMachSearch();
  }

  irAMaquinaria(tipo: string): void {
    this.selectedTab = 1;
    this.machSearch = tipo;
    this.machSearch$.next(tipo);
  }

  constructor(private api: Api, private cdr: ChangeDetectorRef, private dialog: MatDialog, private socket: SocketService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    const estado = this.route.snapshot.queryParamMap.get('estado');
    if (tab === 'usuarios') this.selectedTab = 0;
    if (tab === 'maquinaria') this.selectedTab = 1;
    if (tab === 'reservas') this.selectedTab = 2;
    if (estado) this.bookingEstadoFilter = estado;
    this.userSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => { this.userPage = 1; this.loadUsers(); });
    this.machSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => { this.machPage = 1; this.loadMachinery(); });
    this.bookingSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => { this.bookingPage = 1; this.loadBookings(); });
    this.paymentSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => { this.payPage = 1; this.loadPayments(); });
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) { this.machSearch = q; this.machSearch$.next(q); }
    this.loadAll();
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => {
        const t = String(ev?.tipo || '');
        return t.startsWith('booking.') || t.startsWith('payment.') || t.startsWith('machinery.');
      },
      () => this.loadAll()
    );
  }

  ngOnDestroy(): void {
    this.userSearch$.complete();
    this.machSearch$.complete();
    this.bookingSearch$.complete();
    this.paymentSearch$.complete();
    this.realtimeSub?.unsubscribe();
  }

  onUserSearch(q: string): void { this.userSearch = q; this.userSearch$.next(q); }
  onMachSearch(q: string): void { this.machSearch = q; this.machSearch$.next(q); }
  onBookingSearch(q: string): void { this.bookingSearch = q; this.bookingSearch$.next(q); }
  onPaymentSearch(q: string): void { this.paymentSearch = q; this.paymentSearch$.next(q); }

  clearUserSearch(): void { this.userSearch = ''; this.userSearch$.next(''); }
  clearMachSearch(): void { this.machSearch = ''; this.machSearch$.next(''); }
  clearBookingSearch(): void { this.bookingSearch = ''; this.bookingSearch$.next(''); }
  clearPaymentSearch(): void { this.paymentSearch = ''; this.paymentSearch$.next(''); }

  prevUserPage(): void { if (this.userPage > 1) { this.userPage--; this.loadUsers(); } }
  nextUserPage(): void { if (this.userPage * this.userSize < this.userTotal) { this.userPage++; this.loadUsers(); } }
  prevMachPage(): void { if (this.machPage > 1) { this.machPage--; this.loadMachinery(); } }
  nextMachPage(): void { if (this.machPage * this.machSize < this.machTotal) { this.machPage++; this.loadMachinery(); } }
  prevBookingPage(): void { if (this.bookingPage > 1) { this.bookingPage--; this.loadBookings(); } }
  nextBookingPage(): void { if (this.bookingPage * this.bookingSize < this.bookingTotal) { this.bookingPage++; this.loadBookings(); } }
  prevPayPage(): void { if (this.payPage > 1) { this.payPage--; this.loadPayments(); } }
  nextPayPage(): void { if (this.payPage * this.paySize < this.payTotal) { this.payPage++; this.loadPayments(); } }

  private loadAll(): void {
    forkJoin([
      this.api.get<UserStats>('/admin/users/stats').pipe(catchError(() => of({ success: true, data: { total: 0, propietarios: 0, arrendatarios: 0 } }))),
      this.api.get<RatingStats>('/admin/ratings/stats').pipe(catchError(() => of({ success: true, data: { resumen: { total: 0, puntuacion_promedio: 0, reportadas: 0 }, reportadas: [] } }))),
      this.api.get<any>('/admin/bookings/stats').pipe(catchError(() => of({ success: true, data: {} } as any))),
      this.api.get<MachineryStats>('/admin/machinery/stats').pipe(catchError(() => of({ success: true, data: { resumen: {}, por_tipo: [] } } as any)))
    ]).pipe(finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({
      next: ([users, ratings, bstats, machinery]) => {
        this.stats = users?.data || {};
        this.ratingReportadas = ratings?.data?.resumen?.reportadas || 0;
        this.reportedRatings = (ratings as any)?.data?.reportadas || [];
        this.bookingStats = bstats?.data || {};
        this.machineryStats = machinery?.data || {};
        this.allTipos = this.machineryStats?.por_tipo || [];
        this.tipoPage = 1;
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
    this.loadUsers();
    this.loadMachinery();
    this.loadBookings();
    this.loadPayments();
    this.cargarMapaUsuarios();
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    this.cdr.markForCheck();
  }

  // Carga todos los usuarios para resolver los nombres de los propietarios
  // de maquinaria (el listado paginado solo trae una página y dejaba IDs sin nombre).
  private cargarMapaUsuarios(): void {
    this.api.get<Usuario[]>('/admin/users?page=1&size=100').pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res: any) => {
        const totalPages = res?.pagination?.totalPages || 1;
        this.userMap = {};
        const add = (arr: any[]) => {
          for (const u of arr || []) this.userMap[u.id] = `${u.nombre} ${u.apellido}`.trim();
        };
        add(res?.data);
        if (totalPages > 1) {
          const calls = [];
          for (let p = 2; p <= totalPages; p++) {
            calls.push(this.api.get<Usuario[]>(`/admin/users?page=${p}&size=100`).pipe(catchError(() => of({ success: true, data: [] } as any))));
          }
          forkJoin(calls).subscribe((results: any[]) => {
            for (const r of results) add(r?.data);
            this.cdr.markForCheck();
          });
        } else {
          this.cdr.markForCheck();
        }
      }
    });
  }

  private loadUsers(): void {
    const q = this.userSearch.trim() ? `&q=${encodeURIComponent(this.userSearch.trim())}` : '';
    this.api.get<Usuario[]>(`/admin/users?page=${this.userPage}&size=${this.userSize}${q}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => {
        const r = res as any;
        this.users = r?.data || [];
        this.userTotal = r?.pagination?.total || 0;
        this.cdr.markForCheck();
      }
    });
  }

  private loadMachinery(): void {
    const q = this.machSearch.trim() ? `&q=${encodeURIComponent(this.machSearch.trim())}` : '';
    this.api.get<Machinery[]>(`/admin/machinery/all?page=${this.machPage}&size=${this.machSize}${q}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => {
        const r = res as any;
        this.machinery = r?.data || [];
        this.machTotal = r?.pagination?.total || 0;
        this.cdr.markForCheck();
      }
    });
  }

  private loadBookings(): void {
    const q = this.bookingSearch.trim() ? `&q=${encodeURIComponent(this.bookingSearch.trim())}` : '';
    const e = this.bookingEstadoFilter ? `&estado=${encodeURIComponent(this.bookingEstadoFilter)}` : '';
    this.api.get<Booking[]>(`/admin/bookings/all?page=${this.bookingPage}&size=${this.bookingSize}${q}${e}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => {
        if ((res as any)?.data) { this.recentBookings = (res as any).data; }
        else { this.recentBookings = (res as any) || []; }
        this.bookingTotal = (res as any)?.pagination?.total || 0;
        this.cdr.markForCheck();
      }
    });
  }

  private loadPayments(): void {
    const q = this.paymentSearch.trim() ? `&q=${encodeURIComponent(this.paymentSearch.trim())}` : '';
    this.api.get<PaymentDashboard>(`/admin/payments/all?page=${this.payPage}&size=${this.paySize}${q}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe({
      next: (res) => {
        this.payments = (res as any)?.data || [];
        this.payTotal = (res as any)?.pagination?.total || 0;
        this.cdr.markForCheck();
      }
    });
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }

  verDetalleEntidad(tipo: 'reserva' | 'pago' | 'maquinaria', id: string): void {
    this.dialog.open(DetailDialog, { data: { tipo, id }, maxWidth: '560px' });
  }

  barPercent(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  private toCSV(rows: any[], cols: { key: string; label: string }[]): string {
    const esc = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const header = cols.map(c => esc(c.label)).join(',');
    const body = rows.map(r => cols.map(c => esc(r[c.key])).join(',')).join('\r\n');
    return header + '\r\n' + body;
  }

  private downloadCSV(filename: string, rows: any[], cols: { key: string; label: string }[]): void {
    const blob = new Blob(['\uFEFF' + this.toCSV(rows, cols)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportarUsuariosCSV(): void {
    this.downloadCSV('usuarios.csv', this.users, [
      { key: 'id', label: 'ID' }, { key: 'email', label: 'Email' }, { key: 'nombre', label: 'Nombre' },
      { key: 'apellido', label: 'Apellido' }, { key: 'tipo_usuario', label: 'Rol' },
      { key: 'telefono', label: 'Teléfono' }, { key: 'ciudad', label: 'Ciudad' },
      { key: 'activo', label: 'Activo' }
    ]);
  }

  exportarMaquinariaCSV(): void {
    this.downloadCSV('maquinaria.csv', this.machinery, [
      { key: 'id', label: 'ID' }, { key: 'titulo', label: 'Máquina' }, { key: 'tipo', label: 'Tipo' },
      { key: 'marca', label: 'Marca' }, { key: 'modelo', label: 'Modelo' }, { key: 'anio', label: 'Año' },
      { key: 'ciudad', label: 'Ciudad' }, { key: 'precio_por_dia', label: 'Precio/día' },
      { key: 'propietario_id', label: 'Propietario' }, { key: 'activo', label: 'Activa' }
    ]);
  }

  exportarReservasCSV(): void {
    this.downloadCSV('reservas.csv', this.recentBookings, [
      { key: 'id', label: 'ID' }, { key: 'maquinaria_id', label: 'Máquina' },
      { key: 'estado', label: 'Estado' }, { key: 'precio_total', label: 'Total' },
      { key: 'fecha_inicio', label: 'Inicio' }, { key: 'fecha_fin', label: 'Fin' }
    ]);
  }

  exportarPagosCSV(): void {
    this.downloadCSV('pagos.csv', this.payments, [
      { key: 'id', label: 'ID' }, { key: 'reserva_id', label: 'Reserva' }, { key: 'monto', label: 'Monto' },
      { key: 'estado', label: 'Estado' }, { key: 'metodo_pago', label: 'Método' },
      { key: 'referencia_pasarela', label: 'Referencia' }
    ]);
  }

  toggleId(id: string): void {
    if (this.idsExpandidos.has(id)) this.idsExpandidos.delete(id);
    else this.idsExpandidos.add(id);
  }

  toggleUser(user: Usuario): void {
    const accion = user.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} al usuario ${user.nombre} ${user.apellido}?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Usuario>(`/admin/users/${user.id}/status`, { activo: !user.activo }).subscribe({
        next: res => { if (res?.data) user.activo = res.data.activo; this.cdr.detectChanges(); },
        error: () => console.error('Error al cambiar estado del usuario')
      });
    });
  }

  toggleMachinery(item: Machinery): void {
    const accion = item.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} la maquinaria "${item.titulo}"?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Machinery>(`/admin/machinery/all/${item.id}/status`, { activo: !item.activo }).subscribe({
        next: res => { if (res?.data) item.activo = res.data.activo; this.cdr.detectChanges(); },
        error: () => console.error('Error al cambiar estado de la maquinaria')
      });
    });
  }

  resolverRating(id: string, accion: 'conservar' | 'eliminar'): void {
    const msg = accion === 'eliminar'
      ? '¿Ocultar esta calificación? Ya no se mostrará y se quitará del promedio.'
      : '¿Quitar el reporte y conservar la calificación?';
    this.confirmAction(msg).subscribe(confirmed => {
      if (!confirmed) return;
      this.ratingAccion = id;
      this.api.post<any>(`/admin/ratings/${id}/resolve`, { accion }).subscribe({
        next: () => {
          this.reportedRatings = this.reportedRatings.filter(r => r.id !== id);
          this.ratingReportadas = this.reportedRatings.length;
          this.ratingAccion = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error al resolver calificación', err);
          this.ratingAccion = null;
        }
      });
    });
  }
}
