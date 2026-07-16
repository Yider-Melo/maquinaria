import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-rating-form',
  templateUrl: './form.html',
  styleUrls: ['./form.css']
})
export class RatingForm {
  puntuacion: number;
  comentario: string;
  hoverRating = -1;
  calificacionMaquinaria: number;

  constructor(
    public dialogRef: MatDialogRef<RatingForm>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.puntuacion = data.puntuacion_existente || 5;
    this.comentario = data.comentario_existente || '';
    this.calificacionMaquinaria = data.puntuacion_maquinaria_existente || 5;
  }

  submit(): void {
    this.dialogRef.close({ puntuacion: this.puntuacion, comentario: this.comentario, puntuacion_maquinaria: this.calificacionMaquinaria, ...this.data });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  setRating(value: number): void {
    this.puntuacion = value;
    this.hoverRating = -1;
  }

  getDisplayRating(): number {
    return this.hoverRating >= 0 ? this.hoverRating : this.puntuacion;
  }

  getStarIcon(star: number): string {
    const displayRating = this.getDisplayRating();
    if (star <= displayRating) {
      return 'star';
    }
    return 'star_border';
  }

  isHalfStar(value: number): boolean {
    return Number.isInteger(value) ? false : value > 0;
  }
}
