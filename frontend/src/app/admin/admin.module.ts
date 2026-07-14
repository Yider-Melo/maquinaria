import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AdminLayout } from './admin-layout';
import { AdminDashboard } from './dashboard/dashboard.component';
import { AdminAccounting } from './accounting/accounting.component';
import { AdminPerformance } from './performance/performance.component';
import { AdminReports, ConfirmActionDialog } from './reports/reports.component';
import { AdminRoutingModule } from './admin-routing.module';

@NgModule({
  declarations: [AdminLayout, AdminDashboard, AdminAccounting, AdminPerformance, AdminReports, ConfirmActionDialog],
  imports: [SharedModule, AdminRoutingModule]
})
export class AdminModule {}
