// Punto de entrada principal de la aplicación Angular.
// Inicializa el módulo raíz (AppModule) usando el compilador JIT de Angular.
import 'zone.js';
import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app.module';

platformBrowser().bootstrapModule(AppModule, { ngZone: 'zone.js' })
  .catch(err => console.error(err));
