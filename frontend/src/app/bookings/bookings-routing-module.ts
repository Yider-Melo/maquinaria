// Módulo de enrutamiento de reservas. Define rutas protegidas para
// el listado y el detalle de reservas.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BookingsList } from './list/list';
import { BookingsDetail } from './detail/detail';
import { AuthGuard } from '../core/guards/auth-guard';

const routes: Routes = [
  { path: '', component: BookingsList, canActivate: [AuthGuard] },
  { path: ':id', component: BookingsDetail, canActivate: [AuthGuard] }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class BookingsRoutingModule {}
