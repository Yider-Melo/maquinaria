// Módulo de maquinaria. Agrupa los componentes de listado, detalle,
// formulario y mapa de maquinaria. Se carga mediante lazy loading.
import { NgModule } from '@angular/core';
import { MachineryRoutingModule } from './machinery-routing.module';
import { SharedModule } from '../shared/shared.module';
import { MachineryList } from './list/list.component';
import { MachineryDetail } from './detail/detail.component';
import { MachineryForm } from './form/form.component';
import { MachineryMap } from './map/map.component';

@NgModule({ declarations: [MachineryList, MachineryDetail, MachineryForm, MachineryMap], imports: [MachineryRoutingModule, SharedModule] })
export class MachineryModule {}
