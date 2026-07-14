import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotFoundComponent } from './not-found.component';

@NgModule({
  declarations: [NotFoundComponent],
  imports: [
    RouterModule.forChild([{ path: '', component: NotFoundComponent }]),
    MatButtonModule,
    MatIconModule
  ]
})
export class NotFoundModule {}