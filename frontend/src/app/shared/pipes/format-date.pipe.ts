import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatDate', pure: true, standalone: true })
export class FormatDatePipe implements PipeTransform {
  transform(value: string | Date): string {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'short', day: 'numeric' });
  }
}