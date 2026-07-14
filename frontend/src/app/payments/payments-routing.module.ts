// Módulo de enrutamiento de pagos. Ruta protegida para el listado de pagos.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentsList } from './list/list.component';
import { PaymentsDetail } from './detail/detail.component';
import { AuthGuard } from '../core/guards/auth.guard';
import { DetailResolver } from '../core/resolvers/detail.resolver';

const routes: Routes = [
  { path: '', component: PaymentsList, canActivate: [AuthGuard] },
  { path: ':id', component: PaymentsDetail, canActivate: [AuthGuard], resolve: { data: DetailResolver }, data: { resolverPath: 'payments' } }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PaymentsRoutingModule {}
