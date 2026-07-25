// Módulo de valoraciones. Contiene el componente para listar las
// calificaciones recibidas por el usuario.
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RatingsRoutingModule } from './ratings-routing.module';
import { SharedModule } from '../shared/shared.module';
import { RatingsList } from './list/list.component';
import { RatingsDetail } from './detail/detail.component';
import { RatingForm } from './form/form';

@NgModule({ declarations: [RatingsList, RatingsDetail, RatingForm], imports: [RatingsRoutingModule, SharedModule], exports: [RatingForm], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
export class RatingsModule {}
