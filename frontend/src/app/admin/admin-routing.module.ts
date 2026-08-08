import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';
import { RoleGuard } from '../core/guards/role.guard';
import { AdminLayout } from './admin-layout';
import { AdminDashboard } from './dashboard/dashboard.component';
import { AdminAccounting } from './accounting/accounting.component';
import { AdminReports } from './reports/reports.component';
import { AdminUsuariosMaquinas } from './usuarios-maquinas/usuarios-maquinas.component';

const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    children: [
      { path: '', component: AdminDashboard },
      { path: 'accounting', component: AdminAccounting },
      { path: 'reports', component: AdminReports },
      { path: 'usuarios-maquinas', component: AdminUsuariosMaquinas }
    ]
  }
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AdminRoutingModule {}
