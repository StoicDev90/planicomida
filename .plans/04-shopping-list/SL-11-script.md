# SL-11 · Tachar, "Destildar todo" y "Compartir"

- **Módulo:** shopping-list · **Depende de:** SL-09, SL-10 · **Modelo sugerido:** medio

## Leé antes
- `.specs/SPEC-shopping-list.md` líneas 98–102 (tachado) y 107–113 (UI: tachado se baja al final, compartir).
- `src/pages/app/lista.astro` (SL-10: `#shopping-list`, `data-toolbar`, `data-check`, `data-key`, `data-item`, `data-index`).
- `src/lib/checked-store.ts` (SL-09).

## Archivos
- Modificar: `src/pages/app/lista.astro` (agregar al final del archivo, después de `</Layout>`, el `<style>` y el `<script>` de abajo)

## Contrato (copiar tal cual)
```astro
<style is:global>
  #shopping-list .is-checked {
    opacity: 0.55;
  }
  #shopping-list .is-checked [data-name] {
    text-decoration: line-through;
  }
</style>

<script>
  import { loadChecked, saveChecked, type KeyValueStorage } from '@/lib/checked-store';

  const root = document.querySelector<HTMLElement>('#shopping-list');
  if (root) {
    const userId = Number(root.dataset.user);
    const week = root.dataset.week!;
    let storage: KeyValueStorage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    const checked = storage ? loadChecked(storage, userId, week) : new Set<string>();
    const boxes = [...root.querySelectorAll<HTMLInputElement>('input[data-check]')];
    const status = root.querySelector<HTMLElement>('[data-share-status]')!;

    /** No tachados en su orden original; tachados al final. */
    function reorder(list: Element) {
      const items = [...list.children] as HTMLElement[];
      items.sort(
        (a, b) =>
          Number(a.classList.contains('is-checked')) - Number(b.classList.contains('is-checked')) ||
          Number(a.dataset.index) - Number(b.dataset.index),
      );
      list.append(...items);
    }

    function apply(box: HTMLInputElement) {
      const item = box.closest<HTMLElement>('[data-item]')!;
      item.classList.toggle('is-checked', box.checked);
      reorder(item.parentElement!);
    }

    function persist() {
      if (storage) saveChecked(storage, userId, week, checked);
    }

    boxes.forEach((box) => {
      box.checked = checked.has(box.dataset.key!);
      apply(box);
      box.addEventListener('change', () => {
        if (box.checked) checked.add(box.dataset.key!);
        else checked.delete(box.dataset.key!);
        persist();
        apply(box);
      });
    });
    // Keys tachadas que ya no están en la lista se olvidan.
    for (const key of [...checked]) if (!boxes.some((b) => b.dataset.key === key)) checked.delete(key);
    persist();

    root.querySelector('[data-uncheck-all]')!.addEventListener('click', () => {
      checked.clear();
      persist();
      boxes.forEach((box) => {
        box.checked = false;
        apply(box);
      });
    });

    root.querySelector('[data-share]')!.addEventListener('click', async () => {
      const text = root.dataset.shareText ?? '';
      try {
        if (navigator.share) {
          await navigator.share({ title: 'Lista del súper', text });
          return;
        }
        await navigator.clipboard.writeText(text);
        status.textContent = 'Lista copiada';
      } catch (error) {
        if ((error as Error).name === 'AbortError') return; // cerró el diálogo de compartir
        const area = document.createElement('textarea');
        area.className = 'input mt-4 h-64';
        area.readOnly = true;
        area.value = text;
        root.querySelector('[data-toolbar]')!.after(area);
        area.select();
        status.textContent = 'Copiá el texto de abajo';
      }
    });

    root.querySelector<HTMLElement>('[data-toolbar]')!.hidden = false;
  }
</script>
```

## Verificación
```bash
npm run check
npx vitest run
npm run build
```
Prueba manual (obligatoria) con la semana de SL-10 cargada:
1. En el celular (o DevTools a 360 px): tachar 3 ítems → bajan al final de su góndola, tachados y más claros.
2. Recargar → siguen tachados. Ir a otra semana y volver → la otra semana tiene su propio estado.
3. Destildar uno → vuelve a su lugar original. "Destildar todo" → todos destildados.
4. Planificar una receta nueva en esa semana desde el planner y volver → los ítems nuevos aparecen sin tachar.
5. "Compartir": en el celular abre el menú de compartir; en la PC copia la lista y aparece "Lista copiada"
   (pegar en un editor y comparar con el formato de SL-08).
6. Con JS desactivado, la página se sigue viendo y la barra de "Destildar/Compartir" no aparece.
7. Tachar 10 ítems con una mano en el celular sin errores de toque (objetivos de 48 px de alto).

## Hecho cuando
- [ ] `check`, tests y build en verde y las 7 pruebas manuales salen bien.

## Commit
`feat(shopping-list): SL-11 tachar, destildar y compartir la lista`
