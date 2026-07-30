// Módulo de enrutamiento principal. Define las rutas raíz de la aplicación
// con carga diferida (lazy loading) para cada módulo feature.
// La ruta por defecto redirige al listado de maquinaria.
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', data: { animation: 'dashboard' }, loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
  { path: 'admin', data: { animation: 'admin' }, loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule) },
  { path: 'auth', data: { animation: 'auth' }, loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) },
  { path: 'machinery', data: { animation: 'machinery' }, loadChildren: () => import('./machinery/machinery.module').then(m => m.MachineryModule) },
  { path: 'bookings', data: { animation: 'bookings' }, loadChildren: () => import('./bookings/bookings.module').then(m => m.BookingsModule) },
  { path: 'payments', data: { animation: 'payments' }, loadChildren: () => import('./payments/payments.module').then(m => m.PaymentsModule) },
  { path: 'ratings', data: { animation: 'ratings' }, loadChildren: () => import('./ratings/ratings.module').then(m => m.RatingsModule) },
  { path: 'notifications', data: { animation: 'notifications' }, loadChildren: () => import('./notifications/notifications.module').then(m => m.NotificationsModule) },
  { path: 'profile', data: { animation: 'profile' }, loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule) },
  { path: '404', data: { animation: 'notFound' }, loadChildren: () => import('./not-found/not-found.module').then(m => m.NotFoundModule) },
  { path: '**', redirectTo: '/404' }
];

@NgModule({ imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })], exports: [RouterModule] })
export class AppRoutingModule {}
