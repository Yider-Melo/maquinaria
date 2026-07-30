import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { routeAnimations } from './animations';
@Component({ selector: 'app-root', templateUrl: './app.html', standalone: false, styleUrl: './app.css', animations: [routeAnimations] })
export class App {
  prepareRoute(outlet: RouterOutlet) {
    return outlet?.activatedRouteData?.['animation'];
  }
}
