import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PaymentsList } from './list/list.component';
import { PaymentsDetail } from './detail/detail.component';
import { AuthGuard } from '../core/guards/auth.guard';
import { DetailResolver } from '../core/resolvers/detail.resolver';
import { PaymentsStatus } from './status/status.component';

const routes: Routes = [
  { path: '', component: PaymentsList, canActivate: [AuthGuard] },
  { path: 'success', component: PaymentsStatus },
  { path: 'failure', component: PaymentsStatus },
  { path: 'pending', component: PaymentsStatus },
  { path: ':id', component: PaymentsDetail, canActivate: [AuthGuard], resolve: { data: DetailResolver }, data: { resolverPath: 'payments' } }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class PaymentsRoutingModule {}
