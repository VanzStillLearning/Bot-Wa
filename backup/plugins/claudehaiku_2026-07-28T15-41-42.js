import { ClaudeHaiku } from "../../src/scraper/claudehaiku.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import te from "../../src/lib/ourin-error.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys"; // sesuaikan sama lib bot lu
import XLSX from "xlsx";

const userData = new Map();
const MAX_HISTORY = 10;
const EXPIRE_MS = 5 * 60 * 60 * 1000;

function getUser(sender) {
  let data = userData.get(sender);
  const now = Date.now();
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

async function extractFileContent(msg) {
  const mime = msg.message?.documentMessage?.mimetype || "";
  const buffer = await downloadMediaMessage(msg, "buffer", {});

  if (mime.includes("spreadsheet") || mime.includes("excel")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    return `Isi file Excel:\n${JSON.stringify(json, null, 2).slice(0, 3000)}`;
  }

  return null; // tipe lain belum di-handle
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

  if (sub === "newchat" || sub === "new") {
    const data = getUser(sender);
    data.history = [];
    data.lastUsed = Date.now();
    return m.reply("🆕 Chat baru dimulai.");
  }
  if (sub === "delhistory" || sub === "clear") {
    userData.delete(sender);
    return m.reply("🗑️ History dihapus.");
  }

  let text = m.args.join(" ");
  const quoted = m.quoted || m; // pesan yang di-reply atau pesan itu sendiri

  await m.react("🕕");

  try {
    let extraContext = "";
    let imageBase64 = null;

    // cek gambar
    if (quoted.message?.imageMessage) {
      const buffer = await downloadMediaMessage(quoted, "buffer", {});
      imageBase64 = buffer.toString("base64");
    }
    // cek video
    else if (quoted.message?.videoMessage) {
      await m.react("☢");
      return m.reply("❌ Maaf, video belum didukung. Kirim gambar atau dokumen aja ya.");
    }
    // cek dokumen
    else if (quoted.message?.documentMessage) {
      const content = await extractFileContent(quoted);
      if (content) extraContext = content + "\n\n";
      else {
        await m.react("☢");
        return m.reply("❌ Tipe file ini belum didukung.");
      }
    }

    if (!text && !imageBase64 && !extraContext) {
      return m.reply(
        `🤍 *Claude Haiku 4.5*\n\n` +
          `> *${m.prefix}claudehaiku <pertanyaan>*\n` +
          `> Reply gambar/dokumen + *${m.prefix}claudehaiku <pertanyaan>*\n` +
          `> *${m.prefix}claudehaiku newchat*\n` +
          `> *${m.prefix}claudehaiku delhistory*`
      );
    }

    const data = getUser(sender);
    const historyText = data.history
      .map((h) => `User: ${h.q}\nClaude: ${h.a}`)
      .join("\n");

    const finalPrompt = `${historyText ? historyText + "\n" : ""}${extraContext}User: ${text || "Tolong analisa ini"}`;

    // kalau ClaudeHaiku support image, kirim base64 juga
    const result = imageBase64
      ? await ClaudeHaiku(finalPrompt, { image: imageBase64 })
      : await ClaudeHaiku(finalPrompt);

    if (!result.status) {
      await m.react("☢");
      return m.reply(`❌ *Gagal*\n\n> ${result.error || "Gagal mendapatkan respons"}`);
    }

    await m.react("✅");
    data.history.push({ q: text, a: result.answer });
    if (data.history.length > MAX_HISTORY) data.history.shift();
    data.lastUsed = Date.now();

    const reply = result.answer;
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