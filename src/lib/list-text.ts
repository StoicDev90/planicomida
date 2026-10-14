import { formatAmount } from '@/lib/format';
import type { ShoppingItem, ShoppingList } from '@/services/shopping-list';

/** "- Papa: 1,5 kg" · "- Sal (a gusto)" · "- Papel higiénico" */
export function itemLine(item: ShoppingItem): string {
  const amount = formatAmount(item.qty, item.unit);
  if (item.unit === 'a gusto') return `- ${item.name} (a gusto)`;
  if (amount === '') return `- ${item.name}`;
  return `- ${item.name}: ${amount}`;
}

/** Texto plano para compartir. `weekLabel` = "Semana del lun 12 al dom 18 oct". */
export function listToText(list: ShoppingList, weekLabel: string): string {
  const lines = [`Lista del súper · ${weekLabel}`];
  if (list.aisles.length === 0) {
    lines.push('', 'La lista está vacía.');
    return lines.join('\n');
  }
  for (const group of list.aisles) {
    lines.push('', group.aisle, ...group.items.map(itemLine));
  }
  return lines.join('\n');
}
