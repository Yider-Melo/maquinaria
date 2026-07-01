// Módulo de enrutamiento de valoraciones. Ruta protegida para el listado.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RatingsList } from './list/list';
import { AuthGuard } from '../core/guards/auth-guard';

const routes: Routes = [{ path: '', component: RatingsList, canActivate: [AuthGuard] }];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class RatingsRoutingModule {}
