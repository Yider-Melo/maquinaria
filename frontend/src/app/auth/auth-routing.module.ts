// Módulo de enrutamiento de autenticación. Define las rutas hijas
// para el login y el registro de usuarios.
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './login/login.component';
import { Register } from './register/register.component';
import { VerifyEmail } from './verify-email/verify-email.component';

const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'verify-email', component: VerifyEmail }
];
@NgModule({ imports: [RouterModule.forChild(routes)], exports: [RouterModule] })
export class AuthRoutingModule {}
