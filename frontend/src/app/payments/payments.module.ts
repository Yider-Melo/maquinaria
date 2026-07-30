import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { PaymentsRoutingModule } from './payments-routing.module';
import { SharedModule } from '../shared/shared.module';
import { PaymentsList } from './list/list.component';
import { PaymentsDetail } from './detail/detail.component';
import { PaymentsStatus } from './status/status.component';

@NgModule({ declarations: [PaymentsList, PaymentsDetail, PaymentsStatus], imports: [PaymentsRoutingModule, SharedModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
export class PaymentsModule {}
