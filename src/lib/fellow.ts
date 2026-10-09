/** "#0427": the permanent fellow number, zero-padded to four digits. Used everywhere a fellow's name appears. */
export function formatFellow(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`invalid fellow number: ${n}`);
  return `#${String(n).padStart(4, '0')}`;
}
