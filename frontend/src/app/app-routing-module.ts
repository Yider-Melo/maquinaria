// Módulo de enrutamiento principal. Define las rutas raíz de la aplicación
// con carga diferida (lazy loading) para cada módulo feature.
// La ruta por defecto redirige al listado de maquinaria.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'auth', loadChildren: () => import('./auth/auth-module').then(m => m.AuthModule) },
  { path: 'machinery', loadChildren: () => import('./machinery/machinery-module').then(m => m.MachineryModule) },
  { path: 'bookings', loadChildren: () => import('./bookings/bookings-module').then(m => m.BookingsModule) },
  { path: 'payments', loadChildren: () => import('./payments/payments-module').then(m => m.PaymentsModule) },
  { path: 'ratings', loadChildren: () => import('./ratings/ratings-module').then(m => m.RatingsModule) },
  { path: 'notifications', loadChildren: () => import('./notifications/notifications-module').then(m => m.NotificationsModule) },
  { path: '', redirectTo: '/machinery', pathMatch: 'full' },
  { path: '**', redirectTo: '/machinery' }
];

@NgModule({ imports: [RouterModule.forRoot(routes)], exports: [RouterModule] })
export class AppRoutingModule {}
