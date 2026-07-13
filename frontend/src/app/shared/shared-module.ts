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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Header } from './header/header';
import { Footer } from './footer/footer';
import { Loading } from './loading/loading';
import { SkeletonCard } from './skeleton-card/skeleton-card';

@NgModule({
  declarations: [Header, Footer, Loading, SkeletonCard],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
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
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule
  ],
  exports: [
    CommonModule, RouterModule, FormsModule,
    MatToolbarModule, MatButtonModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatAutocompleteModule, MatMenuModule, MatTabsModule, MatIconModule,
    MatDialogModule, MatSnackBarModule, MatBadgeModule, MatProgressSpinnerModule, MatDividerModule, MatTooltipModule,
    Header, Footer, Loading, SkeletonCard
  ]
})
export class SharedModule {}
