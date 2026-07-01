// Módulo de enrutamiento de notificaciones. Ruta protegida para el listado.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotificationsList } from './list/list';
import { AuthGuard } from '../core/guards/auth-guard';

const routes: Routes = [{ path: '', component: NotificationsList, canActivate: [AuthGuard] }];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class NotificationsRoutingModule {}
