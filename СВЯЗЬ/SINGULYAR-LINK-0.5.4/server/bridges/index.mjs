import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { telegramBridge } from "./telegram.mjs";
import { webhookBridge } from "./webhook.mjs";
import { whatsappCallBridge } from "./whatsapp-call.mjs";
import { teamsBridge } from "./teams.mjs";
import { viberAudioBridge } from "./viber-audio.mjs";
import { discordBridge } from "./discord.mjs";
import { slackBridge } from "./slack.mjs";
import { lineBridge } from "./line.mjs";
import { googleChatBridge } from "./googlechat.mjs";
import { mattermostBridge } from "./mattermost.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FACTORIES = {
  telegram: telegramBridge,
  webhook: webhookBridge,
  "whatsapp-call": whatsappCallBridge,
  teams: teamsBridge,
  "viber-audio": viberAudioBridge,
  discord: discordBridge,
  slack: slackBridge,
  line: lineBridge,
  googlechat: googleChatBridge,
  mattermost: mattermostBridge,
  // aliases
  rocketchat: mattermostBridge,
  "google-chat": googleChatBridge
};

export async function loadBridges({ env, hub, config }) {
  let list = config;
  if (!list) {
    const file = env.BRIDGES_FILE || path.join(HERE, "../../bridges.json");
    if (!fs.existsSync(file)) return [];
    list = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return list.map(cfg => {
    const f = FACTORIES[cfg.type];
    if (!f) throw new Error(`Неизвестный мост: ${cfg.type}`);
    return f(cfg, hub);
  });
}

export function knownBridgeTypes() {
  return Object.keys(FACTORIES);
}
