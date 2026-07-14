// Módulo de notificaciones. Contiene el componente para listar y
// gestionar las notificaciones del usuario.
import { NgModule } from '@angular/core';
import { NotificationsRoutingModule } from './notifications-routing.module';
import { SharedModule } from '../shared/shared.module';
import { NotificationsList } from './list/list.component';

@NgModule({ declarations: [NotificationsList], imports: [NotificationsRoutingModule, SharedModule] })
export class NotificationsModule {}
