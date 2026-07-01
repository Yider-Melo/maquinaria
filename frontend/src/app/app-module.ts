// Módulo raíz de la aplicación. Declara el componente App, importa los módulos
// principales (navegación, formularios, animaciones, HTTP) y configura
// el manejador global de errores y el interceptor de autenticación.
import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { SharedModule } from './shared/shared-module';
import { authInterceptor } from './core/interceptors/auth-interceptor';

// Manejador global de errores. En caso de error 401 (no autorizado),
// limpia las credenciales almacenadas y redirige al login.
export class GlobalErrorHandler implements ErrorHandler {
    constructor(private router: Router) {}
    handleError(error: any) {
        console.error('Error global:', error);
        if (error?.status === 401) {
            localStorage.removeItem('rentamaq_token');
            localStorage.removeItem('rentamaq_user');
            this.router.navigate(['/auth/login']);
        }
    }
}

@NgModule({
  declarations: [App],
  imports: [BrowserModule, BrowserAnimationsModule, FormsModule, AppRoutingModule, SharedModule],
  providers: [
      { provide: ErrorHandler, useClass: GlobalErrorHandler, deps: [Router] },
      provideHttpClient(withInterceptors([authInterceptor]))
  ],
  bootstrap: [App]
})
export class AppModule {}
