import { ClaudeHaiku } from "../../src/scraper/claudehaiku.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import te from "../../src/lib/ourin-error.js";

// data per user: { history: [], lastUsed: timestamp }
const userData = new Map();
const MAX_HISTORY = 10;
const EXPIRE_MS = 5 * 60 * 60 * 1000; // 5 jam

function getUser(sender) {
  let data = userData.get(sender);
  const now = Date.now();

  // auto clear kalau udah lebih dari 5 jam gak aktif
  if (data && now - data.lastUsed > EXPIRE_MS) {
    userData.delete(sender);
    data = null;
  }

  if (!data) {
    data = { history: [], lastUsed: now };
    userData.set(sender, data);
  }
  return data;
}

const pluginConfig = {
  name: "claudehaiku",
  alias: ["claude", "haiku", "chiku"],
  category: "ai",
  description: "Chat dengan Claude Haiku 4.5 via OverChat",
  usage: ".claudehaiku <pertanyaan> | newchat | delhistory",
  example: ".claudehaiku Jelaskan teori relativitas",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const sender = m.sender;
  const sub = (m.args[0] || "").toLowerCase();

  // subcommand: reset chat / hapus history
  if (sub === "newchat" || sub === "new") {
    const data = getUser(sender);
    data.history = [];
    data.lastUsed = Date.now();
    return m.reply("🆕 Chat baru dimulai, history sebelumnya direset.");
  }

  if (sub === "delhistory" || sub === "delhis" || sub === "clear") {
    userData.delete(sender);
    return m.reply("🗑️ History kamu udah dihapus total.");
  }

  const text = m.args.join(" ");
  if (!text) {
    return m.reply(
      `🤍 *Claude Haiku 4.5*\n\n` +
        `Tanya apa aja ke AI Claude Haiku — cepat dan ringan.\n\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}claudehaiku <pertanyaan>*\n` +
        `> *${m.prefix}claudehaiku newchat* — mulai chat baru\n` +
        `> *${m.prefix}claudehaiku delhistory* — hapus semua history\n\n` +
        `_History otomatis kehapus kalau 5 jam gak dipake_`
    );
  }

  await m.react("🕕");

  try {
    const data = getUser(sender);

    const contextText = data.history
      .map((h) => `User: ${h.q}\nClaude: ${h.a}`)
      .join("\n");
    const finalPrompt = contextText ? `${contextText}\nUser: ${text}` : text;

    const result = await ClaudeHaiku(finalPrompt);

    if (!result.status) {
      await m.react("☢");
      return m.reply(
        `❌ *Claude Haiku Gagal*\n\n> ${result.error || "Gagal mendapatkan respons"}`
      );
    }

    await m.react("✅");

    data.history.push({ q: text, a: result.answer });
    if (data.history.length > MAX_HISTORY) data.history.shift();
    data.lastUsed = Date.now();

    const reply = `${result.answer}`;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply, {
      contextInfo: saluranCtx(),
    });
  } catch (e) {
    console.error(e);
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };