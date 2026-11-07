export function inr(value: number) { return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value || 0); }
export function jsonError(message: string, status = 400) { return Response.json({ error: message }, { status }); }
