export const TZ = 'America/Sao_Paulo';

export const fmt = {
  time: iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }),
  date: iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ }),
  datetime: iso => new Date(iso).toLocaleString('pt-BR', { timeZone: TZ }),
};

export function statusLabel(s) {
  return { pending: '⏳ pendente', published: '✅ publicado', failed: '❌ falhou' }[s] ?? s;
}

// Janela UTC para uma hora local em São Paulo
export function getHourWindow(hour) {
  const now = new Date();
  const spDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const h = String(hour).padStart(2, '0');
  return {
    start: new Date(`${spDate}T${h}:00:00-03:00`),
    end:   new Date(`${spDate}T${h}:59:59-03:00`),
  };
}

// Janela do dia inteiro em São Paulo
export function getTodayWindow() {
  const now = new Date();
  const spDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return {
    start: new Date(`${spDate}T00:00:00-03:00`),
    end:   new Date(`${spDate}T23:59:59-03:00`),
  };
}

// Retorna data ISO N dias à frente (meia-noite SP)
export function daysFromNow(n) {
  const now = new Date();
  now.setDate(now.getDate() + n);
  const spDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  return new Date(`${spDate}T23:59:59-03:00`);
}
