import type { BusinessDetails, Sector } from "../types";

const PREMIUM_WORDS = /villa|suite|resort|boutique|luxury|fine|signature|premium/i;
const FAMILY_WORDS = /family|traditional|taverna|local/i;

export function computeLeadScore(
  b: Omit<BusinessDetails, "lead_score" | "lead_score_reasons">,
  sector: Sector,
): { score: number; reasons: string[] } {
  let score = 5;
  const reasons: string[] = [];

  if (!b.has_website) {
    score += 3;
    reasons.push("+3 no website");
  } else {
    score -= 2;
    reasons.push("-2 already has a website");
  }

  if ((b.rating ?? 0) >= 4.5) {
    score += 2;
    reasons.push("+2 excellent rating (≥4.5)");
  } else if ((b.rating ?? 0) >= 4.0) {
    score += 1;
    reasons.push("+1 good rating (≥4.0)");
  }

  const rc = b.user_ratings_total ?? 0;
  if (rc >= 300) {
    score += 2;
    reasons.push("+2 high review volume (≥300)");
  } else if (rc >= 100) {
    score += 1;
    reasons.push("+1 solid review volume (≥100)");
  } else if (rc < 15) {
    score -= 1;
    reasons.push("-1 very low review count (<15)");
  }

  if (b.phones.mobiles.length > 0) {
    score += 1;
    reasons.push("+1 mobile number found (WhatsApp-ready)");
  }

  const premiumSectors: Sector[] = ["villa", "hotel", "boutique", "boat_rental"];
  if (premiumSectors.includes(sector)) {
    score += 1;
    reasons.push(`+1 premium sector (${sector})`);
  }

  const txt = `${b.name} ${b.editorial_summary ?? ""}`;
  if (PREMIUM_WORDS.test(txt)) {
    score += 1;
    reasons.push("+1 premium brand cues");
  }
  if (FAMILY_WORDS.test(txt)) {
    reasons.push("0 family/traditional feel noted");
  }

  score = Math.max(1, Math.min(10, score));
  return { score, reasons };
}
