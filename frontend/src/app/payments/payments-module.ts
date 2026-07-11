// Módulo de pagos. Contiene el componente que lista los pagos
// asociados a las reservas del usuario.
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PaymentsRoutingModule } from './payments-routing-module';
import { SharedModule } from '../shared/shared-module';
import { PaymentsList } from './list/list';
import { PaymentsDetail } from './detail/detail';

@NgModule({ declarations: [PaymentsList, PaymentsDetail], imports: [PaymentsRoutingModule, SharedModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
export class PaymentsModule {}
