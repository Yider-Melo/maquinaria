const TZ = 'America/Bogota';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseDate(iso: string): Date | null {
  if (!iso) return null;
  if (iso.length === 10) return new Date(iso + 'T12:00:00');
  return new Date(iso);
}

function formatInTZ(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-CO', { ...options, timeZone: TZ }).format(date);
}

function bogotaNow(): Date {
  const now = new Date();
  const bogota = new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(now);
  const get = (t: string) => parseInt(bogota.find(p => p.type === t)!.value, 10);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
}

export function formatDate(iso: string): string {
  const d = parseDate(iso);
  if (!d) return '—';
  const { day, month, year } = Object.fromEntries(
    new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, p.value])
  ) as any;
  const m = parseInt(month, 10) - 1;
  return `${parseInt(day, 10)} ${MONTHS[m]} ${year}`;
}

export function formatDateShort(iso: string): string {
  const d = parseDate(iso);
  if (!d) return '—';
  const { day, month } = Object.fromEntries(
    new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: 'numeric', month: 'numeric' })
      .formatToParts(d).filter(p => p.type !== 'literal').map(p => [p.type, p.value])
  ) as any;
  const m = parseInt(month, 10) - 1;
  return `${parseInt(day, 10)} ${MONTHS[m]}`;
}

export function formatDateTime(iso: string): string {
  const d = parseDate(iso);
  if (!d) return '—';
  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const day = parseInt(get('day'), 10);
  const m = parseInt(get('month'), 10) - 1;
  return `${day} ${MONTHS[m]} ${get('year')} ${get('hour')}:${get('minute')}`;
}

export function formatDateRelative(iso: string): string {
  if (!iso) return '—';
  const d = parseDate(iso);
  if (!d) return '—';
  const now = bogotaNow();
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
