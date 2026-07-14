import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'formatId', pure: true, standalone: true })
export class FormatIdPipe implements PipeTransform {
  transform(value: string, prefix = 'ID'): string {
    if (!value) return '';
    return value.length > 8 ? `${prefix}: ${value.substring(0, 8)}...` : `${prefix}: ${value}`;
  }
}