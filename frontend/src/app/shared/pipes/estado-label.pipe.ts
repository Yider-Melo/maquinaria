import { Pipe, PipeTransform } from '@angular/core';

const LABELS: Record<string, string> = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', en_curso: 'En curso',
  completada: 'Completada', cancelada: 'Cancelada', rechazada: 'Rechazada',
  retenido: 'Retenido', liberado: 'Liberado', reembolsado: 'Reembolsado',
  fallido: 'Fallido', procesando: 'Procesando', nuevo: 'Nuevo',
  excelente: 'Excelente', bueno: 'Bueno', regular: 'Regular'
};

@Pipe({ name: 'estadoLabel', pure: true, standalone: true })
export class EstadoLabelPipe implements PipeTransform {
  transform(value: string): string {
    return LABELS[value] || value;
  }
}