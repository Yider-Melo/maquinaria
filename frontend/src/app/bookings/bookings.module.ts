// Módulo de reservas. Contiene los componentes para listar y ver el
// detalle de las reservas realizadas por el usuario.
import { NgModule } from '@angular/core';
import { BookingsRoutingModule } from './bookings-routing.module';
import { SharedModule } from '../shared/shared.module';
import { BookingsList } from './list/list.component';
import { BookingsDetail } from './detail/detail.component';

@NgModule({ declarations: [BookingsList, BookingsDetail], imports: [BookingsRoutingModule, SharedModule] })
export class BookingsModule {}
