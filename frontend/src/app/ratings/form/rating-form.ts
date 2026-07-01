import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-rating-form',
  templateUrl: './rating-form.html',
  styleUrls: ['./rating-form.css']
})
export class RatingForm {
  puntuacion = 5;
  comentario = '';

  constructor(
    public dialogRef: MatDialogRef<RatingForm>,
    @Inject(MAT_DIALOG_DATA) public data: { reserva_id: string; calificado_id: string; maquinaria_id: string }
  ) {}

  submit(): void {
    this.dialogRef.close({ puntuacion: this.puntuacion, comentario: this.comentario, ...this.data });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
