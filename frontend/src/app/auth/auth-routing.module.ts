// Módulo de enrutamiento de autenticación. Define las rutas hijas
// para el login y el registro de usuarios.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './login/login.component';
import { Register } from './register/register.component';
import { VerifyEmail } from './verify-email/verify-email.component';
import { ForgotPassword } from './forgot-password/forgot-password.component';
import { ResetPassword } from './reset-password/reset-password.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'verify-email', component: VerifyEmail },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AuthRoutingModule {}
