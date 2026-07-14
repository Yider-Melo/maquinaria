// Módulo de enrutamiento de valoraciones. Ruta protegida para el listado.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RatingsList } from './list/list.component';
import { RatingsDetail } from './detail/detail.component';
import { AuthGuard } from '../core/guards/auth.guard';
import { DetailResolver } from '../core/resolvers/detail.resolver';

const routes: Routes = [
  { path: '', component: RatingsList, canActivate: [AuthGuard] },
  { path: ':id', component: RatingsDetail, canActivate: [AuthGuard], resolve: { data: DetailResolver }, data: { resolverPath: 'ratings' } }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class RatingsRoutingModule {}
