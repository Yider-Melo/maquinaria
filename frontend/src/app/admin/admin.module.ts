import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AdminLayout } from './admin-layout';
import { AdminDashboard } from './dashboard/dashboard.component';
import { AdminAccounting } from './accounting/accounting.component';
import { AdminReports } from './reports/reports.component';
import { AdminUsuariosMaquinas } from './usuarios-maquinas/usuarios-maquinas.component';
import { AdminRoutingModule } from './admin-routing.module';

@NgModule({
  declarations: [AdminLayout, AdminDashboard, AdminAccounting, AdminReports, AdminUsuariosMaquinas],
  imports: [SharedModule, AdminRoutingModule]
})
export class AdminModule {}
