const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseDate(iso: string): Date | null {
  if (!iso) return null;
  if (iso.length === 10) return new Date(iso + 'T12:00:00');
  return new Date(iso);
}

export function formatDate(iso: string): string {
  const d = parseDate(iso);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(iso: string): string {
  const d = parseDate(iso);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatDateTime(iso: string): string {
  const d = parseDate(iso);
  if (!d) return '—';
  const hrs = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${hrs}:${min}`;
}

export function formatDateRelative(iso: string): string {
  if (!iso) return '—';
  const d = parseDate(iso);
  if (!d) return '—';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  return formatDate(iso);
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
    pagada: 'Pagada', pagado: 'Pagado', pendiente_pago: 'Pendiente de pago', fallido: 'Fallido', reembolsado: 'Reembolsado'
  };
  return labels[state] || state;
}
