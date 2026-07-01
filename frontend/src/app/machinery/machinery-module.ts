// Módulo de maquinaria. Agrupa los componentes de listado, detalle,
// formulario y mapa de maquinaria. Se carga mediante lazy loading.
import { NgModule } from '@angular/core';
import { MachineryRoutingModule } from './machinery-routing-module';
import { SharedModule } from '../shared/shared-module';
import { MachineryList } from './list/list';
import { MachineryDetail, ConfirmDialog } from './detail/detail';
import { MachineryForm } from './form/form';
import { MachineryMap } from './map/map';

@NgModule({ declarations: [MachineryList, MachineryDetail, ConfirmDialog, MachineryForm, MachineryMap], imports: [MachineryRoutingModule, SharedModule] })
export class MachineryModule {}
