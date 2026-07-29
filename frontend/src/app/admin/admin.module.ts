import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AdminLayout } from './admin-layout';
import { AdminDashboard } from './dashboard/dashboard.component';
import { AdminMachinery } from './machinery/machinery.component';
import { AdminUsers } from './users/users.component';
import { AdminRoutingModule } from './admin-routing.module';

@NgModule({
  declarations: [AdminLayout, AdminDashboard, AdminMachinery, AdminUsers],
  imports: [SharedModule, AdminRoutingModule]
})
export class AdminModule {}
