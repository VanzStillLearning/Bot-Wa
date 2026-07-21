import fs from "fs";
import { exec } from "child_process";
import path from "path";

const pluginConfig = {
  name: "ffhd",
  alias: ["lokalhd", "lokalsmooth", "ffsmooth"],
  category: "tools",
  description: "Meningkatkan kualitas video (HD) & 60fps menggunakan server lokal (FFmpeg)",
  usage: ".ffhd (reply video)",
  example: ".ffhd",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 60, // Cooldown bisa lebih rendah karena proses lokal cepat
  energi: 3,
  isEnabled: true,
};

async function handler(m, { sock }) {
  let isVideoMessage = m.isVideo || (m.quoted && m.quoted.type === "videoMessage");
  let isDocumentMessage = (m.type === "documentMessage" && m.message?.documentMessage?.mimetype?.startsWith("video")) || (m.quoted && m.quoted.type === "documentMessage" && m.quoted.message?.documentMessage?.mimetype?.startsWith("video"));

  if (!isVideoMessage && !isDocumentMessage) {
    return m.reply(
      `⚡ *ʟᴏᴋᴀʟ ᴠɪᴅᴇᴏ ᴇɴʜᴀɴᴄᴇʀ (ꜰꜰᴍᴘᴇɢ)*\n\n` +
        `> Render video jadi *HD 1080p* & *60FPS* langsung dari server sendiri!\n\n` +
        `*Cara pakai:*\n` +
        `> Kirim/reply video lalu caption \`${m.prefix}ffhd\``
    );
  }

  await m.react("🕕");

  try {
    const videoBuffer = (await m?.quoted?.download?.()) || (await m.download?.());

    if (!videoBuffer || videoBuffer.length === 0) {
      await m.react("❌");
      return m.reply(`❌ *GAGAL*\n\nVideonya gagal diunduh, coba kirim ulang ya!`);
    }

    // Batasi input ukuran video (karena minterpolate butuh resource CPU tinggi)
    if (videoBuffer.length > 30 * 1024 * 1024) {
      await m.react("❌");
      return m.reply(`❌ *FILE TERLALU BESAR*\n\nMaksimal ukuran video *30MB* untuk menghindari overload server.`);
    }

    await m.reply(
      `🚀 *ᴘʀᴏsᴇs ʀᴇɴᴅᴇʀɪɴɢ ʟᴏᴋᴀʟ ᴅɪᴍᴜʟᴀɪ*\n\n` +
        `> CPU EPYC sedang bekerja merender ke *1080p HD* & interpolasi *60 FPS*...\n` +
        `> Mohon tunggu sebentar! ⏳`
    );

    // Penamaan file sementara di direktori /tmp/ Linux
    const sessionId = Date.now();
    const inputPath = `/tmp/input-${sessionId}.mp4`;
    const outputPath = `/tmp/output-${sessionId}.mp4`;

    // Tulis buffer ke file sementara
    fs.writeFileSync(inputPath, videoBuffer);

    // Command FFmpeg:
    // 1. scale='min(1080,iw)':-2 -> Upscale ke 1080p (tapi menjaga aspect ratio agar tidak gepeng)
    // 2. unsharp=5:5:1.0 -> Memberikan efek tajam (Sharpening)
    // 3. minterpolate=fps=60:mi_mode=mci -> Menambahkan frame baru dengan Motion Compensated Interpolation (mulus)
    // 4. preset fast / crf 20 -> Keseimbangan antara kecepatan render dan kualitas
    const ffmpegCommand = `ffmpeg -i ${inputPath} -vf "scale='min(1080,iw)':-2,unsharp=5:5:1.0,minterpolate=fps=60:mi_mode=mci" -c:v libx264 -preset fast -crf 20 -c:a copy -y -loglevel error ${outputPath}`;

    exec(ffmpegCommand, async (error) => {
      try {
        if (error) {
          console.error("FFmpeg Error:", error);
          await m.react("❌");
          await m.reply(`❌ Gagal merender video. Pastikan FFmpeg terinstal di server.`);
        } else {
          // Baca hasil render
          const resultBuffer = fs.readFileSync(outputPath);

          await sock.sendMedia(m.chat, resultBuffer, `✨ *ʀᴇɴᴅᴇʀ ʟᴏᴋᴀʟ sᴇʟᴇsᴀɪ!*\n\n> Video sudah dipompa ke *HD* & gerakan *Super Mulus (60fps)* ⚡`, m, {
            type: "video",
            mimetype: "video/mp4",
            fileName: `LOKAL-HD-${sessionId}.mp4`,
          });
          
          await m.react("✅");
        }
      } catch (sendError) {
        console.error("Send Error:", sendError);
        await m.reply(`❌ Gagal mengirim hasil video.`);
      } finally {
        // Hapus file sampah (Penting agar memori VPS tidak penuh)
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }
    });

  } catch (err) {
    console.error(err);
    await m.react("❌");
    await m.reply(`❌ Terjadi kesalahan pada sistem.`);
  }
}

export { pluginConfig as config, handler };