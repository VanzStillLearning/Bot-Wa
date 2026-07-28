import { ClaudeHaiku } from "../../src/scraper/claudehaiku.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import te from "../../src/lib/ourin-error.js";

// nomor yang boleh pake (format: 628xxx@s.whatsapp.net)
const ALLOWED_NUMBERS = [
  "62895385533890@s.whatsapp.net",
];

// history chat per user, in-memory
const chatHistory = new Map();
const MAX_HISTORY = 10; // simpan 10 pesan terakhir per user

const pluginConfig = {
  name: "claudehaiku",
  alias: ["claude", "haiku", "chiku"],
  category: "ai",
  description: "Chat dengan Claude Haiku 4.5 via OverChat",
  usage: ".claudehaiku <pertanyaan>",
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
  const sender = m.sender; // pastikan field ini sesuai lib kamu

  if (!ALLOWED_NUMBERS.includes(sender)) {
    return m.reply("🚫 Fitur ini cuma buat nomor tertentu.");
  }

  const text = m.args.join(" ");
  if (!text) {
    return m.reply(
      `🤍 *Claude Haiku 4.5*\n\n` +
        `Tanya apa aja ke AI Claude Haiku — cepat dan ringan, cocok buat pertanyaan sehari-hari.\n\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}claudehaiku <pertanyaan>*\n\n` +
        `*CONTOH:*\n` +
        `> *${m.prefix}claudehaiku Jelaskan teori relativitas*\n` +
        `> *${m.prefix}claudehaiku Tips biar produktif*\n\n` +
        `_Respons cepat, tapi tetap cerdas_`
    );
  }

  await m.react("🕕");

  try {
    // ambil history user, susun jadi context
    const history = chatHistory.get(sender) || [];
    const contextText = history
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

    // simpan history
    history.push({ q: text, a: result.answer });
    if (history.length > MAX_HISTORY) history.shift();
    chatHistory.set(sender, history);

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