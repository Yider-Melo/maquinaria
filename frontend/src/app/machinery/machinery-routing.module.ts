// Módulo de enrutamiento de maquinaria. Define las rutas para listar,
// ver detalle, crear y editar maquinaria. Las rutas de creación y
// edición están protegidas por el guardia de autenticación.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MachineryList } from './list/list.component';
import { MachineryDetail } from './detail/detail.component';
import { MachineryForm } from './form/form.component';
import { AuthGuard } from '../core/guards/auth.guard';
import { CanDeactivateGuard } from '../core/guards/can-deactivate.guard';
import { DetailResolver } from '../core/resolvers/detail.resolver';

const routes: Routes = [
  { path: '', component: MachineryList },
  { path: 'new', component: MachineryForm, canActivate: [AuthGuard], canDeactivate: [CanDeactivateGuard] },
  { path: ':id', component: MachineryDetail, resolve: { data: DetailResolver }, data: { resolverPath: 'machinery' } },
  { path: ':id/edit', component: MachineryForm, canActivate: [AuthGuard], canDeactivate: [CanDeactivateGuard] }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class MachineryRoutingModule {}
