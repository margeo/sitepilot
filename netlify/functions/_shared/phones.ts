export interface PhoneNumbers {
  mobiles: string[];
  landlines: string[];
  display: string[];
}

// Greek mobile: starts +30 69 (after stripping spaces)
// Greek landline: starts +30 2 (after stripping spaces)
// Also handles generic numbers from other countries: +xxx 6... often mobile,
// but when unsure, we classify any +N then 6/7/8/9 short prefix as mobile
// based on common EU mobile prefixes (safe-fail).
export function classifyPhones(raws: string[]): PhoneNumbers {
  const mobiles: string[] = [];
  const landlines: string[] = [];
  const display: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    if (!raw) continue;
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    const key = cleaned.replace(/[^+0-9]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    display.push(cleaned);

    const digits = key.replace(/^\+/, "");
    if (digits.startsWith("30")) {
      // Greek number
      const rest = digits.slice(2);
      if (rest.startsWith("69")) mobiles.push(cleaned);
      else landlines.push(cleaned);
    } else if (key.startsWith("+")) {
      // Non-Greek — best effort: treat leading 6/7 after country code as mobile
      const cc = digits.match(/^(\d{1,3})/)?.[1] ?? "";
      const rest = digits.slice(cc.length);
      if (/^[67]/.test(rest)) mobiles.push(cleaned);
      else landlines.push(cleaned);
    } else {
      landlines.push(cleaned);
    }
  }
  return { mobiles, landlines, display };
}

export function waDigits(mobile: string): string {
  // Convert for https://wa.me/<digits>
  return mobile.replace(/[^0-9]/g, "");
}
