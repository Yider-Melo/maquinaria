// Módulo de enrutamiento de pagos. Ruta protegida para el listado de pagos.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentsList } from './list/list';
import { AuthGuard } from '../core/guards/auth-guard';

const routes: Routes = [{ path: '', component: PaymentsList, canActivate: [AuthGuard] }];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PaymentsRoutingModule {}
