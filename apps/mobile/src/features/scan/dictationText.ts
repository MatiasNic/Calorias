/** Joins dictated text to what's already written, with one space and no duplicated blanks. */
export function appendDictation(existing: string, heard: string): string {
  const a = existing.trim();
  const b = heard.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} ${b}`;
}
