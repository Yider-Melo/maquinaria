import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from '../shared/shared-module';
import { Dashboard } from './dashboard';
import { DashboardRoutingModule } from './dashboard-routing-module';

@NgModule({
  declarations: [Dashboard],
  imports: [
    CommonModule,
    MatCardModule, MatIconModule, MatButtonModule,
    SharedModule,
    DashboardRoutingModule
  ]
})
export class DashboardModule {}
