import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  @Input('appReveal') delay: number | string = 0;

  private observer?: IntersectionObserver;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    this.renderer.addClass(this.el.nativeElement, 'reveal');

    const reduced = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (typeof IntersectionObserver === 'undefined' || reduced) {
      this.renderer.addClass(this.el.nativeElement, 'reveal-in');
      this.renderer.removeClass(this.el.nativeElement, 'reveal');
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.show();
          this.observer?.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -48px 0px' });

    this.observer.observe(this.el.nativeElement);
  }

  private show(): void {
    const delay = Number(this.delay) || 0;
    const el = this.el.nativeElement;
    setTimeout(() => {
      this.renderer.addClass(el, 'reveal-in');
      setTimeout(() => this.renderer.removeClass(el, 'reveal'), 700);
    }, delay);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
