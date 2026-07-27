import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-legal-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <div [innerHTML]="data.content"></div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="true">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { max-height: 70vh; line-height: 1.7; white-space: pre-wrap; }
    h2 { color: var(--rm-primary-dark, #0f766e); }
  `],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule]
})
export class LegalDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { title: string; content: string }) {}
}
