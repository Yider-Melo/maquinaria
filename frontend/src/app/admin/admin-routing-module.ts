import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth-guard';
import { RoleGuard } from '../core/guards/role-guard';
import { AdminDashboard } from './dashboard/dashboard';
import { AdminAccounting } from './accounting/accounting';
import { AdminPerformance } from './performance/performance';
import { AdminReports } from './reports/reports';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    children: [
      { path: '', component: AdminDashboard },
      { path: 'accounting', component: AdminAccounting },
      { path: 'performance', component: AdminPerformance },
      { path: 'reports', component: AdminReports }
    ]
  }
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AdminRoutingModule {}
