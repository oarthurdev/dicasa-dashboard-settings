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

function getBusinessWeekRange(base = new Date()) {
  // Semana começa na segunda (BR)
  const day = base.getDay(); // 0 dom ... 6 sáb
  const diffToMonday = (day === 0 ? -6 : 1) - day;

  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);

  // Segunda 09:00
  const start = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate(),
    9, 0, 0, 0
  );

  // Sexta 18:00
  const friday = new Date(start);
  friday.setDate(start.getDate() + 4);

  const end = new Date(
    friday.getFullYear(),
    friday.getMonth(),
    friday.getDate(),
    18, 0, 0, 0
  );

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
