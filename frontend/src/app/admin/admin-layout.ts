import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  template: `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <a class="sidebar-brand" routerLink="/admin">
          <mat-icon>admin_panel_settings</mat-icon>
          <span>Admin</span>
        </a>
        <nav class="sidebar-nav">
          <a mat-button class="sidebar-link" routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <mat-icon>dashboard</mat-icon> Dashboard
          </a>
          <a mat-button class="sidebar-link" routerLink="/admin/performance" routerLinkActive="active">
            <mat-icon>trending_up</mat-icon> Rendimiento
          </a>
          <a mat-button class="sidebar-link" routerLink="/admin/accounting" routerLinkActive="active">
            <mat-icon>account_balance</mat-icon> Contabilidad
          </a>
          <a mat-button class="sidebar-link" routerLink="/admin/reports" routerLinkActive="active">
            <mat-icon>assessment</mat-icon> Gestión
          </a>
        </nav>
        <div class="sidebar-footer">
          <a mat-button class="sidebar-link" routerLink="/">
            <mat-icon>arrow_back</mat-icon> Volver
          </a>
        </div>
      </aside>
      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-shell { display: flex; min-height: calc(100vh - 64px); }
    .admin-sidebar { width: 220px; background: #1e2a3a; color: #fff; display: flex; flex-direction: column; padding: 16px 0; }
    .sidebar-brand { display: flex; align-items: center; gap: 8px; padding: 8px 20px 20px; color: #e2a84b; font-size: 18px; font-weight: bold; text-decoration: none; border-bottom: 1px solid #2a3a4a; margin-bottom: 8px; }
    .sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .sidebar-link { justify-content: flex-start; color: #b0bec5; padding: 10px 20px; border-radius: 0; width: 100%; text-align: left; gap: 10px; }
    .sidebar-link:hover { background: #2a3a4a; color: #fff; }
    .sidebar-link.active { background: #c96f2d; color: #fff; }
    .sidebar-footer { border-top: 1px solid #2a3a4a; padding-top: 8px; }
    .admin-content { flex: 1; padding: 24px; background: #f5f5f5; overflow-y: auto; }
  `],
  standalone: false
})
export class AdminLayout {}
