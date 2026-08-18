// Módulo de enrutamiento de autenticación. Define las rutas hijas
// para el login y el registro de usuarios.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GuestGuard } from '../core/guards/guest.guard';
import { Login } from './login/login.component';
import { Register } from './register/register.component';
import { VerifyEmail } from './verify-email/verify-email.component';
import { ForgotPassword } from './forgot-password/forgot-password.component';
import { ResetPassword } from './reset-password/reset-password.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [GuestGuard] },
  { path: 'register', component: Register, canActivate: [GuestGuard] },
  { path: 'verify-email', component: VerifyEmail, canActivate: [GuestGuard] },
  { path: 'forgot-password', component: ForgotPassword, canActivate: [GuestGuard] },
  { path: 'reset-password', component: ResetPassword, canActivate: [GuestGuard] }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AuthRoutingModule {}
