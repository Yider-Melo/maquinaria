// Módulo de valoraciones. Contiene el componente para listar las
// calificaciones recibidas por el usuario.
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RatingsRoutingModule } from './ratings-routing-module';
import { SharedModule } from '../shared/shared-module';
import { RatingsList } from './list/list';
import { RatingsDetail } from './detail/detail';
import { RatingForm } from './form/rating-form';

@NgModule({ declarations: [RatingsList, RatingsDetail, RatingForm], imports: [RatingsRoutingModule, SharedModule], schemas: [CUSTOM_ELEMENTS_SCHEMA] })
export class RatingsModule {}
