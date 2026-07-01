// Componente de detalle de maquinaria. Muestra la información completa
// de un equipo, sus imágenes, y permite al propietario editar, eliminar
// o gestionar las imágenes asociadas.
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-machinery-detail', templateUrl: './detail.html', styleUrls: ['./detail.css'],
  standalone: false
})
export class MachineryDetail implements OnInit {
  item: any = null; images: any[] = []; loading = true;

  constructor(
    private route: ActivatedRoute, public router: Router,
    private api: Api, public auth: Auth,
    private dialog: MatDialog, private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.api.get<any>(`/machinery/${id}`).subscribe(res => {
      this.item = res.data; this.images = res.data?.imagenes || []; this.loading = false;
    });
  }

  isOwner(): boolean { return this.auth.getUser()?.id === this.item?.propietario_id; }

  deleteItem(): void {
    const dialogRef = this.dialog.open(ConfirmDialog);
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.api.delete(`/machinery/${this.item.id}`).subscribe(() => this.router.navigate(['/machinery']));
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || !this.item) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const url = e.target.result;
      this.api.post(`/machinery/${this.item.id}/images`, { url }).subscribe(() => {
        this.images.push({ url, id: Date.now().toString() });
      });
    };
    reader.readAsDataURL(file);
  }

  removeImage(imageId: string): void {
    this.api.delete(`/machinery/${this.item.id}/images/${imageId}`).subscribe(() => {
      this.images = this.images.filter(i => i.id !== imageId);
    });
  }

  deleteImage(imageId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialog);
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) this.removeImage(imageId);
    });
  }
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Confirmar</h2>
    <mat-dialog-content>¿Estás seguro de realizar esta acción?</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Aceptar</button>
    </mat-dialog-actions>
  `,
  standalone: false
})
export class ConfirmDialog {}
