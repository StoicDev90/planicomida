/** Lo mínimo de Storage que usamos (así se puede testear sin navegador). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** `pc:checked:${userId}:${weekStart}` */
export function checkedStorageKey(userId: number, weekStart: string): string {
  return `pc:checked:${userId}:${weekStart}`;
}

/** Keys tachadas. JSON roto, algo que no sea un arreglo, o un storage que lanza → Set vacío. Ignora valores que no son string. */
export function loadChecked(
  storage: KeyValueStorage,
  userId: number,
  weekStart: string,
): Set<string> {
  try {
    const raw = storage.getItem(checkedStorageKey(userId, weekStart));
    if (raw === null) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

/** Guarda como arreglo JSON. Si no hay keys, borra la entrada. Si el storage lanza (lleno, bloqueado), no hace nada. */
export function saveChecked(
  storage: KeyValueStorage,
  userId: number,
  weekStart: string,
  keys: Iterable<string>,
): void {
  const key = checkedStorageKey(userId, weekStart);
  const list = Array.from(keys);
  try {
    if (list.length === 0) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage lleno o bloqueado: el tachado queda solo en memoria.
  }
}
