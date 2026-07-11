const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  const hrs = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} de ${MONTHS[d.getMonth()]}, ${d.getFullYear()} — ${hrs}:${min}`;
}

export function formatId(id: string, prefix = ''): string {
  if (!id) return '—';
  const short = id.slice(0, 8).toUpperCase();
  if (!prefix) return `#${short}`;
  return `${prefix} ${short}`;
}

export function estadoLabel(state: string): string {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente', confirmada: 'Aprobada', en_curso: 'En curso',
    completada: 'Finalizada', cancelada: 'Cancelada', rechazada: 'Rechazada',
    pagado: 'Pagado', pendiente_pago: 'Pendiente de pago', fallido: 'Fallido', reembolsado: 'Reembolsado'
  };
  return labels[state] || state;
}
