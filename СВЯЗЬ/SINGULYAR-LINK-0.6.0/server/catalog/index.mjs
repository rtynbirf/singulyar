import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(fs.readFileSync(path.join(HERE, "platforms.json"), "utf8"));

export function listPlatforms({ tier } = {}) {
  let list = DATA.platforms;
  if (tier) list = list.filter(p => p.tier === tier);
  return list;
}

export function getPlatform(id) {
  return DATA.platforms.find(p => p.id === id) || null;
}

export function platformsByTier() {
  const out = {};
  for (const p of DATA.platforms) {
    (out[p.tier] ||= []).push(p);
  }
  return out;
}

/** Build invite payloads for UI / API from catalog */
export function buildInvitesFromCatalog({ room, joinUrl, familyName = "семья" }) {
  const text = `Присоединяйся к семейному пространству «${familyName}»\nКомната: ${room}\n${joinUrl}`;
  const short = `Семейный разговор «${familyName}»: ${joinUrl}`;
  const enc = encodeURIComponent;

  return DATA.platforms
    .filter(p => p.invite)
    .map(p => {
      const inv = p.invite;
      let actionUrl = null;
      let copyText = text;

      if (inv.type === "direct" || inv.type === "url" || inv.type === "matrix") {
        actionUrl = joinUrl;
        copyText = joinUrl;
      } else if (inv.type === "wa.me" || inv.type === "share" || inv.type === "deep-link") {
        actionUrl = (inv.template || "")
          .replace("{text}", enc(text))
          .replace("{url}", enc(joinUrl))
          .replace("{subject}", enc(familyName));
      } else if (inv.type === "sms") {
        actionUrl = (inv.template || "").replace("{text}", enc(short));
      } else if (inv.type === "mailto") {
        actionUrl = (inv.template || "")
          .replace("{subject}", enc(`Семейное пространство «${familyName}»`))
          .replace("{text}", enc(text));
      } else if (inv.type === "clipboard") {
        copyText = text;
      }

      return {
        id: p.id,
        name: p.name,
        tier: p.tier,
        bridge: p.bridge,
        capabilities: p.capabilities,
        method: inv.type,
        actionUrl,
        copyText,
        limits: p.limits || [],
        note: p.note || null
      };
    });
}

export function catalogMeta() {
  return {
    version: DATA.version,
    updated: DATA.updated,
    tiers: DATA.tiers,
    count: DATA.platforms.length
  };
}
