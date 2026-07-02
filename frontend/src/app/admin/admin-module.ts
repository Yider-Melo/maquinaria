import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from '../shared/shared-module';
import { AdminDashboard } from './dashboard/dashboard';
import { AdminAccounting } from './accounting/accounting';
import { AdminPerformance } from './performance/performance';
import { AdminReports } from './reports/reports';
import { AdminRoutingModule } from './admin-routing-module';

@NgModule({
  declarations: [AdminDashboard, AdminAccounting, AdminPerformance, AdminReports],
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatTabsModule, MatButtonModule,
    SharedModule,
    AdminRoutingModule
  ]
})
export class AdminModule {}
