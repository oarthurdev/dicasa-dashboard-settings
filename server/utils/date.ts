type Frequency = "daily" | "weekly" | "monthly";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function getCurrentMonthRange(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

const UTC_MINUS_3 = -3;

/**
 * Converte Date para "data base" em UTC-3
 */
function toUTCMinus3(date: any) {
  const d = new Date(date);
  d.setHours(d.getHours() + UTC_MINUS_3);
  return d;
}

function isWeekend(date: any) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function nextBusinessDay(date: any) {
  const d = new Date(date);

  while (isWeekend(d)) {
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return d;
}

function getBusinessWeekRange(base = new Date()) {
  // Converte base para UTC-3
  const baseUTC = new Date(base);
  baseUTC.setHours(baseUTC.getHours() - 3);

  const day = baseUTC.getUTCDay(); // 0 dom ... 5 sex

  // Sexta-feira = 5
  // Se hoje já passou da sexta, usa esta; senão, volta para a última
  const diffToCurrentFriday =
    day >= 5 ? 5 - day : -(7 - (5 - day));

  // Sexta atual
  const currentFriday = new Date(baseUTC);
  currentFriday.setUTCDate(baseUTC.getUTCDate() + diffToCurrentFriday);

  // Sexta passada
  const lastFriday = new Date(currentFriday);
  lastFriday.setUTCDate(currentFriday.getUTCDate() - 7);

  // Start: sexta passada 08:00 UTC-3 (11:00 UTC)
  const start = new Date(Date.UTC(
    lastFriday.getUTCFullYear(),
    lastFriday.getUTCMonth(),
    lastFriday.getUTCDate(),
    11, 0, 0, 0
  ));

  // End: sexta atual 18:00 UTC-3 (21:00 UTC)
  const end = new Date(Date.UTC(
    currentFriday.getUTCFullYear(),
    currentFriday.getUTCMonth(),
    currentFriday.getUTCDate(),
    21, 0, 0, 0
  ));

  return { start, end };
}

function getCurrentDayRange(base = new Date()) {
  return { start: startOfDay(base), end: endOfDay(base) };
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonthsKeepDay(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();

  d.setMonth(d.getMonth() + months, 1); // vai pro dia 1 pra evitar overflow
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));

  return d;
}

export function computeNextGeneration(prev: Date, frequency: string) {
  const f = (frequency || "monthly").toLowerCase() as Frequency;

  if (f === "daily") return addDays(prev, 1);
  if (f === "weekly") return addDays(prev, 7);
  return addMonthsKeepDay(prev, 1);
}

export function getRangeByFrequency(frequency: string, base = new Date()) {
  const f = (frequency || "monthly").toLowerCase() as Frequency;

  if (f === "daily") return getCurrentDayRange(base);      // como você já tinha
  if (f === "weekly") return getBusinessWeekRange(base);   // ✅ aqui o ajuste
  return getCurrentMonthRange(base);
}
