/** trim, colapsa espacios, minúsculas y sin tildes: " Tomaté  Perita " → "tomate perita". */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
