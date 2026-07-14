import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'app-rating-form',
  templateUrl: './form.html',
  styleUrls: ['./form.css']
})
export class RatingForm {
  puntuacion = 5;
  comentario = '';
  hoverRating = -1;

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
