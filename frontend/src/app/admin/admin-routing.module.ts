import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../core/guards/auth.guard';
import { RoleGuard } from '../core/guards/role.guard';
import { AdminLayout } from './admin-layout';
import { AdminDashboard } from './dashboard/dashboard.component';
import { AdminMachinery } from './machinery/machinery.component';
import { AdminUsers } from './users/users.component';

const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] },
    children: [
      { path: '', component: AdminDashboard },
      { path: 'machinery', component: AdminMachinery },
      { path: 'users', component: AdminUsers }
    ]
  }
];

@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AdminRoutingModule {}
