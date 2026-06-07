/** Bangladesh mobile — normalize for admin search (matches backend campaign.utils). */

export function sanitizePhoneInput(input: string): string {
  return input.trim().replace(/[\s-]/g, "");
}

export function normalizeBangladeshPhone(input: string): string {
  const cleaned = sanitizePhoneInput(input);
  if (!cleaned) return "";
  if (cleaned.startsWith("+880")) return `0${cleaned.slice(4)}`;
  if (cleaned.startsWith("880") && cleaned.length >= 13) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith("01")) return cleaned;
  return cleaned.replace(/\D/g, "");
}

export function isValidBangladeshPhone(input: string): boolean {
  return /^01[3-9]\d{8}$/.test(normalizeBangladeshPhone(input));
}
