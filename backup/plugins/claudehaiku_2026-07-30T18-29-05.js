import { ClaudeHaiku } from "../../src/scraper/claudehaiku.js";
import { saluranCtx } from "../../src/lib/ourin-context.js";
import te from "../../src/lib/ourin-error.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import XLSX from "xlsx";

// ================== STORAGE ==================
const userData = new Map(); // sender -> { history: [], lastUsed }
const MAX_HISTORY = 10;
const EXPIRE_MS = 5 * 60 * 60 * 1000; // 5 jam

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

// ================== FILE READER ==================
async function extractFileContent(mime, buffer) {
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("sheet")) {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    return `Isi file Excel (${wb.SheetNames[0]}):\n${JSON.stringify(json, null, 2).slice(0, 3000)}`;
  }

  if (mime.includes("pdf")) {
    // butuh lib pdf-parse kalau mau ekstrak teks pdf
    return "File PDF terdeteksi, tapi belum ada parser PDF di sini.";
  }

  if (mime.includes("text") || mime.includes("csv")) {
    return `Isi file teks:\n${buffer.toString("utf-8").slice(0, 3000)}`;
  }

  return null;
}

// ================== CONFIG ==================
const pluginConfig = {
  name: "claudehaiku",
  alias: ["claude", "haiku", "chiku"],
  category: "ai",
  description: "Chat dengan Claude Haiku 4.5 via OverChat — support reply gambar/file",
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

// ================== HANDLER ==================
async function handler(m, { sock }) {
  const sender = m.sender;
  const sub = (m.args[0] || "").toLowerCase();

  // ---- subcommand ----
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

  // ====================================================
  // TITIK #1 — WAJIB DICEK: cara akses quoted message
  // Ganti bagian ini sesuai struktur library lu.
  // Contoh umum di Baileys: m.quoted.message?.imageMessage
  // ====================================================
  const quotedMsg = m.quoted?.message || m.message;
  const isImage = !!quotedMsg?.imageMessage;
  const isVideo = !!quotedMsg?.videoMessage;
  const isDocument = !!quotedMsg?.documentMessage;

  // help text kalau gak ada apa-apa sama sekali
  if (!text && !isImage && !isVideo && !isDocument) {
    return m.reply(
      `🤍 *Claude Haiku 4.5*\n\n` +
        `Tanya apa aja ke AI Claude — bisa juga baca file/gambar yang di-reply.\n\n` +
        `*PENGGUNAAN:*\n` +
        `> *${m.prefix}claudehaiku <pertanyaan>*\n` +
        `> Reply gambar/dokumen lalu ketik *${m.prefix}claudehaiku <pertanyaan>*\n` +
        `> *${m.prefix}claudehaiku newchat* — mulai chat baru\n` +
        `> *${m.prefix}claudehaiku delhistory* — hapus history\n\n` +
        `_History otomatis kehapus kalau 5 jam gak dipake_`
    );
  }

  await m.react("🕕");

  try {
    let extraContext = "";
    let imageBase64 = null;

    if (isVideo) {
      await m.react("☢");
      return m.reply("❌ Maaf, video belum didukung. Kirim gambar atau dokumen aja ya.");
    }

    if (isImage) {
      // ====================================================
      // TITIK #2 — WAJIB DICEK: cara download media
      // Ganti downloadMediaMessage sesuai helper yg ada
      // di project lu (cek src/lib/ mungkin udah ada
      // fungsi semacam downloadMedia() / getMedia())
      // ====================================================
      const targetMsg = m.quoted || m;
      const buffer = await downloadMediaMessage(targetMsg, "buffer", {});
      imageBase64 = buffer.toString("base64");
    }

    if (isDocument) {
      const targetMsg = m.quoted || m;
      const mime = quotedMsg.documentMessage?.mimetype || "";
      const buffer = await downloadMediaMessage(targetMsg, "buffer", {});
      const content = await extractFileContent(mime, buffer);

      if (!content) {
        await m.react("☢");
        return m.reply("❌ Tipe file ini belum didukung (baru support xlsx/csv/txt).");
      }
      extraContext = content + "\n\n";
    }

    const data = getUser(sender);
    const historyText = data.history
      .map((h) => `User: ${h.q}\nClaude: ${h.a}`)
      .join("\n");

    const finalPrompt = `${historyText ? historyText + "\n" : ""}${extraContext}User: ${
      text || "Tolong jelaskan/analisa ini"
    }`;

    // Kalau ClaudeHaiku belum support param image, hapus argumen ke-2 ini
    const result = imageBase64
      ? await ClaudeHaiku(finalPrompt, { image: imageBase64 })
      : await ClaudeHaiku(finalPrompt);

    if (!result.status) {
      await m.react("☢");
      return m.reply(
        `❌ *Claude Haiku Gagal*\n\n> ${result.error || "Gagal mendapatkan respons"}`
      );
    }

    await m.react("✅");

    data.history.push({ q: text || "[file/gambar]", a: result.answer });
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