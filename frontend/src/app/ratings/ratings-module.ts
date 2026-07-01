// Módulo de valoraciones. Contiene el componente para listar las
// calificaciones recibidas por el usuario.
import { NgModule } from '@angular/core';
import { RatingsRoutingModule } from './ratings-routing-module';
import { SharedModule } from '../shared/shared-module';
import { RatingsList } from './list/list';

@NgModule({ declarations: [RatingsList], imports: [RatingsRoutingModule, SharedModule] })
export class RatingsModule {}
