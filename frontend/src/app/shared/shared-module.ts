// Módulo compartido que declara y exporta componentes reutilizables
// (Header, Footer, Loading) y módulos comunes de Angular y Angular Material
// para que estén disponibles en todos los módulos feature sin importarlos repetidamente.
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { Header } from './header/header';
import { Footer } from './footer/footer';
import { Loading } from './loading/loading';

@NgModule({
  declarations: [Header, Footer, Loading],
  imports: [CommonModule, RouterModule, FormsModule, MatToolbarModule, MatButtonModule, MatMenuModule],
  exports: [
    CommonModule, RouterModule, FormsModule,
    MatToolbarModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatMenuModule, MatTabsModule, MatIconModule,
    Header, Footer, Loading
  ]
})
export class SharedModule {}
