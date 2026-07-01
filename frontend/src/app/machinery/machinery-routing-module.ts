// Módulo de enrutamiento de maquinaria. Define las rutas para listar,
// ver detalle, crear y editar maquinaria. Las rutas de creación y
// edición están protegidas por el guardia de autenticación.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MachineryList } from './list/list';
import { MachineryDetail } from './detail/detail';
import { MachineryForm } from './form/form';
import { AuthGuard } from '../core/guards/auth-guard';

const routes: Routes = [
  { path: '', component: MachineryList },
  { path: 'new', component: MachineryForm, canActivate: [AuthGuard] },
  { path: ':id', component: MachineryDetail },
  { path: ':id/edit', component: MachineryForm, canActivate: [AuthGuard] }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class MachineryRoutingModule {}
