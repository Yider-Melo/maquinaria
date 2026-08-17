import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Api } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { MatDialog } from '@angular/material/dialog';
import { of, Observable, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { watchRealtime } from '../../shared/realtime';
import { ConfirmActionDialog } from '../../shared/confirm-dialog/confirm-action-dialog';
import { Usuario, Machinery } from '../../core/models';

@Component({
  selector: 'app-admin-usuarios-maquinas',
  templateUrl: './usuarios-maquinas.html',
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page h1 { margin-bottom: 24px; }
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
    .table-scroll > .admin-table, .table-scroll > .sub-table { min-width: max-content; }
    .admin-table { width: 100%; border-collapse: collapse; }
    .admin-table th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #ddd; font-weight: 800; font-size: 13px; color: #666; }
    .admin-table tbody tr:nth-child(even) { background: rgba(201, 111, 45, .04); }
    .admin-table tbody tr:nth-child(even) .user-row.expanded, .admin-table tbody tr:nth-child(odd) .user-row.expanded { background: #f8f4f0; }
    .user-row { cursor: pointer; }
    .user-row:hover { background: rgba(201, 111, 45, .10) !important; }
    .user-row.expanded { background: #f8f4f0; }
    .user-row td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 14px; }
    .user-row mat-icon { vertical-align: middle; color: #999; }
    .expand-row td { padding: 0; border-bottom: 2px solid #e8d5c0; }
    .expand-content { padding: 16px 24px 16px 48px; background: #fcfaf8; }
    .expand-content h4 { margin: 0 0 8px; font-size: 14px; color: #666; }
    .sub-table { width: 100%; border-collapse: collapse; }
    .sub-table th { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; font-size: 12px; color: #888; font-weight: 700; }
    .sub-table td { padding: 8px; border-bottom: 1px solid #eee; font-size: 13px; }
    .sub-table tbody tr:nth-child(even) { background: rgba(201, 111, 45, .04); }
    .sub-table tbody tr:hover { background: rgba(201, 111, 45, .10); }
    .sub-table button { font-size: 12px; padding: 2px 8px; line-height: 28px; }
    .sub-table button:hover { background: #c96f2d; color: white; }
    .rating-cell { font-size: 16px; }
    .stars { letter-spacing: 2px; }
    .no-rating { color: #ccc; }
    .role-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize; }
    .role-badge.admin { background: #f3e5f5; color: #7b1fa2; }
    .role-badge.propietario { background: #e3f2fd; color: #1565c0; }
    .role-badge.arrendatario { background: #e8f5e9; color: #2e7d32; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; white-space: nowrap; }
    .status.ok { background: #e8f5e9; color: #2e7d32; }
    .status:not(.ok) { background: #ffebee; color: #c62828; }
    .admin-table button, .sub-table button { white-space: nowrap; }
    .admin-table button:hover:not(.user-row button) { background: #c96f2d; color: white; }
    .id-cell { font-family: 'Courier New', monospace; font-size: 11px; color: #999; word-break: break-all; }
    .id-toggle { cursor: pointer; color: #c96f2d; font-weight: 600; white-space: nowrap; }
    .id-toggle:hover { text-decoration: underline; }
    .empty-sub { color: #999; font-size: 13px; padding: 8px 0; }
    .filter-bar { display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 4px; }
    .filter-search { width: 260px; font-size: 13px; }
    .filter-search ::ng-deep .mat-mdc-text-field-wrapper { border-radius: 24px; background: #fff; }
    .filter-search ::ng-deep .mat-mdc-form-field-flex { height: 40px; align-items: center; }
    .filter-search ::ng-deep .mat-mdc-input-element { font-size: 13px; }
    .filter-search ::ng-deep .mat-mdc-form-field-outline { color: #ddd; }
    .filter-search ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .search-summary { margin: 12px 0 4px; font-size: 13px; color: #666; }
    .search-summary strong { color: #c96f2d; }
  `],
  standalone: false
})
export class AdminUsuariosMaquinas implements OnInit, OnDestroy {
  usuarios: Usuario[] = [];
  maquinas: Machinery[] = [];
  maquinasPorUsuario: { [key: string]: Machinery[] } = {};
  expandidos: Set<string> = new Set();

  userPage = 1; userSize = 20; userTotal = 0;
  machPage = 1; machSize = 50; machTotal = 0;

  userSearch = '';
  machSearch = '';
  idsExpandidos = new Set<string>();

  private userSearch$ = new Subject<string>();
  private machSearch$ = new Subject<string>();
  private realtimeSub: Subscription | undefined;

  get userTotalPages(): number { return Math.ceil(this.userTotal / this.userSize) || 1; }

  get usuariosVisibles(): Usuario[] {
    if (!this.machSearch.trim()) return this.usuarios;
    return this.usuarios.filter(u => (this.maquinasPorUsuario[u.id]?.length || 0) > 0);
  }

  constructor(private api: Api, private dialog: MatDialog, private cdr: ChangeDetectorRef, private socket: SocketService, private route: ActivatedRoute) {}

  toggleId(event: Event, id: string): void {
    event.stopPropagation();
    if (this.idsExpandidos.has(id)) this.idsExpandidos.delete(id);
    else this.idsExpandidos.add(id);
    this.cdr.detectChanges();
  }

  private procesarMaquinas(lista: Machinery[]): void {
    this.maquinas = lista;
    this.maquinasPorUsuario = {};
    for (const m of this.maquinas) {
      const uid = m.propietario_id;
      if (!this.maquinasPorUsuario[uid]) this.maquinasPorUsuario[uid] = [];
      this.maquinasPorUsuario[uid].push(m);
    }
  }

  ngOnInit(): void {
    this.userSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => { this.userPage = 1; this.loadUsers(); });
    this.machSearch$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => { this.machPage = 1; this.userPage = 1; this.loadAllMachinery(); this.loadUsers(); });
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.machSearch = q;
      this.machSearch$.next(q);
    }
    this.loadUsers(); this.loadAllMachinery();
    this.realtimeSub = watchRealtime(
      this.socket,
      (ev) => String(ev?.tipo || '').startsWith('machinery.'),
      () => this.loadAllMachinery()
    );
  }

  ngOnDestroy(): void {
    this.userSearch$.complete();
    this.machSearch$.complete();
    this.realtimeSub?.unsubscribe();
  }

  onUserSearch(q: string): void { this.userSearch = q; this.userSearch$.next(q); }
  onMachSearch(q: string): void { this.machSearch = q; this.machSearch$.next(q); }

  verTodo(): void {
    this.clearUserSearch();
    this.clearMachSearch();
  }

  clearUserSearch(): void { this.userSearch = ''; this.userSearch$.next(''); }
  clearMachSearch(): void { this.machSearch = ''; this.machSearch$.next(''); }

  prevUserPage(): void { if (this.userPage > 1) { this.userPage--; this.loadUsers(); } }
  nextUserPage(): void { if (this.userPage * this.userSize < this.userTotal) { this.userPage++; this.loadUsers(); } }

  private loadUsers(): void {
    const searchingMach = !!this.machSearch.trim();
    const size = searchingMach ? 500 : this.userSize;
    const page = searchingMach ? 1 : this.userPage;
    const q = this.userSearch.trim() ? `&q=${encodeURIComponent(this.userSearch.trim())}` : '';
    this.api.get<Usuario[]>(`/admin/users?page=${page}&size=${size}${q}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe(res => {
      const r = res as any;
      this.usuarios = r?.data || [];
      this.userTotal = r?.pagination?.total || 0;
      if (searchingMach) this.actualizarExpandidos();
      this.cdr.detectChanges();
    });
  }

  private loadAllMachinery(): void {
    const q = this.machSearch.trim() ? `&q=${encodeURIComponent(this.machSearch.trim())}` : '';
    this.api.get<Machinery[]>(`/admin/machinery/all?page=1&size=500${q}`).pipe(
      catchError(() => of({ success: true, data: [] } as any))
    ).subscribe(res => {
      this.procesarMaquinas(res?.data || []);
      if (this.machSearch.trim()) this.actualizarExpandidos();
      this.cdr.detectChanges();
    });
  }

  private actualizarExpandidos(): void {
    for (const u of this.usuarios) {
      if ((this.maquinasPorUsuario[u.id]?.length || 0) > 0) this.expandidos.add(u.id);
      else this.expandidos.delete(u.id);
    }
  }

  toggleExpand(u: Usuario): void {
    if (this.expandidos.has(u.id)) this.expandidos.delete(u.id);
    else this.expandidos.add(u.id);
  }

  toggleUser(event: Event, user: Usuario): void {
    event.stopPropagation();
    const accion = user.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} al usuario ${user.nombre} ${user.apellido}?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Usuario>(`/admin/users/${user.id}/status`, { activo: !user.activo }).subscribe({
        next: res => {
          if (res?.data) user.activo = res.data.activo;
          this.cdr.detectChanges();
        }
      });
    });
  }

  toggleMachinery(event: Event, item: Machinery): void {
    event.stopPropagation();
    const accion = item.activo ? 'desactivar' : 'activar';
    this.confirmAction(`¿${accion} la maquinaria "${item.titulo}"?`).subscribe(confirmed => {
      if (!confirmed) return;
      this.api.put<Machinery>(`/admin/machinery/all/${item.id}/status`, { activo: !item.activo }).subscribe({
        next: res => {
          if (res?.data) item.activo = res.data.activo;
          this.cdr.detectChanges();
        }
      });
    });
  }

  getStars(p: any): string {
    const num = Number(p) || 0;
    const full = Math.min(5, Math.round(num));
    const stars = '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
    return stars + ` ${num.toFixed(1)}`;
  }

  private confirmAction(msg: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmActionDialog, { data: { message: msg } });
    return dialogRef.afterClosed();
  }
}
