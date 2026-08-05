// Módulo compartido que declara y exporta componentes reutilizables
// (Header, Footer, Loading) y módulos comunes de Angular y Angular Material
// para que estén disponibles en todos los módulos feature sin importarlos repetidamente.
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';

import { Header } from './header/header.component';
import { Footer } from './footer/footer.component';
import { Loading } from './loading/loading.component';
import { SkeletonCard } from './skeleton-card/skeleton-card.component';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { RevealDirective } from './reveal/reveal.directive';
import { FormatDatePipe } from './pipes/format-date.pipe';
import { FormatDateTimePipe } from './pipes/format-datetime.pipe';
import { EstadoLabelPipe } from './pipes/estado-label.pipe';
import { FormatIdPipe } from './pipes/format-id.pipe';

@NgModule({
  declarations: [Header, Footer, Loading, SkeletonCard, BreadcrumbComponent],
  imports: [
    CommonModule,
    RevealDirective,
    FormatDatePipe, FormatDateTimePipe, EstadoLabelPipe, FormatIdPipe,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatMenuModule,
    MatDividerModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatCheckboxModule,
    MatTabsModule,
    MatRippleModule
  ],
  exports: [
    CommonModule, RouterModule, FormsModule, ReactiveFormsModule,
    MatToolbarModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatAutocompleteModule, MatMenuModule, MatTabsModule, MatIconModule,
    MatDialogModule, MatSnackBarModule, MatBadgeModule, MatCheckboxModule, MatDividerModule, MatRippleModule,
    Header, Footer, Loading, SkeletonCard, BreadcrumbComponent, RevealDirective, FormatDatePipe, FormatDateTimePipe, EstadoLabelPipe, FormatIdPipe
  ]
})
export class SharedModule {}
