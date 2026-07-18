const rawTaxRate = import.meta.env.VITE_TAX_RATE;
const parsedTaxRate = rawTaxRate === undefined || rawTaxRate === '' ? NaN : Number(rawTaxRate);

export const TAX_RATE = Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0.1;
