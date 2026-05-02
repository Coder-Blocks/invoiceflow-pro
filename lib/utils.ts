export function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function formatDateInput(date?: Date | string | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function generateSequence(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}