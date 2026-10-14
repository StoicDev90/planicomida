const numberFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** 1.5 → "1,5"; 1000 → "1000" (sin separador de miles). */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Cantidad + unidad para mostrar: "2 unidades", "1,5 kg", "a gusto". Sin cantidad ni "a gusto" → "". */
export function formatAmount(qty: number | null, unit: string | null): string {
  if (qty === null) return unit === 'a gusto' ? 'a gusto' : '';
  if (unit === 'unidad') return `${formatNumber(qty)} ${qty === 1 ? 'unidad' : 'unidades'}`;
  return unit ? `${formatNumber(qty)} ${unit}` : formatNumber(qty);
}
