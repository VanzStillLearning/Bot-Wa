import fs from "fs";
import { exec } from "child_process";
import path from "path";

const pluginConfig = {
  name: "ffhd",
  alias: ["hdvideo", "smoothhd", "enhancehd"],
  category: "tools",
  description: "Meningkatkan kualitas video ke HD kustom & 60-120 FPS super mulus di VPS",
  usage: ".ffhd [resolusi] [fps] (reply video)\nContoh: .ffhd 1080 60",
  example: ".ffhd 1080 60",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 20,
  energi: 3,
  isEnabled: true,
};

async function handler(m, { text, sock }) {
  let isVideoMessage = m.isVideo || (m.quoted && m.quoted.type === "videoMessage");
  let isDocumentMessage = (m.type === "documentMessage" && m.message?.documentMessage?.mimetype?.startsWith("video")) || (m.quoted && m.quoted.type === "documentMessage" && m.quoted.message?.documentMessage?.mimetype?.startsWith("video"));

  if (!isVideoMessage && !isDocumentMessage) {
    return m.reply(
      `✨ *ᴠɪᴅᴇᴏ ʜᴅ + ᴍᴜʟᴜs ᴇɴʜᴀɴᴄᴇʀ (ᴠᴘs ᴇᴘʏᴄ)*\n\n` +
        `> Ubah video jadi HD kustom & *60-120 FPS* super mulus dengan kecepatan server!\n\n` +
        `*Cara pakai:*\n` +
        `> Reply video lalu ketik: \`${m.prefix}ffhd [resolusi] [fps]\`\n` +
        `> *Contoh:* \`${m.prefix}ffhd 1080 60\` atau \`${m.prefix}ffhd 720 120\`\n\n` +
        `*Pilihan Resolusi Tinggi:* 480, 720, 1080, 1440\n` +
        `*Pilihan FPS:* 60 s.d. 120`
    );
  }

  // Mengambil argumen resolusi dan fps dari teks (misal: "1080 60")
  const args = text ? text.trim().split(" ") : [];
  let targetHeight = parseInt(args[0]) || 1080; // Default 1080p
  let targetFps = parseInt(args[1]) || 60;     // Default 60 fps

  // Validasi batas aman parameter
  if (![480, 720, 1080, 1440].includes(targetHeight)) targetHeight = 1080;
  if (targetFps < 30 || targetFps > 120) targetFps = 60;

  await m.react("🚀");

  try {
    const videoBuffer = (await m?.quoted?.download?.()) || (await m.download?.());

    if (!videoBuffer || videoBuffer.length === 0) {
      await m.react("❌");
      return m.reply(`❌ *GAGAL*\n\nVideonya gagal diunduh, coba kirim ulang ya!`);
    }

    await m.reply(
      `⚡ *ᴘʀᴏsᴇs ʀᴇɴᴅᴇʀ ᴠᴘs ᴅɪᴍᴜʟᴀɪ*\n\n` +
        `> Resolusi Target: *${targetHeight}p* HD 📺\n` +
        `> Target Frame Rate: *${targetFps} FPS* (Super Mulus) 🎞️\n` +
        `> Menggunakan CPU EPYC 64-Core (Super Kilat)... Tunggu sebentar! 🚀`
    );

    const sessionId = Date.now();
    const inputPath = path.join("/tmp", `input-${sessionId}.mp4`);
    const outputPath = path.join("/tmp", `output-${sessionId}.mp4`);

    fs.writeFileSync(inputPath, videoBuffer);

    // Cek apakah FFmpeg ada di folder lokal bin bot atau global sistem
    const ffmpegBin = fs.existsSync(path.join(process.cwd(), 'bin', 'ffmpeg')) 
      ? path.join(process.cwd(), 'bin', 'ffmpeg') 
      : 'ffmpeg';

    // Perintah FFmpeg yang dioptimalkan untuk VPS EPYC:
    // -threads 16: Memanfaatkan multi-core agar proses interpolasi frame jauh lebih cepat
    // -preset ultrafast: Mengurangi beban kompresi tanpa merusak kualitas visual HD
    const ffmpegCommand = `${ffmpegBin} -i ${inputPath} -threads 16 -vf "scale=-2:${targetHeight},unsharp=5:5:1.0,minterpolate=fps=${targetFps}:mi_mode=mci" -c:v libx264 -preset ultrafast -crf 22 -c:a copy -y ${outputPath}`;

    exec(ffmpegCommand, async (error) => {
      try {
        if (error) {
          console.error("FFmpeg Error:", error);
          await m.react("❌");
          await m.reply(`❌ Gagal merender video di VPS.`);
        } else {
          if (!fs.existsSync(outputPath)) {
            throw new Error("File output render tidak ditemukan.");
          }

          const resultBuffer = fs.readFileSync(outputPath);

          await sock.sendMedia(m.chat, resultBuffer, `✨ *ʀᴇɴᴅᴇʀ ᴠᴘs sᴇʟᴇsᴀɪ!*\n\n> 📺 Resolusi: *${targetHeight}p HD*\n> 🎞️ Frame Rate: *${targetFps} FPS (Super Mulus)*\n> ⚡ Diproses kilat oleh CPU AMD EPYC!`, m, {
            type: "video",
            mimetype: "video/mp4",
            fileName: `HD-${targetHeight}P-${targetFps}FPS-${sessionId}.mp4`,
          });
          
          await m.react("✅");
        }
      } catch (sendError) {
        console.error("Send Error:", sendError);
        await m.reply(`❌ Gagal mengirim hasil video.`);
      } finally {
        // Bersihkan file sementara
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }
    });

  } catch (err) {
    console.error(err);
    await m.react("❌");
    await m.reply(`❌ Terjadi kesalahan pada sistem VPS.`);
  }
}

export { pluginConfig as config, handler };