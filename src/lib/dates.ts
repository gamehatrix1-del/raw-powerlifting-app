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
