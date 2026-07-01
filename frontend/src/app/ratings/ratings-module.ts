// Módulo de valoraciones. Contiene el componente para listar las
// calificaciones recibidas por el usuario.
import { NgModule } from '@angular/core';
import { RatingsRoutingModule } from './ratings-routing-module';
import { SharedModule } from '../shared/shared-module';
import { RatingsList } from './list/list';
import { RatingForm } from './form/rating-form';

@NgModule({ declarations: [RatingsList, RatingForm], imports: [RatingsRoutingModule, SharedModule] })
export class RatingsModule {}
