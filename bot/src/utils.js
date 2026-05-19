const TZ = 'America/Sao_Paulo';

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ });
}

export function statusIcon(status) {
  if (status === 'pending')   return '⏳';
  if (status === 'published') return '✅';
  if (status === 'failed')    return '❌';
  return '❓';
}

// Retorna { start, end } em UTC para uma hora específica no horário de SP
export function getHourWindow(hour) {
  const now = new Date();
  const spDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const h = String(hour).padStart(2, '0');
  const start = new Date(`${spDate}T${h}:00:00-03:00`);
  const end   = new Date(`${spDate}T${h}:59:59-03:00`);
  return { start, end };
}

// Retorna início e fim do dia atual em SP (em UTC)
export function getTodayWindow() {
  const now = new Date();
  const spDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const start = new Date(`${spDate}T00:00:00-03:00`);
  const end   = new Date(`${spDate}T23:59:59-03:00`);
  return { start, end };
}
