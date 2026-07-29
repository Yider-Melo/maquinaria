// Módulo raíz de la aplicación. Declara el componente App, importa los módulos
// principales (navegación, formularios, animaciones, HTTP) y configura
// el manejador global de errores y el interceptor de autenticación.
import { NgModule, ErrorHandler, LOCALE_ID } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';
import { BrowserModule } from '@angular/platform-browser';

registerLocaleData(localeEsCO);
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { AppRoutingModule } from './app-routing.module';
import { App } from './app.component';
import { SharedModule } from './shared/shared.module';
import { CoreModule } from './core/core.module';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';

export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    console.error('Error no capturado:', error);
  }
}

@NgModule({
  declarations: [App],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    AppRoutingModule,
    SharedModule,
    CoreModule
  ],
  providers: [
      { provide: LOCALE_ID, useValue: 'es-CO' },
      { provide: ErrorHandler, useClass: GlobalErrorHandler },
      provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, loggingInterceptor]))
  ],
  bootstrap: [App]
})
export class AppModule {}
