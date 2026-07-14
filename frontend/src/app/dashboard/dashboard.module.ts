import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { Dashboard } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';

@NgModule({
  declarations: [Dashboard],
  imports: [SharedModule, DashboardRoutingModule]
})
export class DashboardModule {}
