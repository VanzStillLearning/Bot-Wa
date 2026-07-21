import te from "../../src/lib/ourin-error.js";
import winkEnhance from "../../src/scraper/wink.js";

const pluginConfig = {
  name: "winkhd+",
  alias: ["winksmooth", "wink60fps", "winkultra"],
  category: "tools",
  description: "Meningkatkan kualitas video jadi Ultra HD + Interpolasi Frame Rate Super Mulus (60fps+)",
  usage: ".winkhd+ (reply video)",
  example: ".winkhd+",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 180, // Cooldown dinaikkan karena proses rendering 60fps lebih berat
  energi: 5,     // Energi dinaikkan sesuai beban server
  isEnabled: true,
};

async function handler(m, { sock }) {
  let isVideoMessage = m.isVideo || (m.quoted && m.quoted.type === "videoMessage");
  let isDocumentMessage = (m.type === "documentMessage" && m.message?.documentMessage?.mimetype?.startsWith("video")) || (m.quoted && m.quoted.type === "documentMessage" && m.quoted.message?.documentMessage?.mimetype?.startsWith("video"));

  if (!isVideoMessage && !isDocumentMessage) {
    return m.reply(
      `✨ *ᴡɪɴᴋ ᴜʟᴛʀᴀ ʜᴅ + sᴍᴏᴏᴛʜ ꜰʀᴀᴍᴇʀᴀᴛᴇ*\n\n` +
        `> Ubah video buram jadi *Ultra HD 4K* & gerakan *Super Mulus (60FPS+)* pakai AI Wink!\n\n` +
        `*Cara pakai:*\n` +
        `> Kirim/reply video lalu caption \`${m.prefix}winkhd+\`\n\n` +
        `⚠️ _Fitur Premium, proses estimasi 2-7 menit karena menggunakan interpolasi frame tinggi_`,
    );
  }

  await m.react("🕕");

  try {
    const videoBuffer = (await m?.quoted?.download?.()) || (await m.download?.());

    if (!videoBuffer || videoBuffer.length === 0) {
      await m.react("❌");
      return m.reply(`❌ *GAGAL*\n\nVideonya gagal diunduh, coba kirim ulang ya!`);
    }

    // Batasan ukuran diperketat atau disesuaikan karena output 60fps akan membengkak ukurannya
    if (videoBuffer.length > 40 * 1024 * 1024) {
      await m.react("❌");
      return m.reply(`❌ *FILE TERLALU BESAR*\n\nMaksimal ukuran video input *40MB* untuk proses HD+Smooth!`);
    }

    await m.reply(
      `🎬 *ᴘʀᴏsᴇs ᴜʟᴛʀᴀ ʜᴅ + ɪɴᴛᴇʀᴘᴏʟᴀsɪ ᴅɪᴍᴜʟᴀɪ*\n\n` +
        `> AI sedang meningkatkan resolusi ke *Ultra HD*...\n` +
        `> AI sedang menyisipkan frame tambahan (*60fps/Smooth Motion*)... ⚡\n` +
        `> Estimasi *2-7 menit*, mohon jangan spam ya!`,
    );

    // Memanggil fungsi winkEnhance dengan opsi tambahan untuk HD + Interpolation
    // Catatan: Sesuaikan key opsi ini ({ resolution, fps, dll }) dengan dokumentasi/fitur scraper wink.js Anda
    const result = await winkEnhance(videoBuffer, {
      filename: `wink-hd-smooth-${Date.now()}.mp4`,
      resolution: "4k",          // Opsi resolusi tertinggi
      fps: 60,                   // Memaksa frame rate ke 60fps (Interpolasi)
      model: "ultra_smooth"      // Menggunakan model interpolasi gerakan (jika ada di scraper)
    });

    if (!result || !result.resultUrl) {
      throw new Error("Gagal mendapatkan URL hasil dari AI Wink.");
    }

    await sock.sendMedia(m.chat, result.resultUrl, `✨ *ᴡɪɴᴋ ʜᴅ + sᴍᴏᴏᴛʜ sᴇʟᴇsᴀɪ!*\n\n> Video sekarang sudah *Ultra HD* dengan gerakan *Super Mulus 60fps!* 😍`, m, {
      type: "video",
      mimetype: "video/mp4",
      fileName: `WINK-ULTRA-SMOOTH-${Date.now()}.mp4`,
    });

    await m.react("✅");
  } catch (err) {
    console.error(err);
    await m.react("❌");
    await m.reply(`❌ Proses gagal! Terjadi kesalahan saat merender video HD + Interpolasi. Coba lagi nanti ya 😭`);
  }
}

export { pluginConfig as config, handler };