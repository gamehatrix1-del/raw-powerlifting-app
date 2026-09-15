// Returns the ISO date (YYYY-MM-DD) of the Monday on/before the given date.
export function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday back to the prior Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function thisMonday(): string {
  return mondayOf(new Date());
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function addInterval(
  isoDate: string,
  interval: "monthly" | "quarterly" | "yearly"
): string {
  const d = new Date(isoDate);
  const months = interval === "monthly" ? 1 : interval === "quarterly" ? 3 : 12;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// Consecutive days (ending today or yesterday) present in loggedDateKeys.
export function computeStreak(loggedDateKeys: Set<string>): number {
  const cursor = new Date();
  if (!loggedDateKeys.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1); // allow "today not logged yet"
  }

  let streak = 0;
  while (loggedDateKeys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
