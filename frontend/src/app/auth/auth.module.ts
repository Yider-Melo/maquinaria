// Módulo de autenticación. Agrupa los componentes de inicio de sesión
// y registro, y los importa mediante carga diferida.
import { NgModule } from '@angular/core';
import { AuthRoutingModule } from './auth-routing.module';
import { SharedModule } from '../shared/shared.module';
import { Login } from './login/login.component';
import { Register } from './register/register.component';
import { VerifyEmail } from './verify-email/verify-email.component';
import { ForgotPassword } from './forgot-password/forgot-password.component';
import { ResetPassword } from './reset-password/reset-password.component';

@NgModule({ declarations: [Login, Register, VerifyEmail, ForgotPassword, ResetPassword], imports: [AuthRoutingModule, SharedModule] })
export class AuthModule {}
