# SL-09 · Guardado del tachado en `localStorage`

- **Módulo:** shopping-list · **Depende de:** — · **Modelo sugerido:** chico

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 98–102 (clave `pc:checked:<userId>:<weekStart>`, arreglo de `key`s).

## Archivos
- Crear: `src/lib/checked-store.ts`
- Crear: `tests/lib/checked-store.test.ts`

## Contrato — `src/lib/checked-store.ts`
```ts
/** Lo mínimo de Storage que usamos (así se puede testear sin navegador). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** `pc:checked:${userId}:${weekStart}` */
export function checkedStorageKey(userId: number, weekStart: string): string;

/** Keys tachadas. JSON roto, algo que no sea un arreglo, o un storage que lanza → Set vacío. Ignora valores que no son string. */
export function loadChecked(storage: KeyValueStorage, userId: number, weekStart: string): Set<string>;

/** Guarda como arreglo JSON. Si no hay keys, borra la entrada. Si el storage lanza (lleno, bloqueado), no hace nada. */
export function saveChecked(storage: KeyValueStorage, userId: number, weekStart: string, keys: Iterable<string>): void;
```

## Tests primero — `tests/lib/checked-store.test.ts`
Storage falso:
```ts
function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
const broken: KeyValueStorage = {
  getItem: () => { throw new Error('bloqueado'); },
  setItem: () => { throw new Error('lleno'); },
  removeItem: () => { throw new Error('bloqueado'); },
};
```
1. `checkedStorageKey(7, '2026-10-12')` → `'pc:checked:7:2026-10-12'`.
2. Guardar `['tomate|unidad', 'manual|3']` y volver a cargar → `Set` con esas dos.
3. Semanas independientes: lo guardado en `'2026-10-12'` no aparece al cargar `'2026-10-19'`.
4. `saveChecked(..., [])` borra la entrada (`data.has(key) === false`).
5. Valor guardado `'{roto'` → `Set` vacío; `'{"a":1}'` → vacío; `'["a", 2, null]'` → `Set(['a'])`.
6. `broken`: `loadChecked` → vacío y `saveChecked` no lanza.

## Verificación
```bash
npx vitest run tests/lib/checked-store.test.ts
npx vitest run
npm run check
```

## Hecho cuando
- [ ] Los 6 casos pasan.

## Commit
`feat(shopping-list): SL-09 guardado del tachado por semana`
