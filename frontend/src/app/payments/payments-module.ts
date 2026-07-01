// Módulo de pagos. Contiene el componente que lista los pagos
// asociados a las reservas del usuario.
import { NgModule } from '@angular/core';
import { PaymentsRoutingModule } from './payments-routing-module';
import { SharedModule } from '../shared/shared-module';
import { PaymentsList } from './list/list';

@NgModule({ declarations: [PaymentsList], imports: [PaymentsRoutingModule, SharedModule] })
export class PaymentsModule {}
