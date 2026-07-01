// Componente que muestra las valoraciones recibidas por el usuario
// autenticado. Consulta el API usando el ID del usuario actual.
import { Component, OnInit } from '@angular/core';
import { Api } from '../../core/services/api';
import { Auth } from '../../core/services/auth';

@Component({
  selector: 'app-ratings-list', templateUrl: './list.html', styleUrls: ['./list.css'],
  standalone: false
})
export class RatingsList implements OnInit {
  ratings: any[] = []; loading = true;

  constructor(private api: Api, private auth: Auth) {}

  // Carga las valoraciones del usuario autenticado.
  ngOnInit(): void {
    const userId = this.auth.getUser()?.id;
    if (userId) this.api.get<any>(`/ratings/user/${userId}`).subscribe(res => { this.ratings = res.data || []; this.loading = false; });
  }
}
