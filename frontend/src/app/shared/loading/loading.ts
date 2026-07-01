// Componente de indicador de carga. Muestra un spinner o animación
// mientras se espera la respuesta de alguna operación asíncrona.
import { Component } from '@angular/core';
@Component({
  selector: 'app-loading',
  templateUrl: './loading.html',
  styleUrls: ['./loading.css'],
  standalone: false
})
export class Loading {}
