export const toNumber = v => Number.parseFloat(v ?? 0);
export const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;