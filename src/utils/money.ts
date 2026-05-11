export function formatINRFromPaise(paise: number): string {
  const p = Math.max(0, Math.floor(paise));
  const rupees = p / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function rupeesInputToPaise(text: string): number {
  const n = Number(String(text).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}
